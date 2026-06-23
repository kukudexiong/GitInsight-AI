"""
Shared dependencies for API routes.
"""
from functools import lru_cache

from services.ai_service import AIService
from services.git_service import GitService
from services.stats_service import StatsService


@lru_cache(maxsize=4)
def get_git_service(repo_path: str) -> GitService:
    """Get or create a GitService instance for the given repo path."""
    return GitService(repo_path)


@lru_cache(maxsize=4)
def get_stats_service(repo_path: str) -> StatsService:
    """Get a StatsService instance."""
    git_svc = get_git_service(repo_path)
    return StatsService(git_svc)


def get_ai_service(repo_path: str) -> AIService:
    """Get an AIService instance."""
    git_svc = get_git_service(repo_path)
    return AIService(git_svc)
