/**
 * Skeleton loading components for better UX during data fetching.
 */

export function SkeletonLine({ width = '100%', className = '' }: { width?: string; className?: string }) {
  return (
    <div
      className={`h-4 rounded bg-[var(--color-skeleton)] animate-pulse ${className}`}
      style={{ width }}
    />
  )
}

export function SkeletonBlock({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  const widths = ['100%', '85%', '70%', '90%', '60%']
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  )
}

export function SkeletonTimeline({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 pl-10">
          <div className="flex-1 p-3 border border-[var(--color-border)] rounded-lg">
            <SkeletonLine width="80%" className="mb-2" />
            <div className="flex gap-3">
              <SkeletonLine width="60px" className="h-3" />
              <SkeletonLine width="50px" className="h-3" />
              <SkeletonLine width="40px" className="h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="p-4 border border-[var(--color-border)] rounded-lg">
      <SkeletonLine width="120px" className="mb-4 h-3" />
      <div className="flex items-end gap-2 h-48">
        {[60, 80, 45, 90, 30, 70, 55].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--color-skeleton)] animate-pulse rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonFileTree({ items = 8 }: { items?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
          <div className="w-4 h-4 rounded bg-[var(--color-skeleton)] animate-pulse" />
          <SkeletonLine width={`${50 + Math.random() * 40}%`} className="h-3.5" />
        </div>
      ))}
    </div>
  )
}
