import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, ArrowRight, GitBranch, Users, Brain, Clock, X } from 'lucide-react'
import { setRepoPath } from '../apis'

const HISTORY_KEY = 'git-insight-repo-history'
const MAX_HISTORY = 5

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveToHistory(path: string) {
  const history = getHistory().filter(p => p !== path)
  history.unshift(path)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function removeFromHistory(path: string) {
  const history = getHistory().filter(p => p !== path)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export default function HomePage() {
  const [repoPath, setRepoPathState] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!repoPath.trim()) return

    setLoading(true)
    setError('')

    try {
      await setRepoPath(repoPath.trim())
      saveToHistory(repoPath.trim())
      navigate('/file/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '无法打开仓库，请检查路径是否正确')
    } finally {
      setLoading(false)
    }
  }

  async function handleHistoryClick(path: string) {
    setRepoPathState(path)
    setLoading(true)
    setError('')
    try {
      await setRepoPath(path)
      saveToHistory(path)
      navigate('/file/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '无法打开仓库，请检查路径是否正确')
    } finally {
      setLoading(false)
    }
  }

  function handleRemoveHistory(e: React.MouseEvent, path: string) {
    e.stopPropagation()
    removeFromHistory(path)
    setHistory(getHistory())
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-45px)] px-4">
      {/* Hero Section */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <GitBranch className="h-10 w-10 text-[var(--color-brand)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          GitInsight AI
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md">
          输入本地 Git 仓库路径，即可开始探索代码历史。
          AI 帮你理解变更意图、发现风险、追踪函数演变。
        </p>
      </div>

      {/* Repo Path Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-lg mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPathState(e.target.value)}
              placeholder="D:\Projects\your-repo"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !repoPath.trim()}
            className="px-5 py-2.5 bg-[var(--color-brand)] hover:bg-[#4080ff] disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? '加载中...' : '开始分析'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
        )}
      </form>

      {/* Recent History */}
      {history.length > 0 && (
        <div className="w-full max-w-lg mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-muted)]">最近打开</span>
          </div>
          <div className="space-y-1">
            {history.map((path) => (
              <div
                key={path}
                onClick={() => handleHistoryClick(path)}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brand)] hover:bg-[var(--color-hover)] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="h-3.5 w-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">{path}</span>
                </div>
                <button
                  onClick={(e) => handleRemoveHistory(e, path)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-surface-2)] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
        <FeatureCard
          icon={<GitBranch className="h-6 w-6 text-[var(--color-brand)]" />}
          title="可视化时间线"
          description="文件修改历史、逐行归属、版本对比、修改热点"
        />
        <FeatureCard
          icon={<Brain className="h-6 w-6 text-[var(--color-purple)]" />}
          title="AI 智能分析"
          description="变更摘要、风险标记、函数演变追踪、自由对话"
        />
        <FeatureCard
          icon={<Users className="h-6 w-6 text-[var(--color-success)]" />}
          title="团队协作视角"
          description="知识分布图、Bus Factor 告警、协作模式"
        />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded-lg border border-[var(--color-border)] bg-white hover:shadow-sm transition-shadow">
      <div className="mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</p>
    </div>
  )
}
