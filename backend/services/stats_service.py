"""
Statistics & Analysis Service

Provides team-level and file-level statistics:
- Author contribution breakdown
- Modification frequency hotspots
- Bus factor analysis
- Knowledge distribution
- Collaboration patterns
"""
from collections import defaultdict, Counter
from dataclasses import dataclass
from typing import Optional

from services.git_service import GitService


@dataclass
class AuthorContribution:
    """Author's contribution to a file."""
    author_name: str
    author_email: str
    commit_count: int
    lines_owned: int  # current lines attributed to this author
    percentage: float  # percentage of file owned


@dataclass
class HotspotInfo:
    """A frequently modified region in a file."""
    start_line: int
    end_line: int
    modification_count: int
    last_modified_by: str
    last_modified_date: str


@dataclass
class BusFactorResult:
    """Bus factor analysis for a file or directory."""
    path: str
    bus_factor: int  # number of key contributors
    top_contributors: list[dict]
    risk_level: str  # "high", "medium", "low"


class StatsService:
    """Service for computing statistics and metrics from git data."""

    def __init__(self, git_service: GitService):
        self.git = git_service

    def get_author_contributions(self, file_path: str) -> list[AuthorContribution]:
        """
        Get author contribution breakdown for a file.
        Based on current blame data (who owns which lines now).
        """
        blame_entries = self.git.get_file_blame(file_path)
        if not blame_entries:
            return []

        author_lines: dict[str, dict] = {}
        total_lines = 0

        for entry in blame_entries:
            line_count = entry.end_line - entry.start_line + 1
            total_lines += line_count
            key = entry.author_email

            if key not in author_lines:
                author_lines[key] = {
                    "author_name": entry.author_name,
                    "author_email": entry.author_email,
                    "lines_owned": 0,
                    "commits": set(),
                }
            author_lines[key]["lines_owned"] += line_count
            author_lines[key]["commits"].add(entry.commit_sha)

        contributions = []
        for key, data in author_lines.items():
            contributions.append(AuthorContribution(
                author_name=data["author_name"],
                author_email=data["author_email"],
                commit_count=len(data["commits"]),
                lines_owned=data["lines_owned"],
                percentage=round(data["lines_owned"] / total_lines * 100, 1) if total_lines > 0 else 0,
            ))

        contributions.sort(key=lambda c: c.lines_owned, reverse=True)
        return contributions

    def get_modification_hotspots(
        self, file_path: str, max_commits: int = 30
    ) -> list[HotspotInfo]:
        """
        Identify frequently modified regions in a file.
        Analyzes recent commits to find which line ranges change most often.
        """
        commits = self.git.get_file_history(file_path, max_count=max_commits)
        if len(commits) < 2:
            return []

        # Track which line ranges get modified
        line_changes: Counter = Counter()

        for i in range(len(commits) - 1):
            diff = self.git.get_diff(file_path, commits[i + 1].sha, commits[i].sha)
            if diff and diff.diff_text:
                # Parse diff to find changed line numbers
                changed_lines = self._parse_diff_line_numbers(diff.diff_text)
                for line_num in changed_lines:
                    # Group into 10-line buckets
                    bucket = (line_num // 10) * 10
                    line_changes[bucket] += 1

        # Convert to hotspots
        hotspots = []
        for bucket, count in line_changes.most_common(10):
            if count >= 2:  # At least modified twice
                hotspots.append(HotspotInfo(
                    start_line=bucket + 1,
                    end_line=bucket + 10,
                    modification_count=count,
                    last_modified_by=commits[0].author_name,
                    last_modified_date=commits[0].date,
                ))

        return hotspots

    def get_bus_factor(self, file_path: str) -> BusFactorResult:
        """
        Calculate bus factor for a file.
        Bus factor = number of people who must be "hit by a bus" before
        the project/file loses all knowledgeable contributors.
        """
        contributions = self.get_author_contributions(file_path)
        if not contributions:
            return BusFactorResult(
                path=file_path, bus_factor=0,
                top_contributors=[], risk_level="high"
            )

        # Count how many people own >5% of the file
        significant_contributors = [c for c in contributions if c.percentage > 5]
        bus_factor = len(significant_contributors)

        # Determine risk level
        if bus_factor <= 1:
            risk_level = "high"
        elif bus_factor <= 2:
            risk_level = "medium"
        else:
            risk_level = "low"

        top_contributors = [
            {
                "author_name": c.author_name,
                "percentage": c.percentage,
                "lines_owned": c.lines_owned,
            }
            for c in contributions[:5]
        ]

        return BusFactorResult(
            path=file_path,
            bus_factor=bus_factor,
            top_contributors=top_contributors,
            risk_level=risk_level,
        )

    def get_knowledge_distribution(self, directory: str = "") -> list[dict]:
        """
        Get knowledge distribution across a directory.
        Shows which authors own which parts of the codebase.
        """
        tree = self.git.get_file_tree(directory)
        author_ownership: dict[str, dict] = defaultdict(lambda: {"files": 0, "lines": 0})

        for entry in tree:
            if entry["type"] != "file":
                continue
            # Skip non-code files
            if not self._is_code_file(entry["name"]):
                continue

            contributions = self.get_author_contributions(entry["path"])
            for contrib in contributions:
                author_ownership[contrib.author_name]["files"] += 1
                author_ownership[contrib.author_name]["lines"] += contrib.lines_owned

        result = []
        for author, data in sorted(author_ownership.items(), key=lambda x: x[1]["lines"], reverse=True):
            result.append({
                "author_name": author,
                "files_owned": data["files"],
                "lines_owned": data["lines"],
            })

        return result

    def get_collaboration_patterns(self, file_path: str, max_commits: int = 50) -> list[dict]:
        """
        Analyze collaboration patterns on a file.
        Identifies pairs of developers who frequently modify the same file.
        """
        commits = self.git.get_file_history(file_path, max_count=max_commits)
        if len(commits) < 2:
            return []

        # Count sequential author transitions
        transitions: Counter = Counter()
        for i in range(len(commits) - 1):
            author_a = commits[i].author_name
            author_b = commits[i + 1].author_name
            if author_a != author_b:
                pair = tuple(sorted([author_a, author_b]))
                transitions[pair] += 1

        patterns = []
        for (author_a, author_b), count in transitions.most_common(10):
            patterns.append({
                "author_a": author_a,
                "author_b": author_b,
                "interaction_count": count,
                "suggestion": f"{author_a} 和 {author_b} 经常交替修改此文件，建议加强沟通减少冲突",
            })

        return patterns

    def _parse_diff_line_numbers(self, diff_text: str) -> list[int]:
        """Parse a unified diff to extract changed line numbers in the new file."""
        changed_lines = []
        current_line = 0

        for line in diff_text.split('\n'):
            if line.startswith('@@'):
                # Parse @@ -old_start,old_count +new_start,new_count @@
                try:
                    parts = line.split('+')[1].split(' ')[0]
                    if ',' in parts:
                        current_line = int(parts.split(',')[0])
                    else:
                        current_line = int(parts)
                except (IndexError, ValueError):
                    continue
            elif line.startswith('+') and not line.startswith('+++'):
                changed_lines.append(current_line)
                current_line += 1
            elif line.startswith('-') and not line.startswith('---'):
                pass  # deleted line, don't increment
            else:
                current_line += 1

        return changed_lines

    @staticmethod
    def _is_code_file(filename: str) -> bool:
        """Check if a filename looks like a code file."""
        code_extensions = {
            '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs',
            '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.vue',
            '.swift', '.kt', '.scala', '.sh', '.bash', '.yaml', '.yml',
            '.json', '.toml', '.sql', '.html', '.css', '.scss',
        }
        _, ext = os.path.splitext(filename) if '.' in filename else ('', '')
        return ext.lower() in code_extensions


import os
