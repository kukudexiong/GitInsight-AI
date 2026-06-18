"""
AI Analysis API Routes

Provides REST endpoints for AI-powered analysis:
- Commit summarization
- Function evolution tracking
- Related change discovery
- Impact analysis
- Review suggestions
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from api.dependencies import get_ai_service
from api.state import app_state

router = APIRouter()


class FunctionEvolutionRequest(BaseModel):
    file_path: str
    function_name: str
    max_commits: int = 10


class ChatRequest(BaseModel):
    file_path: str
    question: str
    history: list = []


@router.get("/status")
async def ai_status():
    """Check if AI service is configured and available."""
    repo_path = app_state.current_repo_path
    if not repo_path:
        return {"available": False, "reason": "No repository configured"}
    svc = get_ai_service(repo_path)
    return {"available": svc.is_available(), "model": svc.model}


@router.get("/summarize/{sha}")
async def summarize_commit(
    sha: str,
    file_path: str = Query(default=None),
    repo_path: str = Query(default=""),
):
    """Get AI summary of a commit."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.summarize_commit(sha, file_path)
    return result


@router.post("/function-evolution")
async def function_evolution(
    request: FunctionEvolutionRequest,
    repo_path: str = Query(default=""),
):
    """Track how a function has evolved over time."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.analyze_function_evolution(
        request.file_path, request.function_name, request.max_commits
    )
    return result


@router.get("/related/{sha}")
async def find_related_changes(
    sha: str,
    file_path: str = Query(default=""),
    repo_path: str = Query(default=""),
):
    """Find changes related to a specific commit."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.find_related_changes(file_path, sha)
    return result


@router.get("/impact/{sha}")
async def analyze_impact(
    sha: str,
    file_path: str,
    repo_path: str = Query(default=""),
):
    """Analyze the potential impact of a change."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.analyze_impact(file_path, sha)
    return result


@router.get("/review/{sha}")
async def review_suggestions(
    sha: str,
    file_path: str,
    repo_path: str = Query(default=""),
):
    """Get AI code review suggestions for a commit."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.generate_review_suggestions(file_path, sha)
    return result


@router.post("/chat")
async def chat_about_file(
    request: ChatRequest,
    repo_path: str = Query(default=""),
):
    """Free-form Q&A about a file."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")
    svc = get_ai_service(path)
    result = await svc.chat_about_file(request.file_path, request.question, request.history)
    return result
