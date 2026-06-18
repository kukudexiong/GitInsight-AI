"""
Settings API Routes

Provides endpoints for runtime configuration:
- OpenAI API Key management
- File search across repository
"""
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import get_git_service
from api.state import app_state

router = APIRouter()


class AIConfig(BaseModel):
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"


@router.get("/ai-config")
async def get_ai_config():
    """Get current AI configuration (key masked)."""
    key = os.getenv("OPENAI_API_KEY", "")
    return {
        "configured": bool(key),
        "api_key_masked": f"{key[:8]}...{key[-4:]}" if len(key) > 12 else ("****" if key else ""),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
        "model": os.getenv("OPENAI_MODEL", "deepseek-chat"),
    }


@router.post("/ai-config")
async def set_ai_config(config: AIConfig):
    """Update AI configuration at runtime."""
    os.environ["OPENAI_API_KEY"] = config.api_key
    os.environ["OPENAI_BASE_URL"] = config.base_url
    os.environ["OPENAI_MODEL"] = config.model

    # Clear the cached AI service so it picks up new config
    from api.dependencies import get_git_service
    # The AI service is created fresh each call, so just setting env is enough

    return {"status": "ok", "configured": True}


@router.get("/search-files")
async def search_files(
    query: str = Query(..., min_length=1),
    max_results: int = Query(default=20, le=50),
):
    """Search for files by name (fuzzy match) in the repository."""
    repo_path = app_state.current_repo_path
    if not repo_path:
        raise HTTPException(status_code=400, detail="No repository configured")

    svc = get_git_service(repo_path)
    # Get all files from the HEAD tree recursively
    results = _search_tree(svc, query.lower(), max_results)
    return {"query": query, "results": results}


def _search_tree(svc, query: str, max_results: int) -> list[dict]:
    """Recursively search the git tree for files matching the query."""
    import git

    try:
        tree = svc.repo.head.commit.tree
    except Exception:
        return []

    matches = []
    query_parts = query.split()

    def walk(tree_obj, prefix=""):
        if len(matches) >= max_results:
            return
        for item in tree_obj:
            if len(matches) >= max_results:
                return
            path = f"{prefix}/{item.name}" if prefix else item.name
            if item.type == 'tree':
                walk(item, path)
            elif item.type == 'blob':
                # Fuzzy match: all query parts must appear in the path
                path_lower = path.lower()
                if all(part in path_lower for part in query_parts):
                    matches.append({
                        "name": item.name,
                        "path": path,
                        "size": item.size,
                    })

    walk(tree)
    return matches
