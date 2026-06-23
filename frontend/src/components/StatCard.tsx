interface StatCardProps {
  label: string
  value: number | string
  color?: string
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-3 bg-white">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color || 'text-[var(--color-text-primary)]'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
