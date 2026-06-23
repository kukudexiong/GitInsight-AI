"""
AI Analysis Service

Leverages OpenAI GPT-4o to provide intelligent insights:
- Change intent summarization
- Risk identification
- Related change discovery
- Function evolution tracking
- Impact analysis
- Code review suggestions
"""
import json

from openai import AsyncOpenAI

from services.ai_config import load_ai_config
from services.git_service import GitService


class AIService:
    """Service for AI-powered git analysis."""

    def __init__(self, git_service: GitService):
        self.git = git_service

    @property
    def model(self) -> str:
        return load_ai_config()["model"]

    @property
    def client(self):
        config = load_ai_config()
        api_key = config["api_key"]
        if not api_key:
            return None
        return AsyncOpenAI(api_key=api_key, base_url=config["base_url"])

    def is_available(self) -> bool:
        """Check if AI service is configured and available."""
        return bool(load_ai_config()["api_key"])

    async def summarize_commit(self, sha: str, file_path: str | None = None) -> dict:
        """
        Generate an AI summary of what a commit did and why.
        If file_path is provided, focuses on changes to that file.
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY."}

        commit_detail = self.git.get_commit_detail(sha)
        if not commit_detail:
            return {"error": f"Commit {sha} not found."}

        # Get the diff
        diff_text = ""
        if commit_detail["parent_shas"]:
            parent = commit_detail["parent_shas"][0]
            if file_path:
                diff_result = self.git.get_diff(file_path, parent, sha)
                diff_text = diff_result.diff_text if diff_result else ""
            else:
                # Get full diff (limited to avoid token overflow)
                try:
                    diff_text = self.git.repo.git.diff(parent, sha, stat=True)
                except Exception:
                    diff_text = "Diff not available"

        prompt = f"""Analyze this git commit and provide:
1. A one-sentence summary of what was changed (in Chinese)
2. The likely intent/reason for this change (in Chinese)
3. Any potential risks or issues introduced (in Chinese, or "无明显风险" if none)

Commit message: {commit_detail['full_message']}
Author: {commit_detail['author_name']}
Date: {commit_detail['date']}
Files changed: {json.dumps(commit_detail['changed_files'][:20], ensure_ascii=False)}

Diff (truncated):
{diff_text[:3000]}

