import { useState, useEffect, useMemo, useRef } from 'react'
import { User, Clock, GitCommit } from 'lucide-react'
import { getFileBlame } from '../apis'
import Minimap from './Minimap'

interface BlameEntry {
  commit_sha: string
  short_sha: string
  author_name: string
  author_email: string
  date: string
  timestamp: number
  message: string
  start_line: number
  end_line: number
  content: string[]
}

interface Props {
  filePath: string
  onSummarize?: (sha: string) => void
}

const AUTHOR_COLORS = [
  '#165dff', '#00b42a', '#722ed1', '#f77234', '#0fc6c2',
  '#3491fa', '#7ee787', '#9fdb1d', '#f5319d', '#ff7d00',
]

export default function BlameView({ filePath }: Props) {
  const [entries, setEntries] = useState<BlameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null)
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [totalLines, setTotalLines] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollMeta, setScrollMeta] = useState({ visibleHeight: 550, totalHeight: 550 })

  useEffect(() => {
    loadBlame()
  }, [filePath])

  // Track scroll container dimensions
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      setScrollMeta({ visibleHeight: el.clientHeight, totalHeight: el.scrollHeight })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [entries])

  async function loadBlame() {
    setLoading(true)
    try {
      const data = await getFileBlame(filePath)
      setEntries(data.entries || [])
      setTotalLines(data.total_lines || 0)
    } catch (err) {
      console.error('Failed to load blame:', err)
    } finally {
      setLoading(false)
    }
  }

  const authorColorMap = useMemo(() => {
    const authors = [...new Set(entries.map(e => e.author_name))]
    const map: Record<string, string> = {}
    authors.forEach((author, i) => {
      map[author] = AUTHOR_COLORS[i % AUTHOR_COLORS.length]
    })
    return map
  }, [entries])

  const uniqueAuthors = useMemo(() => {
    const authorMap: Record<string, { name: string; lines: number }> = {}
    for (const entry of entries) {
      const lineCount = entry.end_line - entry.start_line + 1
      if (!authorMap[entry.author_name]) {
        authorMap[entry.author_name] = { name: entry.author_name, lines: 0 }
      }
      authorMap[entry.author_name].lines += lineCount
    }
    return Object.values(authorMap).sort((a, b) => b.lines - a.lines)
  }, [entries])

  // Build minimap data from blame entries
  const minimapLines = useMemo(() => {
    const result: Array<{ color?: string; textColor?: string; indent: number; hasContent: boolean }> = []
    for (const entry of entries) {
      const color = authorColorMap[entry.author_name]
      for (const line of entry.content) {
        const trimmed = line.replace(/^\s+/, '')
        const indent = Math.min(20, line.length - trimmed.length)
        result.push({
          color,
          textColor: trimmed.startsWith('#') || trimmed.startsWith('//') ? '#6a9955' : undefined,
          indent,
          hasContent: trimmed.length > 0,
        })
      }
    }
    return result
  }, [entries, authorColorMap])

  if (loading) {
    return <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">加载 Blame 数据中...</div>
  }

  if (entries.length === 0) {
    return <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">暂无 Blame 数据</div>
  }

  return (
    <div>
      {/* Author Legend / Filter */}
      <div className="mb-4 p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-[var(--color-text-muted)]">
            作者筛选 · 共 {totalLines.toLocaleString()} 行
          </h4>
          {selectedAuthor && (
            <button onClick={() => setSelectedAuthor(null)} className="text-xs text-[var(--color-brand)] hover:underline">
              清除筛选
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueAuthors.map((author) => (
            <button
              key={author.name}
              onClick={() => setSelectedAuthor(selectedAuthor === author.name ? null : author.name)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border transition-all ${
                selectedAuthor === author.name
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]'
                  : selectedAuthor && selectedAuthor !== author.name
                  ? 'opacity-40 border-transparent'
                  : 'border-transparent hover:bg-[var(--color-hover)]'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: authorColorMap[author.name] }} />
              <span className="text-[var(--color-text-secondary)]">{author.name}</span>
              <span className="text-[var(--color-text-faint)]">{author.lines}行</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mini heatmap bar */}
      <div className="mb-4 h-2.5 rounded-full overflow-hidden flex bg-[var(--color-surface-2)]">
        {entries.map((entry, i) => {
          const widthPercent = ((entry.end_line - entry.start_line + 1) / totalLines) * 100
          const isHighlighted = !selectedAuthor || selectedAuthor === entry.author_name
          return (
            <div
              key={i}
              className="h-full transition-opacity"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: authorColorMap[entry.author_name],
                opacity: isHighlighted ? 0.75 : 0.15,
              }}
              title={`${entry.author_name}: L${entry.start_line}-${entry.end_line}`}
            />
          )
        })}
      </div>

      {/* Blame Code View + Minimap */}
      <div className="flex gap-2">
        {/* Code table */}
        <div className="flex-1 border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div ref={scrollRef} className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <tbody>
                {entries.map((entry, entryIdx) => {
                  const isFiltered = selectedAuthor && selectedAuthor !== entry.author_name
                  const isHovered = hoveredCommit === entry.commit_sha

                  return entry.content.map((line, lineIdx) => {
                    const lineNum = entry.start_line + lineIdx
                    const isFirstLine = lineIdx === 0
                    const authorColor = authorColorMap[entry.author_name]

                    return (
                      <tr
                        key={`${entryIdx}-${lineIdx}`}
                        className={`${isHovered ? 'bg-blue-50' : ''} ${isFiltered ? 'opacity-25' : ''} transition-opacity`}
                        onMouseEnter={() => setHoveredCommit(entry.commit_sha)}
                        onMouseLeave={() => setHoveredCommit(null)}
                      >
                        {/* Color indicator */}
                        <td className="w-1 p-0">
                          <div className="w-1 h-full min-h-[20px]" style={{ backgroundColor: authorColor }} />
                        </td>

                        {/* Blame info */}
                        <td className="w-48 px-2 py-0 border-r border-[var(--color-border-light)] whitespace-nowrap bg-[var(--color-surface)]">
                          {isFirstLine ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--color-text-muted)] truncate max-w-[70px]" title={entry.author_name}>
                                {entry.author_name}
                              </span>
                              <code className="text-[var(--color-brand)] text-[10px]">{entry.short_sha}</code>
                              <span className="text-[var(--color-text-faint)] text-[10px]">
                                {formatRelativeDate(entry.date)}
                              </span>
                            </div>
                          ) : null}
                        </td>

                        {/* Line number */}
                        <td className="w-10 text-right px-2 py-0 text-[var(--color-text-faint)] select-none border-r border-[var(--color-border-light)]">
                          {lineNum}
                        </td>

                        {/* Code content */}
                        <td className="px-3 py-0 whitespace-pre text-[var(--color-text-secondary)]">
                          {line}
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Minimap */}
        <Minimap
          lines={minimapLines}
          containerRef={scrollRef}
          visibleHeight={scrollMeta.visibleHeight}
          totalHeight={scrollMeta.totalHeight}
        />
      </div>

      {/* Commit Detail Footer */}
      {hoveredCommit && (
        <div className="mt-3 p-2.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
          {(() => {
            const entry = entries.find(e => e.commit_sha === hoveredCommit)
            if (!entry) return null
            return (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <GitCommit className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <code className="text-[var(--color-brand)]">{entry.short_sha}</code>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-secondary)]">{entry.author_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-[var(--color-text-muted)]">{new Date(entry.date).toLocaleString('zh-CN')}</span>
                </div>
                <span className="text-[var(--color-text-secondary)] truncate">{entry.message}</span>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}月前`
  return `${Math.floor(diffDays / 365)}年前`
}
