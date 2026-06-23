"""
Git Data API Routes

Provides REST endpoints for git data:
- File tree browsing
- File commit history (timeline)
- Blame information
- Diff between commits
- Commit details
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import get_git_service
from api.state import app_state
from services.git_watcher import git_watcher

router = APIRouter()


class RepoConfig(BaseModel):
    """Request body for setting the repository path."""
    repo_path: str


@router.post("/repo")
async def set_repo(config: RepoConfig):
    """Set the repository path to analyze."""
    import asyncio
    try:
        # Validate by creating service
        get_git_service(config.repo_path)
        app_state.current_repo_path = config.repo_path
        # Start watching for git changes
        loop = asyncio.get_event_loop()
        git_watcher.start_watching(config.repo_path, loop)
        return {"status": "ok", "repo_path": config.repo_path}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/repo")
async def get_repo():
    """Get the current repository path."""
    return {"repo_path": app_state.current_repo_path or ""}


@router.get("/tree")
async def get_file_tree(
    path: str = "",
    ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get directory tree at the specified path."""
    svc = _get_service(repo_path)
    entries = svc.get_file_tree(path, ref)
    return {"path": path, "ref": ref, "entries": entries}


@router.get("/history")
async def get_file_history(
    file_path: str,
    max_count: int = Query(default=50, le=200),
    ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get commit history for a specific file."""
    svc = _get_service(repo_path)
    commits = svc.get_file_history(file_path, max_count, ref)
    return {
        "file_path": file_path,
        "total": len(commits),
        "commits": [c.__dict__ for c in commits],
    }


@router.get("/blame")
async def get_file_blame(
    file_path: str,
    ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get blame information for a file."""
    svc = _get_service(repo_path)
    entries = svc.get_file_blame(file_path, ref)
    return {
        "file_path": file_path,
        "ref": ref,
        "entries": [e.__dict__ for e in entries],
    }


@router.get("/diff")
async def get_diff(
    file_path: str,
    old_ref: str,
    new_ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get diff for a file between two refs."""
    svc = _get_service(repo_path)
    diff = svc.get_diff(file_path, old_ref, new_ref)
    if not diff:
        return {"file_path": file_path, "diff": None, "message": "No diff found"}
    return {"file_path": file_path, "diff": diff.__dict__}


@router.get("/commit/{sha}")
async def get_commit_detail(
    sha: str,
    repo_path: str = Query(default=""),
):
    """Get detailed information about a specific commit."""
    svc = _get_service(repo_path)
    detail = svc.get_commit_detail(sha)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Commit {sha} not found")
    return detail


@router.get("/file-content")
async def get_file_content(
    file_path: str,
    ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get file content at a specific ref."""
    svc = _get_service(repo_path)
    content = svc.get_file_content(file_path, ref)
    if content is None:
        raise HTTPException(status_code=404, detail=f"File {file_path} not found at {ref}")
    return {"file_path": file_path, "ref": ref, "content": content}


@router.get("/branches")
async def get_branches(repo_path: str = Query(default="")):
    """Get all branch names."""
    svc = _get_service(repo_path)
    branches = svc.get_branches()
    return {"branches": branches}


@router.get("/recent")
async def get_recent_commits(
    max_count: int = Query(default=20, le=100),
    ref: str = "HEAD",
    repo_path: str = Query(default=""),
):
    """Get recent commits across the whole repo."""
    svc = _get_service(repo_path)
    commits = svc.get_recent_commits(max_count, ref)
    return {"commits": [c.__dict__ for c in commits]}


def _get_service(repo_path: str = ""):
    """Get git service, using provided path or global state."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(
            status_code=400,
            detail="No repository path configured. POST to /api/git/repo first."
        )
    return get_git_service(path)
