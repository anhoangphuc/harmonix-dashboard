'use client'

import { useState } from 'react'
import type { PendingSafeTx, SafeInfo } from '@/lib/safe/types'
import SafeTxDetail from './SafeTxDetail'

type Props = {
  transactions: PendingSafeTx[]
  safeInfo: SafeInfo | undefined
}

export default function SafeTxList({ transactions, safeInfo }: Props) {
  const [expandedHash, setExpandedHash] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isExpanded = expandedHash === tx.safeTxHash
        return (
          <div
            key={tx.safeTxHash}
            className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
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

              {/* Summary */}
              <span className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                {tx.summary}
              </span>

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
