"""
Settings API Routes

Provides endpoints for runtime configuration:
- OpenAI API Key management
- File search across repository
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import get_git_service
from api.state import app_state
from services.ai_config import load_ai_config, mask_api_key, save_ai_config

router = APIRouter()
_file_index_cache: dict[tuple[str, str], list[dict]] = {}
_FILE_INDEX_CACHE_MAX_SIZE = 10


class AIConfig(BaseModel):
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"


@router.get("/ai-config")
async def get_ai_config():
    """Get current AI configuration (key masked)."""
    config = load_ai_config()
    key = config["api_key"]
    return {
        "configured": bool(key),
        "api_key_masked": mask_api_key(key),
        "base_url": config["base_url"],
        "model": config["model"],
    }


@router.post("/ai-config")
async def set_ai_config(config: AIConfig):
    """Update AI configuration at runtime."""
    save_ai_config(config.api_key, config.base_url, config.model)
    return {"status": "ok", "configured": True}


@router.get("/search-files")
async def search_files(
    query: str = Query(..., min_length=1),
    max_results: int = Query(default=20, le=50),
    repo_path: str = Query(default=""),
):
    """Search for files by name (fuzzy match) in the repository."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")

    svc = get_git_service(path)
    results = _search_tree(svc, path, query.lower(), max_results)
    return {"query": query, "results": results}


def _search_tree(svc, repo_path: str, query: str, max_results: int) -> list[dict]:
    """Recursively search the git tree for files matching the query."""
    files = _get_file_index(svc, repo_path)
    query_parts = query.split()
    matches = []
    for item in files:
        path_lower = item["path"].lower()
        if all(part in path_lower for part in query_parts):
            matches.append(item)
            if len(matches) >= max_results:
                break
    return matches


def _get_file_index(svc, repo_path: str) -> list[dict]:
    """Return all files at HEAD, cached by repository path and HEAD SHA."""
    try:
        head_sha = svc.repo.head.commit.hexsha
    except Exception:
        return []

    cache_key = (repo_path, head_sha)
    if cache_key in _file_index_cache:
        return _file_index_cache[cache_key]

    # Evict old entries if cache is full
    if len(_file_index_cache) >= _FILE_INDEX_CACHE_MAX_SIZE:
        _file_index_cache.clear()

    files = []

    def walk(tree_obj, prefix=""):
        for item in tree_obj:
            path = f"{prefix}/{item.name}" if prefix else item.name
            if item.type == 'tree':
                walk(item, path)
            elif item.type == 'blob':
                files.append({
                    "name": item.name,
                    "path": path,
                    "size": item.size,
                })

    try:
        walk(svc.repo.head.commit.tree)
    except Exception:
        return []

    _file_index_cache[cache_key] = files
    return files
