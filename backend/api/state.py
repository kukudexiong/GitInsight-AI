"""
Shared application state.
"""


class AppState:
    """Simple shared state for the current repo path."""
    current_repo_path: str = ""


app_state = AppState()
