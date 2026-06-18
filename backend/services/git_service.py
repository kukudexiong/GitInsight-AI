"""
Git Data Extraction Service

Provides all git-related data operations:
- File commit history (timeline)
- Blame information (line-by-line attribution)
- Diff between any two commits
- File tree listing
- Commit details
"""
import os
from dataclasses import dataclass, field
from typing import Optional

import git
from git import Repo, Commit


@dataclass
class CommitInfo:
    """Structured commit information."""
    sha: str
    short_sha: str
    author_name: str
    author_email: str
    date: str
    timestamp: int
    message: str
    files_changed: int = 0
    insertions: int = 0
    deletions: int = 0


@dataclass
class BlameEntry:
    """A single blame entry (one or more consecutive lines by same commit)."""
    commit_sha: str
    short_sha: str
    author_name: str
    author_email: str
    date: str
    timestamp: int
    message: str
    start_line: int
    end_line: int
    content: list[str] = field(default_factory=list)


@dataclass
class DiffResult:
    """Diff between two commits for a specific file."""
    old_sha: str
    new_sha: str
    file_path: str
    diff_text: str
    additions: int = 0
    deletions: int = 0


class GitService:
    """Service for extracting git data from a local repository."""

    def __init__(self, repo_path: str):
        if not os.path.isdir(repo_path):
            raise ValueError(f"Repository path does not exist: {repo_path}")
        self.repo = Repo(repo_path)
        if self.repo.bare:
            raise ValueError(f"Cannot work with bare repository: {repo_path}")

    def get_file_tree(self, path: str = "", ref: str = "HEAD") -> list[dict]:
        """
        Get the file/directory tree at a given path and ref.
        Returns a list of entries with type (file/dir), name, and path.
        """
        try:
            tree = self.repo.commit(ref).tree
            if path:
                tree = tree[path]
        except (KeyError, git.exc.BadName):
            return []

        entries = []
        if hasattr(tree, 'trees') and hasattr(tree, 'blobs'):
            # It's a tree (directory)
            for subtree in sorted(tree.trees, key=lambda t: t.name):
                entries.append({
                    "type": "dir",
                    "name": subtree.name,
                    "path": subtree.path,
                })
            for blob in sorted(tree.blobs, key=lambda b: b.name):
                entries.append({
                    "type": "file",
                    "name": blob.name,
                    "path": blob.path,
                    "size": blob.size,
                })
        return entries

    def get_file_history(
        self, file_path: str, max_count: int = 50, ref: str = "HEAD"
    ) -> list[CommitInfo]:
        """
        Get commit history for a specific file.
        Returns commits ordered from newest to oldest.
        """
        commits = []
        for commit in self.repo.iter_commits(ref, paths=file_path, max_count=max_count):
            info = self._commit_to_info(commit)
            commits.append(info)
        return commits

    def get_file_blame(self, file_path: str, ref: str = "HEAD") -> list[BlameEntry]:
        """
        Get blame information for a file.
        Returns line-by-line attribution grouped by consecutive same-commit lines.
        """
        try:
            blame_data = self.repo.blame(ref, file_path)
        except git.exc.GitCommandError:
            return []

        entries = []
        current_line = 1

        for commit, lines in blame_data:
            line_count = len(lines)
            entry = BlameEntry(
                commit_sha=commit.hexsha,
                short_sha=commit.hexsha[:7],
                author_name=commit.author.name,
                author_email=commit.author.email,
                date=commit.committed_datetime.isoformat(),
                timestamp=commit.committed_date,
                message=commit.message.strip().split('\n')[0],
                start_line=current_line,
                end_line=current_line + line_count - 1,
                content=[line.decode('utf-8', errors='replace') if isinstance(line, bytes) else str(line) for line in lines],
            )
            entries.append(entry)
            current_line += line_count

        return entries

    def get_diff(
        self, file_path: str, old_ref: str, new_ref: str = "HEAD"
    ) -> Optional[DiffResult]:
        """
        Get the diff of a specific file between two refs (commits/branches/tags).
        """
        try:
            old_commit = self.repo.commit(old_ref)
            new_commit = self.repo.commit(new_ref)
        except (git.exc.BadName, ValueError):
            return None

        diffs = old_commit.diff(new_commit, paths=file_path, create_patch=True)

        for diff in diffs:
            diff_text = diff.diff.decode('utf-8', errors='replace') if diff.diff else ""
            additions = diff_text.count('\n+') - diff_text.count('\n+++')
            deletions = diff_text.count('\n-') - diff_text.count('\n---')
            return DiffResult(
                old_sha=old_ref,
                new_sha=new_ref,
                file_path=file_path,
                diff_text=diff_text,
                additions=max(0, additions),
                deletions=max(0, deletions),
            )

        return None

    def get_commit_detail(self, sha: str) -> Optional[dict]:
        """Get detailed information about a specific commit."""
        try:
            commit = self.repo.commit(sha)
        except (git.exc.BadName, ValueError):
            return None

        # Get changed files
        changed_files = []
        if commit.parents:
            diffs = commit.parents[0].diff(commit)
            for diff in diffs:
                changed_files.append({
                    "path": diff.b_path or diff.a_path,
                    "change_type": diff.change_type,  # A/D/M/R
                })

        info = self._commit_to_info(commit)
        return {
            **info.__dict__,
            "full_message": commit.message.strip(),
            "parent_shas": [p.hexsha for p in commit.parents],
            "changed_files": changed_files,
        }

    def get_file_content(self, file_path: str, ref: str = "HEAD") -> Optional[str]:
        """Get file content at a specific ref."""
        try:
            blob = self.repo.commit(ref).tree[file_path]
            return blob.data_stream.read().decode('utf-8', errors='replace')
        except (KeyError, git.exc.BadName):
            return None

    def get_branches(self) -> list[str]:
        """Get all branch names."""
        return [ref.name for ref in self.repo.branches]

    def get_recent_commits(self, max_count: int = 20, ref: str = "HEAD") -> list[CommitInfo]:
        """Get recent commits across the whole repo."""
        commits = []
        for commit in self.repo.iter_commits(ref, max_count=max_count):
            commits.append(self._commit_to_info(commit))
        return commits

    def _commit_to_info(self, commit: Commit) -> CommitInfo:
        """Convert a git.Commit to CommitInfo dataclass."""
        return CommitInfo(
            sha=commit.hexsha,
            short_sha=commit.hexsha[:7],
            author_name=commit.author.name,
            author_email=commit.author.email,
            date=commit.committed_datetime.isoformat(),
            timestamp=commit.committed_date,
            message=commit.message.strip().split('\n')[0],
        )
