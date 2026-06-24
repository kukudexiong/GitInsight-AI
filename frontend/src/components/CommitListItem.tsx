import { getAuthorAvatar } from '../utils/getAuthorAvatar'
import type { DashboardCommit } from '../apis'

interface CommitListItemProps {
  commit: DashboardCommit
  expanded: boolean
  onToggle: () => void
  onFileClick?: (filePath: string) => void
}

export default function CommitListItem({ commit, expanded, onToggle, onFileClick }: CommitListItemProps) {
  const avatar = getAuthorAvatar(commit.author_name)

  return (
    <div className="group">
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-hover)] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Avatar */}
        <div
          className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white overflow-hidden"
          style={{ background: avatar.background }}
          title={commit.author_name}
        >
          <span className="absolute inset-0 bg-white/10" />
          <span className="relative text-white text-[11px] font-semibold tracking-wide">
            {avatar.initials}
          </span>
        </div>

        {/* Commit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-primary)] truncate font-medium">
              {commit.message}
            </span>
            {commit.is_merge && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-600 border border-purple-200 flex-shrink-0">
                Merge
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">{commit.author_name}</span>
            {commit.merge_source && (
              <>
                <span className="text-xs text-[var(--color-text-faint)]">·</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 font-mono">
                  {commit.merge_source}
                </span>
              </>
            )}
            {commit.changed_files_count > 0 && (
              <>
                <span className="text-xs text-[var(--color-text-faint)]">·</span>
                <span className="text-xs text-[var(--color-text-muted)]">{commit.changed_files_count} 个文件</span>
              </>
            )}
          </div>
        </div>

        {/* Right: sha + time */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <code className="text-xs text-[var(--color-brand)] bg-[var(--color-surface)] px-1.5 py-0.5 rounded font-mono">
            {commit.short_sha}
          </code>
          <span className="text-xs text-[var(--color-text-muted)] w-20 text-right">{commit.time_ago}</span>
        </div>
      </div>

      {/* Expanded: changed files */}
      {expanded && commit.changed_files.length > 0 && (
        <div className="px-4 pb-3 pl-14">
          <div className="bg-[var(--color-surface)] rounded-md p-2.5 border border-[var(--color-border-light)]">
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5 font-medium">变更文件：</p>
            <div className="space-y-1">
              {commit.changed_files.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs ${onFileClick ? 'cursor-pointer hover:text-[var(--color-brand)] hover:bg-[var(--color-hover)] -mx-1.5 px-1.5 py-0.5 rounded transition-colors' : ''}`}
                  onClick={(e) => {
                    if (onFileClick && f.change_type !== 'D') {
                      e.stopPropagation()
                      onFileClick(f.path)
                    }
                  }}
                >
                  <span className={`w-4 text-center font-mono font-bold flex-shrink-0 ${
                    f.change_type === 'A' ? 'text-green-600' :
                    f.change_type === 'D' ? 'text-red-600' :
                    f.change_type === 'R' ? 'text-blue-600' :
                    'text-orange-500'
                  }`}>
                    {f.change_type === 'A' ? '+' : f.change_type === 'D' ? '−' : f.change_type === 'R' ? '→' : '•'}
                  </span>
                  <span className="font-mono truncate">{f.path}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
