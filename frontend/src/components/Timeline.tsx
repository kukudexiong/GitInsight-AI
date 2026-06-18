import { Brain, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { getDiff } from '../apis'

interface CommitInfo {
  sha: string
  short_sha: string
  author_name: string
  author_email: string
  date: string
  timestamp: number
  message: string
}

interface HotspotInfo {
  start_line: number
  end_line: number
  modification_count: number
  last_modified_by: string
  last_modified_date: string
}

interface TimelineProps {
  commits: CommitInfo[]
  hotspots: HotspotInfo[]
  filePath: string
  onSummarize: (sha: string) => void
  aiLoading: boolean
}

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

export default function Timeline({ commits, hotspots, filePath, onSummarize, aiLoading }: TimelineProps) {
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])
  const [diffLoading, setDiffLoading] = useState(false)

  // Group commits by date
  const groupedByDate = commits.reduce<Record<string, CommitInfo[]>>((acc, commit) => {
    const date = commit.date.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(commit)
    return acc
  }, {})

  async function handleCommitClick(commit: CommitInfo) {
    if (expandedCommit === commit.sha) {
      setExpandedCommit(null)
      setDiffLines([])
      return
    }

    // Find the previous commit
    const idx = commits.findIndex(c => c.sha === commit.sha)
    if (idx < 0 || idx >= commits.length - 1) {
      // No previous commit to diff against
      setExpandedCommit(commit.sha)
      setDiffLines([])
      return
    }

    const prevCommit = commits[idx + 1]
    setExpandedCommit(commit.sha)
    setDiffLoading(true)

    try {
      // We need the file path - get it from the page context via URL
      // The diff API needs a file_path, we'll use a workaround:
      // commits are for a specific file, so we can extract from the API call
      const res = await getDiff(filePath, prevCommit.sha, commit.sha)
      if (res.diff) {
        setDiffLines(parseDiff(res.diff.diff_text))
      } else {
        setDiffLines([])
      }
    } catch {
      setDiffLines([])
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <div>
      {/* Hotspots Warning */}
      {hotspots.length > 0 && (
        <div className="mb-5 p-3.5 border border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-700">高频修改区域</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hotspots.slice(0, 5).map((h, i) => (
              <span key={i} className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-md border border-orange-200">
                L{h.start_line}-{h.end_line} ({h.modification_count}次修改)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[var(--color-border)]" />

        {Object.entries(groupedByDate).map(([date, dateCommits]) => (
          <div key={date} className="mb-5">
            {/* Date header */}
            <div className="relative flex items-center mb-2.5 pl-9">
              <span className="text-xs font-medium text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                {date}
              </span>
            </div>

            {/* Commits for this date */}
            {dateCommits.map((commit) => {
              const isExpanded = expandedCommit === commit.sha
              const idx = commits.findIndex(c => c.sha === commit.sha)
              const hasPrev = idx < commits.length - 1

              return (
                <div key={commit.sha} className="relative mb-2.5 pl-9">
                  {/* Dot on timeline */}
                  <div className={`absolute left-[11px] top-3.5 w-[9px] h-[9px] rounded-full border-2 ${
                    isExpanded ? 'bg-[var(--color-brand)] border-[var(--color-brand)]' : 'bg-white border-[var(--color-brand)]'
                  }`} />

                  {/* Commit card */}
                  <div className={`border rounded-lg transition-all ${
                    isExpanded ? 'border-[var(--color-brand)] shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-brand)]'
                  } bg-white group`}>
                    <div
                      className="flex items-start justify-between p-3 cursor-pointer"
                      onClick={() => hasPrev && handleCommitClick(commit)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--color-text-primary)]">{commit.message}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-[var(--color-text-muted)]">{commit.author_name}</span>
                          <code className="text-xs text-[var(--color-brand)] font-mono bg-[var(--color-brand-light)] px-1 py-0.5 rounded">{commit.short_sha}</code>
                          <span className="text-xs text-[var(--color-text-faint)]">
                            {new Date(commit.date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {hasPrev && (
                            <span className="text-xs text-[var(--color-text-faint)] flex items-center gap-0.5">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              diff
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Summarize button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onSummarize(commit.sha) }}
                        disabled={aiLoading}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1.5 rounded-md hover:bg-purple-50 text-[var(--color-text-muted)] hover:text-purple-600 transition-all"
                        title="AI 分析此次变更"
                      >
                        <Brain className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Inline Diff */}
                    {isExpanded && (
                      <div className="border-t border-[var(--color-border-light)]">
                        {diffLoading ? (
                          <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">加载 diff...</div>
                        ) : diffLines.length > 0 ? (
                          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                            <table className="w-full text-[11px] font-mono">
                              <tbody>
                                {diffLines.map((line, i) => {
                                  if (line.type === 'header') {
                                    return (
                                      <tr key={i} className="bg-blue-50">
                                        <td colSpan={3} className="px-3 py-0.5 text-[var(--color-brand)]">{line.content}</td>
                                      </tr>
                                    )
                                  }
                                  const bgColor = line.type === 'add' ? 'bg-[var(--color-diff-add-bg)]'
                                    : line.type === 'remove' ? 'bg-[var(--color-diff-del-bg)]' : ''
                                  const textColor = line.type === 'add' ? 'text-[var(--color-diff-add-text)]'
                                    : line.type === 'remove' ? 'text-[var(--color-diff-del-text)]'
                                    : 'text-[var(--color-text-secondary)]'
                                  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

                                  return (
                                    <tr key={i} className={bgColor}>
                                      <td className="w-8 text-right px-1.5 py-0 text-[var(--color-text-faint)] select-none">
                                        {line.type !== 'add' ? line.oldLineNum : ''}
                                      </td>
                                      <td className="w-8 text-right px-1.5 py-0 text-[var(--color-text-faint)] select-none border-r border-[var(--color-border-light)]">
                                        {line.type !== 'remove' ? line.newLineNum : ''}
                                      </td>
                                      <td className={`px-2 py-0 whitespace-pre ${textColor}`}>
                                        <span className="inline-block w-3">{marker}</span>{line.content}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-xs text-[var(--color-text-muted)]">无差异内容</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}


function parseDiff(text: string): DiffLine[] {
  if (!text) return []
  const lines = text.split('\n')
  const result: DiffLine[] = []
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLine = parseInt(match[1]) - 1
        newLine = parseInt(match[2]) - 1
      }
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      newLine++
      result.push({ type: 'add', content: line.substring(1), newLineNum: newLine })
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      oldLine++
      result.push({ type: 'remove', content: line.substring(1), oldLineNum: oldLine })
    } else if (!line.startsWith('+++') && !line.startsWith('---')) {
      oldLine++
      newLine++
      result.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line, oldLineNum: oldLine, newLineNum: newLine })
    }
  }
  return result
}
