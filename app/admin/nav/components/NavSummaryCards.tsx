import { formatTokenAmount, formatDenomination } from '@/lib/format'
import type { NavPageData } from '@/lib/nav-reader'

type Props = { data: NavPageData }

function ppsDelta(live: string, stored: string): { pct: string; positive: boolean } | null {
  const l = BigInt(live)
  const s = BigInt(stored)
  if (s === 0n) return null
  const diff = l - s
  const pct = Number((diff * 10000n) / s) / 100
  return { pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, positive: pct >= 0 }
}

export default function NavSummaryCards({ data }: Props) {
  const delta = ppsDelta(data.livePpsValue, data.storedPps)

  const lastUpdatedDate = data.lastNavUpdated !== '0'
    ? new Date(Number(data.lastNavUpdated) * 1000).toLocaleString()
    : 'Never'

  const cards = [
    {
      label: 'Stored PPS',
      value: formatTokenAmount(data.storedPps, 18, 6),
      sub: `Last updated: ${lastUpdatedDate}`,
      warn: false,
    },
    {
      label: 'Live PPS',
      value: formatTokenAmount(data.livePpsValue, 18, 6),
      sub: delta
        ? <span className={delta.positive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>{delta.pct} vs stored</span>
        : 'vs stored PPS',
      warn: !data.liveIsValidPps,
    },
    {
      label: 'Gross NAV',
      value: formatDenomination(data.liveNavDenomination),
      sub: 'Total live NAV (denomination)',
      warn: false,
    },
    {
      label: 'Effective NAV',
      value: formatDenomination(data.liveEffNavDenomination),
      sub: 'After pending redemption deductions',
      warn: false,
    },
    {
      label: 'PPS Valid',
      value: data.liveIsValidPps ? '✓ Valid' : '⚠ Invalid',
      sub: data.liveIsValidPps ? 'Deviation within bounds' : 'Deviation exceeds threshold',
      warn: !data.liveIsValidPps,
    },
  ]

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
        NAV Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 transition-all duration-150 cursor-default ${
              card.warn
                ? 'border-yellow-200 bg-yellow-50 hover:border-yellow-400 dark:border-yellow-800 dark:bg-yellow-900/20 dark:hover:border-yellow-600'
                : 'border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:hover:bg-neutral-800'
            }`}
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {card.value}
            </p>
            <p className={`mt-1 text-xs ${card.warn ? 'font-medium text-yellow-700 dark:text-yellow-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
