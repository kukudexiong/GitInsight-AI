import { useState } from 'react'
import type { DashboardOverview, DashboardCommit } from '../apis'
import StatCard from './StatCard'
import CommitListItem from './CommitListItem'
import StatDetailModal from './StatDetailModal'

type DetailType = 'commits' | 'contributors' | 'hotfiles' | 'riskfiles'

interface Props {
  data: DashboardOverview
  onFileClick?: (filePath: string) => void
}

export default function DashboardInline({ data, onFileClick }: Props) {
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState<DetailType | null>(null)

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">项目健康概览</h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">最近 7 天的仓库活动与风险分析 · 左侧选择文件查看详情</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="7天提交" value={data.stats.total_commits_30d} onClick={() => setDetailModal('commits')} />
        <StatCard label="活跃贡献者" value={data.stats.active_authors} color="text-[var(--color-success)]" onClick={() => setDetailModal('contributors')} />
        <StatCard label="热点文件" value={data.stats.hot_files_count} color="text-[var(--color-warning)]" onClick={() => setDetailModal('hotfiles')} />
        <StatCard label="高风险文件" value={data.stats.risk_files_count} color="text-[var(--color-danger)]" onClick={() => setDetailModal('riskfiles')} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Hot Files */}
        <div
          className="border border-[var(--color-border)] rounded-lg p-4 bg-white cursor-pointer hover:border-[var(--color-warning)] hover:shadow-sm transition-all"
          onClick={() => setDetailModal('hotfiles')}
        >
          <h3 className="text-xs font-medium text-[var(--color-text-primary)] mb-3">🔥 热点文件</h3>
          <div className="space-y-1.5">
            {data.hot_files.slice(0, 6).map((f) => (
              <div key={f.path} className="flex items-center justify-between text-xs py-1">
                <span className="text-[var(--color-text-secondary)] truncate flex-1 mr-2">{f.path.split('/').slice(-2).join('/')}</span>
                <span className="text-[var(--color-warning)] font-medium flex-shrink-0">{f.change_count}次</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div
          className="border border-[var(--color-border)] rounded-lg p-4 bg-white cursor-pointer hover:border-[var(--color-success)] hover:shadow-sm transition-all"
          onClick={() => setDetailModal('contributors')}
        >
          <h3 className="text-xs font-medium text-[var(--color-text-primary)] mb-3">👥 活跃贡献者</h3>
          <div className="space-y-1.5">
            {data.top_contributors.slice(0, 6).map((c) => (
              <div key={c.author_name} className="flex items-center justify-between text-xs py-1">
                <span className="text-[var(--color-text-secondary)]">{c.author_name}</span>
                <span className="text-[var(--color-brand)] font-medium">{c.commit_count} commits</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk & Silos */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {data.risk_files && data.risk_files.length > 0 && (
          <div
            className="border border-red-200 rounded-lg p-4 bg-red-50/50 cursor-pointer hover:border-red-300 hover:shadow-sm transition-all"
            onClick={() => setDetailModal('riskfiles')}
          >
            <h3 className="text-xs font-medium text-red-700 mb-2">🔴 高风险文件</h3>
            <div className="space-y-1.5">
              {data.risk_files.slice(0, 4).map((f) => (
                <div key={f.path} className="text-xs">
                  <span className="text-[var(--color-text-secondary)] truncate">{f.path.split('/').pop()}</span>
                  <span className="text-red-600 ml-2">仅 {f.owner} · {f.change_count}次修改</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.knowledge_silos && data.knowledge_silos.length > 0 && (
          <div
            className="border border-orange-200 rounded-lg p-4 bg-orange-50/50 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all"
            onClick={() => setDetailModal('riskfiles')}
          >
            <h3 className="text-xs font-medium text-orange-700 mb-2">⚠️ 知识孤岛</h3>
            <div className="space-y-1.5">
              {data.knowledge_silos.slice(0, 4).map((f) => (
                <div key={f.path} className="text-xs">
                  <span className="text-[var(--color-text-secondary)] truncate">{f.path.split('/').pop()}</span>
                  <span className="text-orange-600 ml-2">仅 {f.sole_author}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Commits - GitLab Style */}
      {data.recent_commits && data.recent_commits.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-lg bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">📋 最近提交记录</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{data.recent_commits.length} 条提交</span>
          </div>
          <div className="divide-y divide-[var(--color-border-light)]">
            {data.recent_commits.slice(0, 20).map((commit: DashboardCommit) => (
              <CommitListItem
                key={commit.sha}
                commit={commit}
                expanded={expandedCommit === commit.sha}
                onToggle={() => setExpandedCommit(expandedCommit === commit.sha ? null : commit.sha)}
                onFileClick={onFileClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <StatDetailModal
          type={detailModal}
          data={data}
          onClose={() => setDetailModal(null)}
          onFileClick={(path) => {
            setDetailModal(null)
            onFileClick?.(path)
          }}
        />
      )}
    </div>
  )
}
