"""
Git Watcher Service

Monitors .git directory for changes (new commits, branch switches, etc.)
and notifies connected WebSocket clients to refresh their data.
"""
import asyncio
import json
import logging
import os
import time
from collections import defaultdict

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

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
        self._clients: defaultdict[str, set[asyncio.Queue]] = defaultdict(set)
        self._observers: dict[str, Observer] = {}
        self._repo_path: str = ""
        self._loop: asyncio.AbstractEventLoop | None = None

    def start_watching(self, repo_path: str, loop: asyncio.AbstractEventLoop):
        """Start watching a repository's .git directory."""
        if repo_path in self._observers:
            self._loop = loop
            return

        git_dir = os.path.join(repo_path, '.git')
        if not os.path.isdir(git_dir):
            LOG.warning(f"No .git directory found at {git_dir}")
            return

        self._repo_path = repo_path
        self._loop = loop

        handler = GitChangeHandler(lambda: self._on_git_change(repo_path))
        observer = Observer()
        observer.schedule(handler, git_dir, recursive=True)
        observer.daemon = True
        observer.start()
        self._observers[repo_path] = observer
        LOG.info(f"Started watching git changes at {git_dir}")

    def stop_watching(self, repo_path: str | None = None):
        """Stop the file system observer and notify clients to disconnect."""
        repo_paths = [repo_path] if repo_path else list(self._observers.keys())
        for path in repo_paths:
            observer = self._observers.pop(path, None)
            if observer:
                observer.stop()
                observer.join(timeout=2)
                LOG.info(f"Stopped watching git changes at {path}")
            for queue in self._clients.pop(path, set()):
                try:
                    queue.put_nowait(None)  # Sentinel to unblock waiting coroutines
                except Exception:
                    pass

        # If stopping all (no specific repo_path), also clear any remaining clients
        # (e.g. clients connected with empty repo_path)
        if repo_path is None:
            for key in list(self._clients.keys()):
                for queue in self._clients.pop(key, set()):
                    try:
                        queue.put_nowait(None)
                    except Exception:
                        pass

    def _on_git_change(self, repo_path: str):
        """Called from watchdog thread when git state changes."""
        if self._loop:
            self._loop.call_soon_threadsafe(
                lambda: asyncio.ensure_future(self._notify_clients(repo_path))
            )

    async def _notify_clients(self, repo_path: str):
        """Notify all connected WebSocket clients."""
        clients = self._clients.get(repo_path, set())
        if not clients:
            return

        message = json.dumps({
            "type": "git_changed",
            "timestamp": int(time.time()),
            "repo_path": repo_path,
        })

        dead_clients = set()
        for queue in clients:
            try:
                await queue.put(message)
            except Exception:
                dead_clients.add(queue)

        self._clients[repo_path] -= dead_clients

    def subscribe(self, repo_path: str = "") -> asyncio.Queue:
        """Subscribe a new client. Returns a queue that receives notifications."""
        queue: asyncio.Queue = asyncio.Queue()
        self._clients[repo_path].add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue, repo_path: str = ""):
        """Unsubscribe a client."""
        if repo_path:
            self._clients[repo_path].discard(queue)
            return
        for clients in self._clients.values():
            clients.discard(queue)

    @property
    def repo_path(self) -> str:
        """The repository currently being watched."""
        return self._repo_path


# Singleton instance
git_watcher = GitWatcher()
