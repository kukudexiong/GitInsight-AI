"""
GitInsight AI - Backend Entry Point
"""
import asyncio
import logging
import os
import traceback
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.ai_routes import router as ai_router
from api.dashboard_routes import router as dashboard_router
from api.git_routes import router as git_router
from api.settings_routes import router as settings_router
from api.state import app_state
from api.stats_routes import router as stats_router
from services.git_watcher import git_watcher

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("gitinsight")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    logger.info("GitInsight AI backend started.")
    yield
    git_watcher.stop_watching()
    logger.info("GitInsight AI backend stopped.")


app = FastAPI(
    title="GitInsight AI",
    description="AI-Enhanced Git History Visualization & Analysis",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(git_router, prefix="/api/git", tags=["Git Data"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Analysis"])
app.include_router(stats_router, prefix="/api/stats", tags=["Statistics"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return a consistent JSON error response."""
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
    )
    logger.debug(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") else "服务器内部错误，请稍后重试",
        },
    )


@app.get("/")
async def root():
    return {"message": "GitInsight AI API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/git-watch")
async def websocket_git_watch(websocket: WebSocket, repo_path: str = ""):
    """WebSocket endpoint for real-time git change notifications."""
    watch_path = repo_path or app_state.current_repo_path or ""
    if watch_path:
        loop = asyncio.get_event_loop()
        git_watcher.start_watching(watch_path, loop)
    await websocket.accept()
    queue = git_watcher.subscribe(watch_path)
    try:
        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30)
            except TimeoutError:
                # Send ping to keep connection alive and check client
                try:
                    await websocket.send_text('{"type":"ping"}')
                except Exception:
                    break
                continue
            if message is None:
                # Sentinel received, server is shutting down
                break
            await websocket.send_text(message)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        git_watcher.unsubscribe(queue, watch_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
