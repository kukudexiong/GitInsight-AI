"""Persistent local AI configuration."""
import json
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).resolve().parents[1] / ".gitinsight-ai-config.json"
DEFAULT_BASE_URL = "https://api.deepseek.com/v1"
DEFAULT_MODEL = "deepseek-chat"


def load_ai_config() -> dict[str, str]:
    """Load AI config, preferring environment variables over local config."""
    file_config: dict[str, str] = {}
    if CONFIG_PATH.exists():
        try:
            file_config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            file_config = {}

    return {
        "api_key": os.getenv("OPENAI_API_KEY") or file_config.get("api_key", ""),
        "base_url": os.getenv("OPENAI_BASE_URL") or file_config.get("base_url", DEFAULT_BASE_URL),
        "model": os.getenv("OPENAI_MODEL") or file_config.get("model", DEFAULT_MODEL),
    }


def save_ai_config(api_key: str, base_url: str, model: str) -> dict[str, str]:
    """Save AI config locally and mirror it into process env for this run."""
    config = {
        "api_key": api_key,
        "base_url": base_url or DEFAULT_BASE_URL,
        "model": model or DEFAULT_MODEL,
    }
    CONFIG_PATH.write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8")

    os.environ["OPENAI_API_KEY"] = config["api_key"]
    os.environ["OPENAI_BASE_URL"] = config["base_url"]
    os.environ["OPENAI_MODEL"] = config["model"]
    return config


def mask_api_key(api_key: str) -> str:
    """Return a masked API key suitable for UI display."""
    if not api_key:
        return ""
    if len(api_key) <= 12:
        return "****"
    return f"{api_key[:8]}...{api_key[-4:]}"
