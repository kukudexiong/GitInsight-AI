import { AlertTriangle, Shield, ShieldCheck } from 'lucide-react'

interface BusFactorData {
  path: string
  bus_factor: number
  top_contributors: { author_name: string; percentage: number; lines_owned: number }[]
  risk_level: 'high' | 'medium' | 'low'
}

interface Props {
  data: BusFactorData
}

export default function BusFactorBadge({ data }: Props) {
  const config = {
    high: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: '高风险',
    },
    medium: {
      icon: <Shield className="h-3.5 w-3.5" />,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      label: '中风险',
    },
    low: {
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: '低风险',
    },
  }

  const c = config[data.risk_level]

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${c.bg} ${c.border}`}>
      <span className={c.color}>{c.icon}</span>
      <span className={`text-xs font-medium ${c.color}`}>
        Bus Factor: {data.bus_factor}
      </span>
      <span className="text-xs text-[var(--color-text-muted)]">({c.label})</span>
    </div>
  )
}
