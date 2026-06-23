"""
Dashboard API Routes

Provides the global repository health overview:
- High risk files (low bus factor + high churn)
- Activity curve (last 30 days)
- Knowledge silos (files only touched by 1 person)
- Hot files (most frequently modified recently)
"""
import time
from collections import Counter, defaultdict

from fastapi import APIRouter, HTTPException, Query

from api.dependencies import get_git_service, get_stats_service
from api.state import app_state

router = APIRouter()
_dashboard_cache: dict[tuple[str, str], tuple[float, dict]] = {}
_DASHBOARD_CACHE_TTL_SECONDS = 60
_DASHBOARD_CACHE_MAX_SIZE = 10


@router.get("/overview")
async def get_dashboard_overview(repo_path: str = Query(default="")):
    """Get the full dashboard overview data."""
    path = repo_path or app_state.current_repo_path
    if not path:
        raise HTTPException(status_code=400, detail="No repository configured")

    git_svc = get_git_service(path)
    stats_svc = get_stats_service(path)
    try:
        head_sha = git_svc.repo.head.commit.hexsha
    except Exception:
        head_sha = ""

    cache_key = (path, head_sha)
    cached = _dashboard_cache.get(cache_key)
    now = time.time()
    if cached and now - cached[0] < _DASHBOARD_CACHE_TTL_SECONDS:
        return cached[1]

    since_timestamp = int(now) - 7 * 24 * 3600
    commits_30d = git_svc.get_commits_since(since_timestamp)
    recent_commits = git_svc.get_recent_commits(max_count=30)

    # 1. Activity curve - commits per day, grouped by author
    activity = _compute_activity_curve(commits_30d)

    # 2. Top contributors in last 7 days
    top_contributors = _compute_top_contributors(commits_30d)

    # 3. Hot files - most frequently modified in last 7 days
    hot_files = _compute_hot_files(git_svc, since_timestamp)

    # 4. High risk files & knowledge silos
    risk_files, knowledge_silos = _compute_risk_analysis(git_svc, stats_svc, hot_files)

    # 5. Basic stats
    total_commits_30d = len(commits_30d)
    active_authors = len(set(c.author_name for c in commits_30d))
    # Hot files: files modified 3+ times in 30 days
    hot_files_count = len([f for f in hot_files if f["change_count"] >= 3])

    # 6. Recent commits (like GitLab history)
    recent_history = _compute_recent_history(git_svc, recent_commits[:30])

    result = {
        "stats": {
            "total_commits_30d": total_commits_30d,
            "active_authors": active_authors,
            "hot_files_count": hot_files_count,
            "risk_files_count": len(risk_files),
        },
        "activity": activity,
        "top_contributors": top_contributors,
        "hot_files": hot_files[:10],
        "risk_files": risk_files[:5],
        "knowledge_silos": knowledge_silos[:8],
        "recent_commits": recent_history,
    }
    if len(_dashboard_cache) >= _DASHBOARD_CACHE_MAX_SIZE:
        _dashboard_cache.clear()
    _dashboard_cache[cache_key] = (now, result)
    return result


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


def _compute_hot_files(git_svc, since_timestamp: int) -> list[dict]:
    """Find most frequently modified files using git log --name-only for performance."""
    file_counter: Counter = Counter()
    file_authors: dict[str, set] = defaultdict(set)

    # Use git log with --name-only for much better performance than per-commit diff
    try:
        # Get file changes across the complete 30-day window without a commit-count cap.
        log_output = git_svc.repo.git.log(
            f"--since=@{since_timestamp}",
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
    for file_path, count in file_counter.most_common(100):
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
    for hf in hot_files[:15]:
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


def _compute_recent_history(git_svc, commits) -> list[dict]:
    """
    Build a GitLab-style recent commit history with merge detection,
    branch info, and changed file list.
    """
    result = []
    for c in commits:
        # Detect merge commits (has more than 1 parent)
        is_merge = False
        merge_source = ""
        changed_files = []
        try:
            commit_obj = git_svc.repo.commit(c.sha)
            is_merge = len(commit_obj.parents) > 1
            if is_merge:
                # Try to extract merge source from message like "Merge branch 'xxx' into yyy"
                msg = c.message
                if "Merge branch" in msg:
                    parts = msg.split("'")
                    if len(parts) >= 2:
                        merge_source = parts[1]
                elif "Merge" in msg:
                    merge_source = msg.replace("Merge", "").strip()

            # Get changed files (limit to 10 for performance)
            if commit_obj.parents:
                diffs = commit_obj.parents[0].diff(commit_obj)
                for d in diffs[:10]:
                    changed_files.append({
                        "path": d.b_path or d.a_path,
                        "change_type": d.change_type,  # A/D/M/R
                    })
        except Exception:
            pass

        # Compute relative time description
        now = int(time.time())
        diff_sec = now - c.timestamp
        if diff_sec < 60:
            time_ago = "刚刚"
        elif diff_sec < 3600:
            time_ago = f"{diff_sec // 60} 分钟前"
        elif diff_sec < 86400:
            time_ago = f"{diff_sec // 3600} 小时前"
        elif diff_sec < 604800:
            time_ago = f"{diff_sec // 86400} 天前"
        else:
            time_ago = c.date.split('T')[0]

        result.append({
            "sha": c.sha,
            "short_sha": c.short_sha,
            "author_name": c.author_name,
            "author_email": c.author_email,
            "message": c.message,
            "date": c.date,
            "time_ago": time_ago,
            "is_merge": is_merge,
            "merge_source": merge_source,
            "changed_files": changed_files,
            "changed_files_count": len(changed_files),
        })

    return result
