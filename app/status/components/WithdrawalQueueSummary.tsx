import type { VaultOverviewData } from '@/lib/status-reader'
import { formatTokenAmount } from '@/lib/format'

const REDEEM_MODE_LABELS: Record<number, string> = {
  0: 'Global',
  1: 'Per Asset',
}

type Props = {
  queueLength: number
  redeemMode: number
  vaults: VaultOverviewData[]
}

export default function WithdrawalQueueSummary({
  queueLength,
  redeemMode,
  vaults,
}: Props) {
  // Sum redeemShares from each vault — these are the *currently pending* locked shares.
  // (getNavSnapshot().globalRedeemShares is a cumulative NAV accounting figure and
  //  includes already-fulfilled shares, so it should NOT be used here.)
  const lockedRedeemShares = vaults
    .reduce((sum, v) => sum + BigInt(v.redeemShares), 0n)
    .toString()

  // Per-vault pending and claimable rows
  const vaultRows = vaults.filter(
    (v) => BigInt(v.pendingAssets) > 0n || BigInt(v.claimableAssets) > 0n,
  )

  const cards = [
    {
      label: 'Queue Length',
      value: queueLength.toLocaleString(),
      sub: 'Total requests ever submitted',
    },
    {
      label: 'Locked Redeem Shares',
      value: formatTokenAmount(lockedRedeemShares, 18, 2),
      sub: 'Shares currently held pending fulfillment',
    },
    {
      label: 'Redeem Mode',
      value: REDEEM_MODE_LABELS[redeemMode] ?? `Unknown (${redeemMode})`,
      sub: 'Current withdrawal policy',
    },
  ]

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
        Withdrawal Queue
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{card.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Per-vault pending/claimable breakdown (only shown if there's something queued) */}
      {vaultRows.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left dark:border-neutral-700 dark:bg-neutral-800/50">
                {['Vault', 'Pending Assets', 'Claimable Assets', 'Locked Shares'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {vaultRows.map((v) => (
                <tr key={v.vault} className="bg-white dark:bg-neutral-900">
                  <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-white">
                    {v.symbol} Vault
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-yellow-600 dark:text-yellow-400">
                    {formatTokenAmount(v.pendingAssets, v.decimals, 4)} {v.symbol}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-blue-600 dark:text-blue-400">
                    {formatTokenAmount(v.claimableAssets, v.decimals, 4)} {v.symbol}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-neutral-600 dark:text-neutral-300">
                    {formatTokenAmount(v.redeemShares, 18, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