Respond in JSON format:
{{"summary": "...", "intent": "...", "risks": ["...", "..."], "risk_level": "none|low|medium|high"}}"""

        response = await self._call_llm(prompt)
        return self._parse_json_response(response)

    async def analyze_function_evolution(
        self, file_path: str, function_name: str, max_commits: int = 10
    ) -> dict:
        """
        Track how a specific code symbol/snippet has evolved over time in the given file.
        Works for functions, variables, class names, config keys, CSS selectors, etc.
        Only tracks changes within the specified file, but AI analysis may mention
        cross-file interactions.
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY."}

        commits = self.git.get_file_history(file_path, max_count=max_commits)
        if not commits:
            return {"error": f"No history found for {file_path}"}

        # Collect diffs that mention this symbol within this file only
        relevant_diffs = []
        for i in range(len(commits) - 1):
            diff = self.git.get_diff(file_path, commits[i + 1].sha, commits[i].sha)
            if diff and function_name in diff.diff_text:
                relevant_diffs.append({
                    "sha": commits[i].short_sha,
                    "author": commits[i].author_name,
                    "date": commits[i].date,
                    "message": commits[i].message,
                    "diff_snippet": self._extract_function_diff(diff.diff_text, function_name),
                })

        if not relevant_diffs:
            return {"evolution": [], "summary": f"「{function_name}」在最近 {max_commits} 次提交中没有变更记录"}

        # Get current file content to check cross-file interactions
        file_content = self.git.get_file_content(file_path)
        content_snippet = ""
        if file_content:
            # Find lines containing the symbol for context
            lines = file_content.split('\n')
            relevant_lines = [f"L{i+1}: {line}" for i, line in enumerate(lines) if function_name in line]
            content_snippet = "\n".join(relevant_lines[:15])

        prompt = f"""分析代码符号「{function_name}」在文件 `{file_path}` 中的演变历史。

注意：只分析该符号在此文件内的变化，但可以提及它与其他文件/模块的交互关系。

该符号当前在文件中出现的位置：
{content_snippet}

以下是涉及该符号的各次修改（从新到旧）：
{json.dumps(relevant_diffs[:8], ensure_ascii=False, indent=2)}

请用中文回答：
1. 这个符号（可能是函数、变量、类名、配置项等）经历了怎样的演变？
2. 每次修改的要点是什么？
3. 它与其他文件/模块有什么交互关系？
4. 当前是否存在潜在问题？

用 JSON 格式回答：
{{"evolution_summary": "...", "changes": [{{"sha": "...", "description": "..."}}], "cross_file_interactions": "与哪些外部文件有关联...", "current_concerns": "..."}}"""

        response = await self._call_llm(prompt)
        return self._parse_json_response(response)

    async def find_related_changes(self, file_path: str, sha: str) -> dict:
        """
        Find other changes that are likely related to a specific commit.
        (Same feature/bugfix spanning multiple files)
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY."}

        commit_detail = self.git.get_commit_detail(sha)
        if not commit_detail:
            return {"error": f"Commit {sha} not found."}

        # Get commits around the same time by the same author
        nearby_commits = []
        for commit in self.git.get_recent_commits(max_count=50):
            if commit.author_name == commit_detail["author_name"]:
                # Within 3 days
                time_diff = abs(commit.timestamp - commit_detail["timestamp"])
                if time_diff < 3 * 24 * 3600 and commit.sha != sha:
                    nearby_commits.append(commit)
            if len(nearby_commits) >= 10:
                break

        if not nearby_commits:
            return {"related": [], "explanation": "未找到相关联的变更"}

        prompt = f"""给定一个核心 commit：
- Message: {commit_detail['full_message']}
- Files: {json.dumps([f['path'] for f in commit_detail['changed_files'][:10]], ensure_ascii=False)}
- Author: {commit_detail['author_name']}
- Date: {commit_detail['date']}

以下是同一作者在前后3天内的其他 commit：
{json.dumps([{{"sha": c.short_sha, "message": c.message, "date": c.date}} for c in nearby_commits], ensure_ascii=False, indent=2)}

哪些 commit 可能是同一个需求/功能/bugfix 的一部分？用中文回答。

JSON 格式：
{{"related_commits": [{{"sha": "...", "reason": "..."}}], "feature_description": "这些改动共同实现了..."}}"""

        response = await self._call_llm(prompt)
        return self._parse_json_response(response)

    async def analyze_impact(self, file_path: str, sha: str) -> dict:
        """
        Analyze the potential impact of a change on other parts of the codebase.
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY."}

        commit_detail = self.git.get_commit_detail(sha)
        if not commit_detail:
            return {"error": f"Commit {sha} not found."}

        diff_text = ""
        if commit_detail["parent_shas"]:
            diff_result = self.git.get_diff(file_path, commit_detail["parent_shas"][0], sha)
            diff_text = diff_result.diff_text if diff_result else ""

        prompt = f"""分析以下代码变更的影响范围：

文件: {file_path}
变更摘要: {commit_detail['full_message']}

Diff:
{diff_text[:3000]}

请分析：
1. 这个变更可能影响哪些下游模块或功能？
2. 是否需要同步修改测试？
3. 是否有 API 兼容性影响？

JSON 格式回答：
{{"affected_areas": ["..."], "test_impact": "...", "api_compatibility": "...", "suggestions": ["..."]}}"""

        response = await self._call_llm(prompt)
        return self._parse_json_response(response)

    async def generate_review_suggestions(self, file_path: str, sha: str) -> dict:
        """
        Generate code review suggestions for a specific commit's changes to a file.
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY."}

        commit_detail = self.git.get_commit_detail(sha)
        if not commit_detail:
            return {"error": f"Commit {sha} not found."}

        diff_text = ""
        if commit_detail["parent_shas"]:
            diff_result = self.git.get_diff(file_path, commit_detail["parent_shas"][0], sha)
            diff_text = diff_result.diff_text if diff_result else ""

        if not diff_text:
            return {"suggestions": [], "overall": "无法获取 diff 内容"}

        prompt = f"""作为代码审查者，请审查以下代码变更并给出建议：

