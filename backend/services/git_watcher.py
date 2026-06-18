"""
Git Watcher Service

Monitors .git directory for changes (new commits, branch switches, etc.)
and notifies connected WebSocket clients to refresh their data.
"""
import asyncio
import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Set

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

LOG = logging.getLogger(__name__)


class GitChangeHandler(FileSystemEventHandler):
    """Watches .git directory for changes that indicate new commits."""

    def __init__(self, callback):
        super().__init__()
        self._callback = callback
        self._last_notify = 0
        self._debounce_seconds = 1.0  # Debounce rapid changes

    def on_modified(self, event):
        self._check_event(event)

    def on_created(self, event):
        self._check_event(event)

    def _check_event(self, event):
        if event.is_directory:
            return

        path = event.src_path
        # Only care about changes that indicate git state changed
        # - refs/heads/* = branch tips moved (new commit, branch switch)
        # - HEAD = checkout/switch
        # - COMMIT_EDITMSG = commit in progress
        # - index = staging area changed
        triggers = ['refs', 'HEAD', 'COMMIT_EDITMSG', 'FETCH_HEAD', 'ORIG_HEAD']
        if any(t in path for t in triggers):
            now = time.time()
            if now - self._last_notify > self._debounce_seconds:
                self._last_notify = now
                self._callback()


class GitWatcher:
    """Manages file system watching and WebSocket client notifications."""

    def __init__(self):
        self._clients: Set[asyncio.Queue] = set()
        self._observer: Observer | None = None
        self._repo_path: str = ""
        self._loop: asyncio.AbstractEventLoop | None = None

    def start_watching(self, repo_path: str, loop: asyncio.AbstractEventLoop):
        """Start watching a repository's .git directory."""
        self.stop_watching()

        git_dir = os.path.join(repo_path, '.git')
        if not os.path.isdir(git_dir):
            LOG.warning(f"No .git directory found at {git_dir}")
            return

        self._repo_path = repo_path
        self._loop = loop

        handler = GitChangeHandler(self._on_git_change)
        self._observer = Observer()
        self._observer.schedule(handler, git_dir, recursive=True)
        self._observer.daemon = True
        self._observer.start()
        LOG.info(f"Started watching git changes at {git_dir}")

    def stop_watching(self):
        """Stop the file system observer."""
        if self._observer:
            self._observer.stop()
            self._observer = None
            LOG.info("Stopped watching git changes")

    def _on_git_change(self):
        """Called from watchdog thread when git state changes."""
        if self._loop:
            self._loop.call_soon_threadsafe(
                lambda: asyncio.ensure_future(self._notify_clients())
            )

    async def _notify_clients(self):
        """Notify all connected WebSocket clients."""
        if not self._clients:
            return

        message = json.dumps({
            "type": "git_changed",
            "timestamp": int(time.time()),
            "repo_path": self._repo_path,
        })

        dead_clients = set()
        for queue in self._clients:
            try:
                await queue.put(message)
            except Exception:
                dead_clients.add(queue)

        self._clients -= dead_clients

    def subscribe(self) -> asyncio.Queue:
        """Subscribe a new client. Returns a queue that receives notifications."""
        queue: asyncio.Queue = asyncio.Queue()
        self._clients.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe a client."""
        self._clients.discard(queue)


# Singleton instance
git_watcher = GitWatcher()
