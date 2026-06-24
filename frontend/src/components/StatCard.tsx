interface StatCardProps {
  label: string
  value: number | string
  color?: string
  onClick?: () => void
}

export default function StatCard({ label, value, color, onClick }: StatCardProps) {
  return (
    <div
      className={`border border-[var(--color-border)] rounded-lg p-3 bg-white ${onClick ? 'cursor-pointer hover:border-[var(--color-brand)] hover:shadow-sm transition-all' : ''}`}
      onClick={onClick}
    >
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color || 'text-[var(--color-text-primary)]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
