import type { NavSnapshotData } from '@/lib/status-reader'
import { formatDenomination, formatTokenAmount } from '@/lib/format'

type Props = {
  navSnapshot: NavSnapshotData
  pricePerShare: string
}

export default function FundSummaryCards({ navSnapshot, pricePerShare }: Props) {
  const cards = [
    {
      label: 'Gross NAV',
      value: formatDenomination(navSnapshot.navDenomination),
      sub: 'Total NAV before redemption deductions',
      accent: false,
    },
    {
      label: 'Effective NAV',
      value: formatDenomination(navSnapshot.effNavDenomination),
      sub: 'Net of pending redemption obligations',
      accent: false,
    },
    {
      label: 'Price Per Share',
      value: formatTokenAmount(pricePerShare, 18, 6),
      sub: navSnapshot.isValidPps ? 'PPS is valid' : '⚠ PPS is invalid',
      accent: !navSnapshot.isValidPps,
      warn: !navSnapshot.isValidPps,
    },
    {
      label: 'Total Share Supply',
      value: formatTokenAmount(navSnapshot.totalSupply, 18, 2),
      sub: `${formatTokenAmount(navSnapshot.globalRedeemShares, 18, 2)} locked in redemptions`,
      accent: false,
    },
  ]

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
        Fund Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${
              card.warn
                ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
                : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
            }`}
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {card.value}
            </p>
            <p
              className={`mt-1 text-xs ${
                card.warn
                  ? 'font-medium text-yellow-700 dark:text-yellow-400'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {card.sub}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
