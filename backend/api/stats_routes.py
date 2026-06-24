"""
Statistics API Routes

Provides REST endpoints for statistics and metrics:
- Author contributions
- Modification hotspots
- Bus factor analysis
- Knowledge distribution (with SSE progress)
- Collaboration patterns
"""
import asyncio
import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.dependencies import get_git_service, get_stats_service
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


@router.get("/knowledge-distribution/stream")
async def get_knowledge_distribution_stream(
    directory: str = "",
    repo_path: str = Query(default=""),
):
    """Stream knowledge distribution computation with progress updates via SSE."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")

    git_svc = get_git_service(path)
    stats_svc = get_stats_service(path)

    async def generate():
        from collections import defaultdict

        tree = git_svc.get_file_tree(directory)
        code_files = [e for e in tree if e["type"] == "file" and stats_svc._is_code_file(e["name"])]
        total = len(code_files)

        if total == 0:
            yield f"data: {json.dumps({'type': 'complete', 'distribution': []})}\n\n"
            return

        author_ownership: dict[str, dict] = defaultdict(lambda: {"files": 0, "lines": 0})
        processed = 0

        for entry in code_files:
            try:
                contributions = stats_svc.get_author_contributions(entry["path"])
                for contrib in contributions:
                    author_ownership[contrib.author_name]["files"] += 1
                    author_ownership[contrib.author_name]["lines"] += contrib.lines_owned
            except Exception:
                pass

            processed += 1
            # Send progress every 5 files or at end
            if processed % 5 == 0 or processed == total:
                progress_data = {
                    "type": "progress",
                    "processed": processed,
                    "total": total,
                    "percent": round(processed / total * 100),
                }
                yield f"data: {json.dumps(progress_data)}\n\n"
                await asyncio.sleep(0)  # Yield control to event loop

        # Final result
        result = []
        for author, data in sorted(author_ownership.items(), key=lambda x: x[1]["lines"], reverse=True):
            result.append({
                "author_name": author,
                "files_owned": data["files"],
                "lines_owned": data["lines"],
            })

        yield f"data: {json.dumps({'type': 'complete', 'distribution': result})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


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

