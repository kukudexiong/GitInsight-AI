import { useState, useEffect } from 'react'
import { ArrowRight, Plus, Minus, FileCode, GitCommit } from 'lucide-react'
import { getDiff, type CommitInfo } from '../apis'
import { parseDiff, type DiffLine } from '../utils/parseDiff'

interface Props {
  filePath: string
  commits: CommitInfo[]
}

export default function DiffView({ filePath, commits }: Props) {
  const [oldRef, setOldRef] = useState('')
  const [newRef, setNewRef] = useState('')
  const [parsedLines, setParsedLines] = useState<DiffLine[]>([])
  const [additions, setAdditions] = useState(0)
  const [deletions, setDeletions] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (commits.length >= 2 && !oldRef && !newRef) {
      setOldRef(commits[1].sha)
      setNewRef(commits[0].sha)
    }
  }, [commits])

  useEffect(() => {
    if (oldRef && newRef && oldRef !== newRef) {
      fetchDiff()
    }
  }, [oldRef, newRef])

  async function fetchDiff() {
    setLoading(true)
    setError('')
    try {
      const data = await getDiff(filePath, oldRef, newRef)
      if (data.diff) {
        setAdditions(data.diff.additions || 0)
        setDeletions(data.diff.deletions || 0)
        setParsedLines(parseDiff(data.diff.diff_text))
      } else {
        setParsedLines([])
        setAdditions(0)
        setDeletions(0)
        setError('这两个版本之间没有差异')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '获取 diff 失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Commit Selectors */}
      <div className="flex items-center gap-3 mb-4 p-3.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
        <div className="flex-1">
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">旧版本 (Base)</label>
          <select
            value={oldRef}
            onChange={(e) => setOldRef(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value="">选择 commit...</option>
            {commits.map((c) => (
              <option key={c.sha} value={c.sha}>
                {c.short_sha} - {c.author_name} - {c.message.substring(0, 40)}
              </option>
            ))}
          </select>
        </div>
        <ArrowRight className="h-5 w-5 text-[var(--color-text-faint)] mt-5 flex-shrink-0" />
        <div className="flex-1">
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">新版本 (Compare)</label>
          <select
            value={newRef}
            onChange={(e) => setNewRef(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-md text-sm text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-brand)]"
          >
            <option value="">选择 commit...</option>
            {commits.map((c) => (
              <option key={c.sha} value={c.sha}>
                {c.short_sha} - {c.author_name} - {c.message.substring(0, 40)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      {parsedLines.length > 0 && (
        <div className="flex items-center gap-4 mb-4 px-3.5 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
          <div className="flex items-center gap-1.5">
            <FileCode className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="text-sm text-[var(--color-text-secondary)]">{filePath.split('/').pop()}</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <Plus className="h-3 w-3" />
            <span className="text-sm font-mono">{additions}</span>
          </div>
          <div className="flex items-center gap-1 text-red-500">
            <Minus className="h-3 w-3" />
            <span className="text-sm font-mono">{deletions}</span>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">加载中...</div>}
      {error && <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">{error}</div>}

      {/* Diff Content */}
      {parsedLines.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <tbody>
                {parsedLines.map((line, i) => {
                  if (line.type === 'header') {
                    return (
                      <tr key={i} className="bg-blue-50">
                        <td colSpan={3} className="px-3 py-1 text-[var(--color-brand)] text-xs">
                          {line.content}
                        </td>
                      </tr>
                    )
                  }

                  const bgColor = line.type === 'add' ? 'bg-[var(--color-diff-add-bg)]'
                    : line.type === 'remove' ? 'bg-[var(--color-diff-del-bg)]' : ''

                  const textColor = line.type === 'add' ? 'text-[var(--color-diff-add-text)]'
                    : line.type === 'remove' ? 'text-[var(--color-diff-del-text)]'
                    : 'text-[var(--color-text-secondary)]'

                  const lineNumColor = line.type === 'add' ? 'text-green-600'
                    : line.type === 'remove' ? 'text-red-500' : 'text-[var(--color-text-faint)]'

                  const marker = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

                  return (
                    <tr key={i} className={bgColor}>
                      <td className={`w-10 text-right px-2 py-0 select-none border-r border-[var(--color-border-light)] ${lineNumColor}`}>
                        {line.type !== 'add' ? line.oldLineNum : ''}
                      </td>
                      <td className={`w-10 text-right px-2 py-0 select-none border-r border-[var(--color-border-light)] ${lineNumColor}`}>
                        {line.type !== 'remove' ? line.newLineNum : ''}
                      </td>
                      <td className={`px-3 py-0 whitespace-pre ${textColor}`}>
                        <span className={`inline-block w-4 ${lineNumColor}`}>{marker}</span>
                        {line.content}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && parsedLines.length === 0 && oldRef && newRef && (
        <div className="text-center py-12 text-[var(--color-text-muted)]">
          <GitCommit className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">选择两个不同的 commit 查看差异</p>
        </div>
      )}
    </div>
  )
}
