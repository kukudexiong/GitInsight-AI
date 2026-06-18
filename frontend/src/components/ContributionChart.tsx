import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface ContributionData {
  author_name: string
  author_email: string
  commit_count: number
  lines_owned: number
  percentage: number
}

interface Props {
  contributions: ContributionData[]
}

const COLORS = ['#165dff', '#00b42a', '#722ed1', '#f77234', '#0fc6c2', '#3491fa', '#9fdb1d', '#f5319d']

export default function ContributionChart({ contributions }: Props) {
  if (contributions.length === 0) {
    return <div className="text-center text-[var(--color-text-muted)] py-12 text-sm">暂无贡献数据</div>
  }

  return (
    <div>
      {/* Bar Chart */}
      <div className="mb-5 p-4 border border-[var(--color-border)] rounded-lg bg-white">
        <h3 className="text-xs font-medium text-[var(--color-text-muted)] mb-4">代码归属占比</h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contributions} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#c9cdd4" fontSize={11} />
              <YAxis type="category" dataKey="author_name" stroke="#86909c" fontSize={11} width={80} />
              <Tooltip formatter={(value: number) => [`${value}%`, '代码占比']} />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                {contributions.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">贡献者</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">代码行数</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">占比</th>
              <th className="text-right text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5">Commits</th>
              <th className="text-left text-xs font-medium text-[var(--color-text-muted)] px-4 py-2.5 w-32">可视化</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((contrib, i) => (
              <tr key={contrib.author_email} className="border-t border-[var(--color-border-light)] hover:bg-[var(--color-hover)]">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-[var(--color-text-primary)]">{contrib.author_name}</span>
                  </div>
                </td>
                <td className="text-right text-sm text-[var(--color-text-secondary)] px-4 py-2.5 font-mono">
                  {contrib.lines_owned}
                </td>
                <td className="text-right text-sm text-[var(--color-text-secondary)] px-4 py-2.5">
                  {contrib.percentage}%
                </td>
                <td className="text-right text-sm text-[var(--color-text-secondary)] px-4 py-2.5 font-mono">
                  {contrib.commit_count}
                </td>
                <td className="px-4 py-2.5">
                  <div className="w-full bg-[var(--color-surface-2)] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${contrib.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
