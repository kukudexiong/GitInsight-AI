import { Brain, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'

interface AISummary {
  summary?: string
  intent?: string
  risks?: string[]
  risk_level?: 'none' | 'low' | 'medium' | 'high'
  error?: string
  raw_response?: string
  parse_error?: boolean
}

interface Props {
  summary: AISummary | null
  loading: boolean
}

export default function AISummaryPanel({ summary, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[var(--color-purple)] animate-spin mb-3" />
        <p className="text-sm text-[var(--color-text-muted)]">AI 正在分析变更内容...</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-muted)]">
        <Brain className="h-10 w-10 opacity-40 mb-3" />
        <p className="text-sm">在时间线中点击 🧠 按钮，AI 将分析该次变更</p>
      </div>
    )
  }

  if (summary.error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-sm text-red-600">{summary.error}</p>
      </div>
    )
  }

  const riskConfig = {
    none: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: '无明显风险' },
    low: { icon: <Info className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: '低风险' },
    medium: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', label: '中风险' },
    high: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: '高风险' },
  }

  const risk = riskConfig[summary.risk_level || 'none']

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white">
        <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">变更摘要</h4>
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{summary.summary}</p>
      </div>

      {/* Intent */}
      {summary.intent && (
        <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white">
          <h4 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-2">变更意图</h4>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{summary.intent}</p>
        </div>
      )}

      {/* Risk Assessment */}
      <div className={`p-4 border rounded-lg ${risk.bg}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={risk.color}>{risk.icon}</span>
          <h4 className={`text-xs font-medium uppercase tracking-wide ${risk.color}`}>
            风险评估: {risk.label}
          </h4>
        </div>
        {summary.risks && summary.risks.length > 0 && (
          <ul className="space-y-1 mt-2">
            {summary.risks.map((r, i) => (
              <li key={i} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
                <span className="text-[var(--color-text-faint)] mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
