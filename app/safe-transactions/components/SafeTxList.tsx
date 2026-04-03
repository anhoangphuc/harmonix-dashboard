'use client'

import { useState } from 'react'
import { getSafeAddress } from '@/lib/safe/api-kit'
import type { PendingSafeTx, SafeInfo } from '@/lib/safe/types'
import SafeTxDetail from './SafeTxDetail'

type Props = {
  transactions: PendingSafeTx[]
  safeInfo: SafeInfo | undefined
}

function isRejectionTx(tx: PendingSafeTx, safeAddress: string): boolean {
  const hasEmptyData = !tx.data || tx.data === '0x'
  const toSelf = tx.to.toLowerCase() === safeAddress.toLowerCase()
  return hasEmptyData && toSelf
}

export default function SafeTxList({ transactions, safeInfo }: Props) {
  const [expandedHash, setExpandedHash] = useState<string | null>(null)
  const safeAddress = getSafeAddress()

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isExpanded = expandedHash === tx.safeTxHash
        const isRejection = isRejectionTx(tx, safeAddress)
        return (
          <div
            key={tx.safeTxHash}
            className={`overflow-hidden rounded-lg border bg-white dark:bg-neutral-900 ${
              isRejection
                ? 'border-red-200 dark:border-red-900'
                : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            {/* Summary row */}
            <button
              onClick={() => setExpandedHash(isExpanded ? null : tx.safeTxHash)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {/* Nonce badge */}
              <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                #{tx.nonce}
              </span>

              {/* Rejection label or decoded summary */}
              {isRejection ? (
                <span className="flex-1 truncate text-sm font-medium text-red-600 dark:text-red-400">
                  🚫 Cancellation of tx #{tx.nonce}
                </span>
              ) : (
                <span className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {tx.summary}
                </span>
              )}

              {/* Confirmation progress */}
              <span
                className={`shrink-0 text-xs font-semibold ${
                  tx.isExecutable
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {tx.confirmationsCount}/{tx.confirmationsRequired}
                {tx.isExecutable ? ' ✓ Ready' : ' signed'}
              </span>

              {/* Chevron */}
              <svg
                className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded detail */}
            {isExpanded && <SafeTxDetail tx={tx} safeInfo={safeInfo} />}
          </div>
        )
      })}
    </div>
  )
}

