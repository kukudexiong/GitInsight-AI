"""
Dashboard API Routes

Provides the global repository health overview:
- High risk files (low bus factor + high churn)
- Activity curve (last 30 days)
- Knowledge silos (files only touched by 1 person)
- Hot files (most frequently modified recently)
"""
import time
from collections import defaultdict, Counter
from fastapi import APIRouter, HTTPException, Query

from api.dependencies import get_git_service, get_stats_service
from api.state import app_state

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(repo_path: str = Query(default="")):
    """Get the full dashboard overview data."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")

    git_svc = get_git_service(path)
    stats_svc = get_stats_service(path)

    # Get recent commits (last 30 days worth, up to 500)
    recent_commits = git_svc.get_recent_commits(max_count=500)

    thirty_days_ago = int(time.time()) - 30 * 24 * 3600
    commits_30d = [c for c in recent_commits if c.timestamp >= thirty_days_ago]

    # 1. Activity curve - commits per day, grouped by author
    activity = _compute_activity_curve(commits_30d)

    # 2. Top contributors in last 30 days
    top_contributors = _compute_top_contributors(commits_30d)

    # 3. Hot files - most frequently modified in last 30 days
    hot_files = _compute_hot_files(git_svc, commits_30d)

    # 4. High risk files & knowledge silos
    risk_files, knowledge_silos = _compute_risk_analysis(git_svc, stats_svc, hot_files)

    # 5. Basic stats
    total_commits_30d = len(commits_30d)
    active_authors = len(set(c.author_name for c in commits_30d))

    return {
        "stats": {
            "total_commits_30d": total_commits_30d,
            "active_authors": active_authors,
            "hot_files_count": len(hot_files),
            "risk_files_count": len(risk_files),
        },
        "activity": activity,
        "top_contributors": top_contributors,
        "hot_files": hot_files[:10],
        "risk_files": risk_files[:5],
        "knowledge_silos": knowledge_silos[:8],
    }


def _compute_activity_curve(commits) -> list[dict]:
    """Group commits by date for the activity chart."""
    daily: dict[str, dict] = defaultdict(lambda: {"date": "", "total": 0, "authors": defaultdict(int)})

    for c in commits:
        date_str = c.date.split('T')[0]
        daily[date_str]["date"] = date_str
        daily[date_str]["total"] += 1
        daily[date_str]["authors"][c.author_name] += 1

    result = []
    for date_str in sorted(daily.keys()):
        entry = daily[date_str]
        result.append({
            "date": date_str,
            "total": entry["total"],
            "authors": dict(entry["authors"]),
        })

    return result


def _compute_top_contributors(commits) -> list[dict]:
    """Rank contributors by commit count in the period."""
    counter: Counter = Counter()
    for c in commits:
        counter[c.author_name] += 1

    return [
        {"author_name": name, "commit_count": count}
        for name, count in counter.most_common(10)
    ]


def _compute_hot_files(git_svc, commits) -> list[dict]:
    """Find most frequently modified files using git log --name-only for performance."""
    file_counter: Counter = Counter()
    file_authors: dict[str, set] = defaultdict(set)

    # Use git log with --name-only for much better performance than per-commit diff
    try:
        if commits:
            since_sha = commits[-1].sha if len(commits) > 50 else commits[min(len(commits)-1, 49)].sha
            until_sha = commits[0].sha
            # Get file changes in batch via git log
            log_output = git_svc.repo.git.log(
                f"{since_sha}..{until_sha}",
                name_only=True,
                format="%H|%an"
            )
            current_author = ""
            for line in log_output.split('\n'):
                line = line.strip()
                if not line:
                    continue
                if '|' in line and len(line.split('|')[0]) == 40:
                    # This is a commit line: sha|author
                    current_author = line.split('|', 1)[1]
                else:
                    # This is a file path
                    file_counter[line] += 1
                    file_authors[line].add(current_author)
    except Exception:
        # Fallback: just count from commit messages (no file detail)
        pass

    result = []
    for file_path, count in file_counter.most_common(20):
        result.append({
            "path": file_path,
            "change_count": count,
            "author_count": len(file_authors[file_path]),
            "authors": list(file_authors[file_path]),
        })

    return result


def _compute_risk_analysis(git_svc, stats_svc, hot_files) -> tuple[list, list]:
    """
    Identify:
    - High risk files: frequently changed + low bus factor
    - Knowledge silos: files only 1 person has touched
    """
    risk_files = []
    knowledge_silos = []

    # Analyze top hot files for bus factor
    for hf in hot_files[:5]:
        try:
            bf = stats_svc.get_bus_factor(hf["path"])
            if bf.bus_factor <= 1 and hf["change_count"] >= 3:
                risk_files.append({
                    "path": hf["path"],
                    "bus_factor": bf.bus_factor,
                    "change_count": hf["change_count"],
                    "risk_level": "high" if bf.bus_factor == 0 else "medium",
                    "owner": bf.top_contributors[0]["author_name"] if bf.top_contributors else "unknown",
                })
            if hf["author_count"] == 1:
                knowledge_silos.append({
                    "path": hf["path"],
                    "sole_author": hf["authors"][0] if hf["authors"] else "unknown",
                    "change_count": hf["change_count"],
                })
        except Exception:
            continue

    return risk_files, knowledge_silos
