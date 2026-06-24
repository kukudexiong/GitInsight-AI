# GitInsight AI

> 让代码历史开口说话 — AI 增强的 Git 历史可视化与智能分析工具

## 为什么用 GitInsight AI 而不是 GitLab/GitHub？

GitLab 告诉你"谁在什么时候改了哪行"。GitInsight AI 告诉你：

- **为什么这样改** — AI 阅读 diff 自动生成变更意图摘要
- **改得对不对** — 智能风险标记，识别可能引入问题的改动
- **这些改动之间有什么关系** — 跨 commit 的关联发现与函数演变追踪
- **项目健不健康** — 全局仪表盘展示 Bus Factor、知识孤岛、热点文件

## 功能全景

### 第一层：可视化（纯 Git 数据，无需 API Key）

| 功能 | 说明 |
|------|------|
| 文件修改时间线 | 按日期分组的 commit 历史，点击展开内联 diff |
| 逐行归属（Blame） | 彩色标识每行代码的作者，支持按作者筛选高亮 |
| 版本对比（Diff） | 任意两个 commit 之间的 side-by-side 对比 |
| 作者贡献图 | 柱状图 + 表格展示代码归属占比 |
| 修改频率热点 | 标记反复被修改的代码区域（暗示设计缺陷） |

### 第二层：AI 增强理解（需配置 DeepSeek/OpenAI Key）

| 功能 | 说明 |
|------|------|
| 变更意图摘要 | AI 阅读 diff + commit message，一句话总结改了什么、为什么改 |
| 风险标记 | 自动识别可能引入问题的改动（删了错误处理、改了接口等） |
| 符号追踪 | 输入任意代码符号（函数、变量、类名、配置项），追踪它在此文件中的完整演变历史 |
| AI 自由对话 | 对选中文件提任何问题，AI 基于文件内容和修改历史回答 |

### 第三层：团队协作视角（纯 Git 数据，无需 API Key）

| 功能 | 说明 |
|------|------|
| 知识分布图 | 全局视角展示谁负责哪些模块，代码归属可视化 |
| Bus Factor 告警 | 某文件只有 1 人了解 → 高风险标记 |
| 项目健康仪表盘 | 进入仓库后第一屏：活跃度曲线、Top 贡献者、高风险文件、知识孤岛预警 |

### 实时同步

- WebSocket + 文件系统监听（watchdog）
- 你在 IDE 中 commit 后，网页自动刷新数据，无需手动操作

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.10+ / FastAPI / GitPython / Watchdog |
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| AI | DeepSeek / OpenAI（兼容 OpenAI 格式的任何 LLM） |
| 数据源 | 本地 .git 仓库（零配置，无需网络） |

## 快速启动

### 方式一：一键启动（推荐）

双击项目根目录的 `start.bat`，脚本会自动完成所有准备工作：

```bash
# Windows
双击 start.bat
```

脚本会智能处理以下步骤，**已完成的步骤自动跳过**：

1. 检查 Python / Node.js / Git 环境
2. 创建 Python 虚拟环境 & 安装依赖
3. 从 `.env.example` 生成 `.env` 配置文件
4. 安装前端 npm 依赖
5. 分别在独立窗口启动后端和前端
6. 自动打开浏览器访问前端页面

> 关闭对应的命令行窗口即可停止服务。

### 方式二：手动启动

```bash
# 1. 安装后端依赖
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# 2. 配置环境变量
copy .env.example .env       # 然后编辑 .env 填入 API Key

# 3. 启动后端
python main.py
# → 后端运行在 http://localhost:8000

# 4. 安装前端依赖（新开一个终端）
cd frontend
npm install

# 5. 启动前端
npm run dev
# → 前端运行在 http://localhost:5173
```

打开浏览器访问 http://localhost:5173，输入本地仓库路径即可开始分析。

## AI 配置（可选）

AI 功能需要配置 LLM API Key，有两种方式：

- **界面配置**：启动后点击右上角 ⚙️ 设置，填入以下信息
- **文件配置**：编辑 `backend/.env` 文件（首次启动脚本会自动从 `.env.example` 生成）

| 字段 | DeepSeek 配置 | OpenAI 配置 |
|------|--------------|------------|
| API Key | `sk-...`（DeepSeek Key） | `sk-...`（OpenAI Key） |
| Base URL | `https://api.deepseek.com/v1` | `https://api.openai.com/v1` |
| 模型 | `deepseek-chat` | `gpt-4o` |

> 不配置 AI Key 也能使用全部可视化功能（时间线、blame、diff、贡献者、仪表盘）。AI 相关功能（摘要、对话、符号追踪）需要 Key。

## 项目结构

