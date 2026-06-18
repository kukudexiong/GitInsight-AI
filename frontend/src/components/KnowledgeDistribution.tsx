import { useState, useEffect } from 'react'
import { Loader2, Users, FolderTree } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getKnowledgeDistribution } from '../apis'

interface KnowledgeEntry {
  author_name: string
  files_owned: number
  lines_owned: number
}

interface Props {
  directory?: string
}

const COLORS = ['#165dff', '#00b42a', '#722ed1', '#f77234', '#0fc6c2', '#3491fa', '#9fdb1d', '#f5319d', '#ff7d00', '#14c9c9']

export default function KnowledgeDistribution({ directory = '' }: Props) {
  const [data, setData] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'lines' | 'files'>('lines')

  useEffect(() => {
    loadData()
  }, [directory])

  async function loadData() {
    setLoading(true)
    try {
      const result = await getKnowledgeDistribution(directory)
      setData(result.distribution || [])
    } catch (err) {
      console.error('Failed to load knowledge distribution:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <Loader2 className="h-8 w-8 text-[var(--color-brand)] animate-spin mb-3" />
        <p className="text-sm text-[var(--color-text-muted)]">正在分析知识分布...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-[var(--color-text-muted)]">
        <FolderTree className="h-10 w-10 opacity-40 mb-3" />
        <p className="text-sm">当前目录暂无可分析的代码文件</p>
      </div>
    )
  }

  const totalLines = data.reduce((sum, d) => sum + d.lines_owned, 0)
  const totalFiles = data.reduce((sum, d) => sum + d.files_owned, 0)

  const chartData = data.slice(0, 10).map((entry) => ({
    name: entry.author_name,
    lines: entry.lines_owned,
    files: entry.files_owned,
    linesPercent: Math.round((entry.lines_owned / totalLines) * 100),
    filesPercent: Math.round((entry.files_owned / totalFiles) * 100),
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[var(--color-text-muted)]" />
          <span className="text-sm text-[var(--color-text-muted)]">
            {directory || '根目录'} — {data.length} 位贡献者，{totalLines.toLocaleString()} 行代码
          </span>
        </div>
        <div className="flex gap-0.5 bg-[var(--color-surface-2)] rounded-md p-0.5">
          <button
            onClick={() => setViewMode('lines')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'lines' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'
            }`}
          >
            代码行数
          </button>
          <button
            onClick={() => setViewMode('files')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'files' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)]'
            }`}
          >
            文件数
          </button>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white mb-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 40 }}>
              <XAxis
                type="number"
                stroke="#c9cdd4"
                fontSize={11}
                tickFormatter={(v) => viewMode === 'lines' ? v.toLocaleString() : String(v)}
              />
              <YAxis type="category" dataKey="name" stroke="#86909c" fontSize={11} width={100} />
              <Tooltip
                formatter={(value: number) => [
                  viewMode === 'lines' ? `${value.toLocaleString()} 行` : `${value} 个文件`,
                  viewMode === 'lines' ? '代码行数' : '文件数'
                ]}
              />
              <Bar dataKey={viewMode === 'lines' ? 'lines' : 'files'} radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ownership Bar */}
      <div className="p-4 border border-[var(--color-border)] rounded-lg bg-white mb-4">
        <h4 className="text-xs font-medium text-[var(--color-text-muted)] mb-3">代码归属分布</h4>
        <div className="h-3 rounded-full overflow-hidden flex bg-[var(--color-surface-2)]">
          {chartData.map((entry, i) => {
            const percent = viewMode === 'lines' ? entry.linesPercent : entry.filesPercent
            return (
              <div
                key={entry.name}
                className="h-full"
                style={{ width: `${percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${entry.name}: ${percent}%`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {chartData.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-[var(--color-text-secondary)]">{entry.name}</span>
              <span className="text-xs text-[var(--color-text-faint)]">
                {viewMode === 'lines' ? `${entry.linesPercent}%` : `${entry.filesPercent}%`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">贡献者</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">代码行数</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">文件数</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">知识集中度</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((entry, i) => {
              const linesPercent = Math.round((entry.lines_owned / totalLines) * 100)
              const concentration = linesPercent > 50 ? 'high' : linesPercent > 25 ? 'medium' : 'normal'
              return (
                <tr key={entry.author_name} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-hover)]">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-[var(--color-text-primary)]">{entry.author_name}</span>
                    </div>
                  </td>
                  <td className="text-right text-sm text-[var(--color-text-secondary)] px-4 py-2.5 font-mono">
                    {entry.lines_owned.toLocaleString()}
                  </td>
                  <td className="text-right text-sm text-[var(--color-text-secondary)] px-4 py-2.5 font-mono">
                    {entry.files_owned}
                  </td>
                  <td className="text-right px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      concentration === 'high' ? 'bg-red-50 text-red-600 border border-red-200' :
                      concentration === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                      'bg-green-50 text-green-600 border border-green-200'
                    }`}>
                      {linesPercent}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
