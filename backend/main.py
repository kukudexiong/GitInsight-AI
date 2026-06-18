"""
GitInsight AI - Backend Entry Point
"""
import asyncio
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api.git_routes import router as git_router
from api.ai_routes import router as ai_router
from api.stats_routes import router as stats_router
from api.settings_routes import router as settings_router
from api.dashboard_routes import router as dashboard_router
from services.git_watcher import git_watcher

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("GitInsight AI backend started.")
    yield
    git_watcher.stop_watching()
    print("GitInsight AI backend stopped.")


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


@app.get("/")
async def root():
    return {"message": "GitInsight AI API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/git-watch")
async def websocket_git_watch(websocket: WebSocket):
    """WebSocket endpoint for real-time git change notifications."""
    await websocket.accept()
    queue = git_watcher.subscribe()
    try:
        while True:
            message = await queue.get()
            await websocket.send_text(message)
    except WebSocketDisconnect:
        pass
    finally:
        git_watcher.unsubscribe(queue)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