```
git-insight-ai/
├── start.bat                   # Windows 一键启动脚本
├── backend/                    # Python FastAPI 后端
│   ├── main.py                # 入口 + WebSocket 端点
│   ├── .env.example           # 环境变量示例
│   ├── requirements.txt       # Python 依赖
│   ├── ruff.toml              # Ruff 代码格式化配置
│   ├── api/                   # REST API 路由
│   │   ├── git_routes.py     # Git 数据接口（tree/history/blame/diff）
│   │   ├── ai_routes.py      # AI 分析接口（summarize/chat/evolution）
│   │   ├── stats_routes.py   # 统计接口（contributions/bus-factor/hotspots）
│   │   ├── dashboard_routes.py # 仪表盘接口
│   │   ├── settings_routes.py # 设置 + 文件搜索
│   │   ├── dependencies.py   # 依赖注入（公共参数提取）
│   │   └── state.py          # 应用全局状态管理
│   └── services/              # 业务逻辑
│       ├── git_service.py    # Git 数据提取（GitPython）
│       ├── ai_service.py     # LLM 调用与 Prompt 工程
│       ├── ai_config.py      # AI 配置管理（Key/URL/Model）
│       ├── stats_service.py  # 统计分析计算
│       └── git_watcher.py    # 文件系统监听 + WebSocket 推送
├── frontend/                   # React + TypeScript 前端
│   ├── package.json
│   └── src/
│       ├── App.tsx            # 路由入口
│       ├── main.tsx           # 渲染入口
│       ├── index.css          # 全局样式（Tailwind）
│       ├── apis/index.ts      # 统一 API 调用层
│       ├── components/        # UI 组件
│       │   ├── Layout.tsx            # 全局布局
│       │   ├── Timeline.tsx          # 时间线（含内联 diff 展开）
│       │   ├── CommitListItem.tsx    # 单条 commit 展示
│       │   ├── BlameView.tsx         # 逐行归属
│       │   ├── DiffView.tsx          # 版本对比
│       │   ├── Minimap.tsx           # 代码缩略图
│       │   ├── ContributionChart.tsx  # 贡献者图表
│       │   ├── BusFactorBadge.tsx    # Bus Factor 徽章
│       │   ├── KnowledgeDistribution.tsx # 知识分布图
│       │   ├── DashboardInline.tsx   # 内联仪表盘
│       │   ├── StatCard.tsx          # 统计卡片
│       │   ├── StatDetailModal.tsx   # 统计详情弹窗
│       │   ├── FunctionEvolution.tsx  # 符号追踪
│       │   ├── AIChatPanel.tsx       # AI 对话
│       │   ├── AISummaryPanel.tsx    # AI 摘要展示
│       │   ├── FileTreeView.tsx      # 递归文件树
│       │   ├── FileSearch.tsx        # 文件搜索
│       │   ├── SettingsModal.tsx     # 设置弹窗
│       │   ├── ErrorBoundary.tsx     # 错误边界
│       │   ├── Skeleton.tsx          # 加载骨架屏
│       │   └── TabButton.tsx         # 标签切换按钮
│       ├── hooks/
│       │   └── useGitWatcher.ts     # WebSocket 实时监听 hook
│       ├── utils/
│       │   ├── getAuthorAvatar.ts   # 作者头像生成
│       │   └── parseDiff.ts         # Diff 文本解析
│       └── pages/
│           ├── HomePage.tsx          # 首页（输入仓库 + 历史记录）
│           └── FileInsightPage.tsx   # 主页面（文件树 + 分析面板 + 仪表盘）
├── .editorconfig               # 编辑器统一配置
├── .gitignore
└── README.md
```

## 与现有工具对比

| 能力 | GitLab | GitHub | GitLens | GitInsight AI |
|------|--------|--------|---------|---------------|
| Blame | ✅ | ✅ | ✅ | ✅ |
| Diff | ✅ | ✅ | ✅ | ✅ |
| Commit History | ✅ | ✅ | ✅ | ✅ |
| AI 变更摘要 | ❌ | ❌ | ❌ | ✅ |
| AI 自由对话 | ❌ | ❌ | ❌ | ✅ |
| 符号演变追踪 | ❌ | ❌ | ❌ | ✅ |
| Bus Factor 分析 | ❌ | ❌ | ❌ | ✅ |
| 知识孤岛预警 | ❌ | ❌ | ❌ | ✅ |
| 项目健康仪表盘 | ❌ | ❌ | ❌ | ✅ |
| 修改频率热点 | ❌ | ❌ | ❌ | ✅ |
| 实时 Git 变更推送 | ❌ | ❌ | ✅ | ✅ |
| 独立 Web 界面 | ❌ (平台绑定) | ❌ (平台绑定) | ❌ (IDE插件) | ✅ |
| 零配置离线使用 | ❌ | ❌ | ✅ | ✅ |

## 适用场景

1. **新人入职** — 快速理解陌生项目：谁负责什么、核心逻辑在哪、最近在改什么
2. **Code Review** — 审查变更时了解背景：这个文件的修改热点在哪、bus factor 如何
3. **Bug 排查** — 追踪代码演变：这行代码是什么时候、被谁、为什么改成这样的
4. **团队管理** — 识别风险：哪些核心文件只有一人了解、谁在活跃谁消失了
