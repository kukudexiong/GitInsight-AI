import { useState } from 'react'
import { Search, Loader2, GitCommit, AlertTriangle, TrendingUp, Link } from 'lucide-react'
import { getFunctionEvolution } from '../apis'

interface Props {
  filePath: string
}

interface EvolutionResult {
  evolution_summary?: string
  changes?: { sha: string; description: string }[]
  cross_file_interactions?: string
  current_concerns?: string
  error?: string
  evolution?: any[]
  summary?: string
}

export default function FunctionEvolution({ filePath }: Props) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EvolutionResult | null>(null)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await getFunctionEvolution(filePath, keyword.trim())
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.response?.data?.detail || '分析失败' })
    } finally {
      setLoading(false)
    }
  }

  // Suggest relevant keywords based on file type
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const placeholder = ext === 'py' ? '函数名、类名、变量名、装饰器...'
    : ext === 'tsx' || ext === 'ts' ? '组件名、interface、hook、export...'
    : ext === 'css' || ext === 'scss' ? '选择器名、CSS变量...'
    : ext === 'json' || ext === 'yaml' ? '配置项 key...'
    : '任意关键字或代码片段...'

  return (
    <div>
      {/* Search Input */}
      <form onSubmit={handleSearch} className="mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[#4080ff] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '追踪'}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-text-faint)]">
          输入任意代码符号（函数、变量、类名、配置项等），AI 将追踪它在此文件中的变更历史
        </p>
      </form>

      {loading && (
        <div className="flex flex-col items-center py-12">
          <Loader2 className="h-8 w-8 text-[var(--color-purple)] animate-spin mb-3" />
          <p className="text-sm text-[var(--color-text-muted)]">AI 正在追踪变更历史...</p>
        </div>
      )}

      {result?.error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-600">{result.error}</p>
        </div>
      )}

      {result && !result.error && result.summary && (
        <div className="p-4 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
          <p className="text-sm text-[var(--color-text-muted)]">{result.summary}</p>
        </div>
      )}

      {result && result.evolution_summary && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-[var(--color-brand)]" />
              <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase">演变概述</h4>
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{result.evolution_summary}</p>
          </div>

          {/* Change Timeline */}
          {result.changes && result.changes.length > 0 && (
            <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white">
              <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase mb-3">变更记录</h4>
              <div className="relative pl-4 border-l-2 border-[var(--color-border)] space-y-3">
                {result.changes.map((change, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-[var(--color-brand)]" />
                    <div className="flex items-start gap-2">
                      <code className="text-xs text-[var(--color-brand)] font-mono flex-shrink-0">{change.sha}</code>
                      <p className="text-sm text-[var(--color-text-secondary)]">{change.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-file interactions */}
          {result.cross_file_interactions && (
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <Link className="h-4 w-4 text-blue-600" />
                <h4 className="text-xs font-medium text-blue-600 uppercase">跨文件关联</h4>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{result.cross_file_interactions}</p>
            </div>
          )}

          {/* Current Concerns */}
          {result.current_concerns && result.current_concerns !== '无' && (
            <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h4 className="text-xs font-medium text-orange-600 uppercase">潜在问题</h4>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">{result.current_concerns}</p>
            </div>
          )}
        </div>
      )}

      {!loading && !result && (
        <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
          <GitCommit className="h-10 w-10 opacity-40 mb-3" />
          <p className="text-sm">输入代码符号，追踪它在此文件中的完整变更历史</p>
          <p className="text-xs text-[var(--color-text-faint)] mt-1">支持：函数名、变量、类名、接口、配置项、CSS选择器等</p>
        </div>
      )}
    </div>
  )
}
