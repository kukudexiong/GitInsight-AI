import { useState } from 'react'
import { X, Search, GitCommit, Users, Flame, AlertTriangle, Info } from 'lucide-react'
import type { DashboardOverview } from '../apis'

type DetailType = 'commits' | 'contributors' | 'hotfiles' | 'riskfiles'

interface Props {
  type: DetailType
  data: DashboardOverview
  onClose: () => void
  onFileClick?: (filePath: string) => void
}

export default function StatDetailModal({ type, data, onClose, onFileClick }: Props) {
  const [search, setSearch] = useState('')

  const config = getConfig(type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[680px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <config.icon className={`h-4.5 w-4.5 ${config.iconColor}`} />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-hover)] text-[var(--color-text-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {type === 'commits' && <CommitsDetail data={data} search={search} />}
          {type === 'contributors' && <ContributorsDetail data={data} search={search} />}
          {type === 'hotfiles' && <HotFilesDetail data={data} search={search} onFileClick={onFileClick} />}
          {type === 'riskfiles' && <RiskFilesDetail data={data} search={search} onFileClick={onFileClick} />}
        </div>
      </div>
    </div>
  )
}

function getConfig(type: DetailType) {
  switch (type) {
    case 'commits':
      return { title: '7天全部提交', icon: GitCommit, iconColor: 'text-[var(--color-text-primary)]', searchPlaceholder: '搜索提交信息或作者...' }
    case 'contributors':
      return { title: '活跃贡献者', icon: Users, iconColor: 'text-[var(--color-success)]', searchPlaceholder: '搜索贡献者...' }
    case 'hotfiles':
      return { title: '热点文件详情', icon: Flame, iconColor: 'text-[var(--color-warning)]', searchPlaceholder: '搜索文件名...' }
    case 'riskfiles':
      return { title: '高风险文件详情', icon: AlertTriangle, iconColor: 'text-[var(--color-danger)]', searchPlaceholder: '搜索文件名...' }
  }
}

// ==================== Commits Detail ====================
function CommitsDetail({ data, search }: { data: DashboardOverview; search: string }) {
  // Use all_commits_7d which contains ALL commits from the past 7 days
  const commits = data.all_commits_7d || data.recent_commits || []
  const filtered = commits.filter(c =>
    !search || c.message.toLowerCase().includes(search.toLowerCase()) || c.author_name.toLowerCase().includes(search.toLowerCase())
  )

  // Group by date
  const grouped: Record<string, typeof filtered> = {}
  for (const c of filtered) {
    const date = c.date.split('T')[0]
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(c)
  }

  const dates = Object.keys(grouped).sort().reverse()
  const [expandedSha, setExpandedSha] = useState<string | null>(null)
  const [changedFiles, setChangedFiles] = useState<Record<string, Array<{ path: string; change_type: string }>>>({})
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null)

  async function handleToggle(sha: string) {
    if (expandedSha === sha) {
      setExpandedSha(null)
      return
    }
    setExpandedSha(sha)
    // Lazy load changed files if not cached
    if (!changedFiles[sha]) {
      setLoadingFiles(sha)
      try {
        const { getCommitDetail } = await import('../apis')
        const detail = await getCommitDetail(sha)
        setChangedFiles(prev => ({ ...prev, [sha]: detail.changed_files || [] }))
      } catch {
        setChangedFiles(prev => ({ ...prev, [sha]: [] }))
      } finally {
        setLoadingFiles(null)
      }
    }
  }

  if (dates.length === 0) {
    return <EmptyState text="没有匹配的提交记录" />
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] text-[var(--color-text-muted)]">共 {filtered.length} 条提交 · 点击展开查看变更文件</p>
      {dates.map(date => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
            <span className="text-xs font-medium text-[var(--color-text-primary)]">{date}</span>
            <span className="text-xs text-[var(--color-text-muted)]">({grouped[date].length} 条)</span>
          </div>
          <div className="space-y-1 ml-2 border-l-2 border-[var(--color-border)] pl-3">
            {grouped[date].map(c => (
              <div key={c.sha}>
                <div
                  className="py-1.5 cursor-pointer hover:bg-[var(--color-hover)] -ml-3 pl-3 -mr-2 pr-2 rounded transition-colors"
                  onClick={() => handleToggle(c.sha)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[var(--color-text-primary)] leading-relaxed flex-1">{c.message}</p>
                    <code className="text-[10px] text-[var(--color-brand)] font-mono flex-shrink-0">{c.short_sha}</code>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-[var(--color-text-muted)]">{c.author_name}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{c.time_ago}</span>
                    {c.changed_files_count > 0 && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">{c.changed_files_count} 个文件</span>
                    )}
                    {c.is_merge && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">Merge</span>
                    )}
                  </div>
                </div>
                {/* Lazy loaded changed files */}
                {expandedSha === c.sha && (
                  <div className="ml-2 mt-1 mb-2">
                    {loadingFiles === c.sha ? (
                      <p className="text-[10px] text-[var(--color-text-muted)] py-1">加载中...</p>
                    ) : changedFiles[c.sha] && changedFiles[c.sha].length > 0 ? (
                      <div className="bg-[var(--color-surface)] rounded p-2 border border-[var(--color-border-light)]">
                        <div className="space-y-0.5">
                          {changedFiles[c.sha].map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px]">
                              <span className={`w-3 text-center font-mono font-bold ${
                                f.change_type === 'A' ? 'text-green-600' :
                                f.change_type === 'D' ? 'text-red-600' :
                                f.change_type === 'R' ? 'text-blue-600' :
                                'text-orange-500'
                              }`}>
                                {f.change_type === 'A' ? '+' : f.change_type === 'D' ? '−' : f.change_type === 'R' ? '→' : '•'}
                              </span>
                              <span className="text-[var(--color-text-secondary)] font-mono truncate">{f.path}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--color-text-muted)] py-1">无变更文件信息</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Contributors Detail ====================
function ContributorsDetail({ data, search }: { data: DashboardOverview; search: string }) {
  // Show ALL contributors (not just top 10)
  const contributors = data.top_contributors || []
  const filtered = contributors.filter(c =>
    !search || c.author_name.toLowerCase().includes(search.toLowerCase())
  )

  if (filtered.length === 0) {
    return <EmptyState text="没有匹配的贡献者" />
  }

  const maxCount = Math.max(...filtered.map(c => c.commit_count))
  const totalCommits = filtered.reduce((sum, c) => sum + c.commit_count, 0)

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[var(--color-text-muted)]">共 {filtered.length} 位活跃贡献者，合计 {totalCommits} 次提交</p>
      {filtered.map((c, i) => (
        <div key={c.author_name} className="flex items-center gap-3">
          {/* Rank */}
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
            i === 0 ? 'bg-yellow-100 text-yellow-700' :
            i === 1 ? 'bg-gray-100 text-gray-600' :
            i === 2 ? 'bg-orange-100 text-orange-600' :
            'bg-[var(--color-hover)] text-[var(--color-text-muted)]'
          }`}>
            {i + 1}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">{c.author_name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-[var(--color-text-muted)]">{((c.commit_count / totalCommits) * 100).toFixed(1)}%</span>
                <span className="text-xs text-[var(--color-brand)] font-medium">{c.commit_count} commits</span>
              </div>
            </div>
            {/* Bar */}
            <div className="h-1.5 bg-[var(--color-hover)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-brand)] rounded-full transition-all"
                style={{ width: `${(c.commit_count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Hot Files Detail ====================
function HotFilesDetail({ data, search, onFileClick }: { data: DashboardOverview; search: string; onFileClick?: (path: string) => void }) {
  const files = data.hot_files || []
  const filtered = files.filter(f =>
    !search || f.path.toLowerCase().includes(search.toLowerCase())
  )

  if (filtered.length === 0) {
    return <EmptyState text="没有匹配的热点文件" />
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-[var(--color-text-muted)] mb-2">共 {filtered.length} 个热点文件（7天内修改 3 次及以上）</p>

      {/* Header */}
      <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 px-2 py-1.5 text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-wide border-b border-[var(--color-border)]">
        <span>文件路径</span>
        <span className="text-center">修改次数</span>
        <span className="text-center">参与人数</span>
        <span className="text-center">贡献者</span>
      </div>

      {filtered.map((f, i) => (
        <div
          key={f.path}
          className={`grid grid-cols-[1fr_80px_80px_100px] gap-2 px-2 py-2 rounded-md hover:bg-[var(--color-hover)] ${onFileClick ? 'cursor-pointer' : ''} ${i % 2 === 0 ? '' : 'bg-[var(--color-hover)]/30'}`}
          onClick={() => onFileClick?.(f.path)}
        >
          <span className="text-xs text-[var(--color-text-secondary)] truncate" title={f.path}>{f.path}</span>
          <span className="text-xs text-[var(--color-warning)] font-medium text-center">{f.change_count}次</span>
          <span className="text-xs text-[var(--color-text-muted)] text-center">{f.author_count}人</span>
          <span className="text-[10px] text-[var(--color-text-muted)] text-center truncate" title={f.authors.join(', ')}>
            {f.authors.slice(0, 2).join(', ')}{f.authors.length > 2 ? '...' : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ==================== Risk Files Detail ====================
function RiskFilesDetail({ data, search, onFileClick }: { data: DashboardOverview; search: string; onFileClick?: (path: string) => void }) {
  const riskFiles = data.risk_files || []
  const silos = data.knowledge_silos || []

  const filteredRisk = riskFiles.filter(f =>
    !search || f.path.toLowerCase().includes(search.toLowerCase()) || f.owner.toLowerCase().includes(search.toLowerCase())
  )
  const filteredSilos = silos.filter(f =>
    !search || f.path.toLowerCase().includes(search.toLowerCase()) || f.sole_author.toLowerCase().includes(search.toLowerCase())
  )

  if (filteredRisk.length === 0 && filteredSilos.length === 0) {
    return <EmptyState text="没有匹配的风险文件" />
  }

  return (
    <div className="space-y-5">
      {/* Bus Factor Explanation */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-800 leading-relaxed">
          <strong>Bus Factor（巴士因子）</strong>是衡量项目风险的指标：如果某个关键成员突然离开（被巴士撞了），项目是否还能正常运转。
          Bus Factor = 1 意味着只有一个人了解这个文件，一旦此人不可用，将无人能维护。数值越高越安全。
        </div>
      </div>

      {/* High Risk Files */}
      {filteredRisk.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            高风险文件
            <span className="text-[10px] text-[var(--color-text-muted)] font-normal ml-1">（高频修改 + Bus Factor ≤ 1）</span>
          </h4>
          <div className="space-y-2">
            {filteredRisk.map(f => (
              <div
                key={f.path}
                className={`p-3 rounded-lg border border-red-200 bg-red-50/30 ${onFileClick ? 'cursor-pointer hover:border-red-300' : ''}`}
                onClick={() => onFileClick?.(f.path)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--color-text-primary)] font-medium truncate" title={f.path}>{f.path}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    f.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {f.risk_level === 'high' ? '高风险' : '中风险'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
                  <span>Bus Factor: <strong className="text-red-600">{f.bus_factor}</strong></span>
                  <span>7天内修改 {f.change_count} 次</span>
                  <span>唯一负责人: {f.owner}</span>
                </div>
                <p className="text-[10px] text-red-600/80 mt-1.5">
                  💡 建议: 增加代码审查，安排其他成员熟悉此文件
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Silos */}
      {filteredSilos.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-orange-700 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            知识孤岛
            <span className="text-[10px] text-[var(--color-text-muted)] font-normal ml-1">（7天内仅一人修改过）</span>
          </h4>
          <div className="space-y-1">
            {filteredSilos.map(f => (
              <div
                key={f.path}
                className={`flex items-center justify-between px-3 py-2 rounded-md hover:bg-orange-50 ${onFileClick ? 'cursor-pointer' : ''}`}
                onClick={() => onFileClick?.(f.path)}
              >
                <span className="text-xs text-[var(--color-text-secondary)] truncate flex-1 mr-3" title={f.path}>{f.path}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-orange-600">仅 {f.sole_author}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{f.change_count}次修改</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Empty State ====================
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-xs text-[var(--color-text-muted)]">
      {text}
    </div>
  )
}
