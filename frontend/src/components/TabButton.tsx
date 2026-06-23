interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}

export default function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-[var(--color-brand)] text-[var(--color-brand)]'
          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 text-[11px] rounded-full ${
          active ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
        }`}>{count}</span>
      )}
    </button>
  )
}