文件: {file_path}
Commit message: {commit_detail['full_message']}
Author: {commit_detail['author_name']}

Diff:
{diff_text[:4000]}

请从以下维度审查（用中文回答）：
1. 代码质量（命名、结构、可读性）
2. 安全性（注入、XSS、敏感信息泄露）
3. 错误处理（异常捕获、边界条件）
4. 性能（N+1查询、内存泄漏模式）

JSON 格式：
{{"score": 85, "suggestions": [{{"severity": "warning|error|info", "line_hint": "...", "description": "...", "fix": "..."}}], "overall": "总体评价..."}}"""

        response = await self._call_llm(prompt)
        return self._parse_json_response(response)

    async def chat_about_file(self, file_path: str, question: str, history: list[dict] = None) -> dict:
        """
        Free-form Q&A about a specific file.
        Uses file content, recent history, and blame as context.
        """
        if not self.is_available():
            return {"error": "AI service not configured. Set OPENAI_API_KEY.", "answer": ""}

        # Gather context
        file_content = self.git.get_file_content(file_path)
        if not file_content:
            return {"answer": f"无法读取文件 {file_path}"}

        # Truncate if too long
        content_preview = file_content[:4000] if len(file_content) > 4000 else file_content

        # Get recent commits for context
        recent_commits = self.git.get_file_history(file_path, max_count=5)
        commits_context = "\n".join(
            [f"- {c.short_sha} ({c.author_name}, {c.date[:10]}): {c.message}" for c in recent_commits]
        )

        system_msg = f"""你是一个代码分析助手。用户正在查看文件 `{file_path}`。
以下是文件内容（可能截断）：

```
{content_preview}
```

最近的修改记录：
{commits_context}

请根据文件内容和修改记录回答用户的问题。用中文回答，简洁清晰。"""

        messages = [{"role": "system", "content": system_msg}]

        # Add conversation history if provided
        if history:
            for msg in history[-6:]:  # Keep last 6 messages for context
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        messages.append({"role": "user", "content": question})

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.4,
                max_tokens=1500,
            )
            answer = response.choices[0].message.content or ""
            return {"answer": answer}
        except Exception as e:
            return {"answer": f"AI 调用失败: {e!s}"}

    async def _call_llm(self, prompt: str) -> str:
        """Call the LLM API."""
        if not self.client:
            return '{"error": "AI service not configured"}'

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的代码分析助手。你的回答必须是合法的 JSON 格式。"},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            return json.dumps({"error": f"LLM call failed: {e!s}"})

    def _parse_json_response(self, response: str) -> dict:
        """Parse LLM response as JSON, handling markdown code blocks."""
        text = response.strip()
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split('\n')
            text = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_response": response, "parse_error": True}

    @staticmethod
    def _extract_function_diff(diff_text: str, function_name: str, context_lines: int = 5) -> str:
        """Extract the portion of a diff that relates to a specific function."""
        lines = diff_text.split('\n')
        relevant = []
        in_context = False
        context_countdown = 0

        for line in lines:
            if function_name in line:
                in_context = True
                context_countdown = context_lines * 2
            if in_context:
                relevant.append(line)
                context_countdown -= 1
                if context_countdown <= 0:
                    in_context = False

        return '\n'.join(relevant[:30])  # Cap at 30 lines
