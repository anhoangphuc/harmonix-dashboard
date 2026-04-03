'use client'

import { usePendingSafeTransactions, useSafeInfo } from '@/lib/safe/hooks'
import { getSafeAddress } from '@/lib/safe/api-kit'
import type { PendingSafeTx, SafeInfo } from '@/lib/safe/types'
import SafeTxList from './SafeTxList'

export default function SafeTxClient() {
  const safeAddress = getSafeAddress()
  const { data, isLoading, error, refetch } = usePendingSafeTransactions()
  const { data: safeData } = useSafeInfo()

  const txs = data as PendingSafeTx[] | undefined
  const safeInfo = safeData as SafeInfo | undefined

  return (
    <div className="space-y-4">
      {/* Safe info banner */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-medium text-neutral-900 dark:text-white">Safe: </span>
            <code className="font-mono text-xs">{safeAddress}</code>
            {safeInfo && (
              <>
                <span className="mx-2 text-neutral-400">·</span>
                <span>Threshold: <strong>{safeInfo.threshold}/{safeInfo.owners.length}</strong></span>
                <span className="mx-2 text-neutral-400">·</span>
                <span>Nonce: <strong>{safeInfo.nonce}</strong></span>
              </>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to fetch pending transactions: {(error as Error).message}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && txs?.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-400">No pending Safe transactions.</p>
        </div>
      )}

      {/* List */}
      {!isLoading && !error && txs && txs.length > 0 && (
        <>
          <p className="text-sm text-neutral-500">
            <span className="font-medium text-neutral-900 dark:text-white">{txs.length}</span>{' '}
            pending transaction{txs.length !== 1 ? 's' : ''}
          </p>
          <SafeTxList transactions={txs} safeInfo={safeInfo} />
        </>
      )}
    </div>
  )
}
