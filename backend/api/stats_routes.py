"""
Statistics API Routes

Provides REST endpoints for statistics and metrics:
- Author contributions
- Modification hotspots
- Bus factor analysis
- Knowledge distribution
- Collaboration patterns
"""
from fastapi import APIRouter, HTTPException, Query

from api.dependencies import get_stats_service
from api.state import app_state

router = APIRouter()


@router.get("/contributions")
async def get_author_contributions(
    file_path: str,
    repo_path: str = Query(default=""),
):
    """Get author contribution breakdown for a file."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_stats_service(path)
    contributions = svc.get_author_contributions(file_path)
    return {
        "file_path": file_path,
        "contributions": [c.__dict__ for c in contributions],
    }


@router.get("/hotspots")
async def get_hotspots(
    file_path: str,
    max_commits: int = Query(default=30, le=100),
    repo_path: str = Query(default=""),
):
    """Get modification frequency hotspots for a file."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_stats_service(path)
    hotspots = svc.get_modification_hotspots(file_path, max_commits)
    return {
        "file_path": file_path,
        "hotspots": [h.__dict__ for h in hotspots],
    }


@router.get("/bus-factor")
async def get_bus_factor(
    file_path: str,
    repo_path: str = Query(default=""),
):
    """Get bus factor analysis for a file."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_stats_service(path)
    result = svc.get_bus_factor(file_path)
    return result.__dict__


@router.get("/knowledge-distribution")
async def get_knowledge_distribution(
    directory: str = "",
    repo_path: str = Query(default=""),
):
    """Get knowledge distribution across a directory."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_stats_service(path)
    result = svc.get_knowledge_distribution(directory)
    return {"directory": directory, "distribution": result}


@router.get("/collaboration")
async def get_collaboration_patterns(
    file_path: str,
    max_commits: int = Query(default=50, le=200),
    repo_path: str = Query(default=""),
):
    """Get collaboration patterns for a file."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_stats_service(path)
    patterns = svc.get_collaboration_patterns(file_path, max_commits)
    return {"file_path": file_path, "patterns": patterns}

