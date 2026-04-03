'use client'

import { useAccount } from 'wagmi'
import { useConfirmSafeTransaction, useExecuteSafeTransaction } from '@/lib/safe/hooks'
import type { PendingSafeTx, SafeInfo } from '@/lib/safe/types'

type Props = {
  tx: PendingSafeTx
  safeInfo: SafeInfo | undefined
}

export default function SafeTxActions({ tx, safeInfo }: Props) {
  const { address, isConnected } = useAccount()
  const confirmTx = useConfirmSafeTransaction()
  const executeTx = useExecuteSafeTransaction()

  if (!isConnected || !address) {
    return (
      <p className="text-sm text-neutral-400">Connect your wallet to sign or execute.</p>
    )
  }

  const isOwner = safeInfo?.owners.some(
    (o) => o.toLowerCase() === address.toLowerCase(),
  ) ?? false

  if (!isOwner) {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Your connected wallet is not a Safe owner.
      </p>
    )
  }

  const hasSigned = tx.confirmations.some(
    (c) => c.owner.toLowerCase() === address.toLowerCase(),
  )

  const isConfirmBusy = confirmTx.isPending && confirmTx.variables?.safeTxHash === tx.safeTxHash
  const isExecuteBusy = executeTx.isPending && executeTx.variables?.safeTxHash === tx.safeTxHash

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sign */}
      {!hasSigned && !tx.isExecutable && (
        <button
          onClick={() => confirmTx.mutate({ safeTxHash: tx.safeTxHash })}
          disabled={isConfirmBusy}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isConfirmBusy ? 'Signing…' : 'Sign'}
        </button>
      )}

      {/* Already signed + waiting */}
      {hasSigned && !tx.isExecutable && (
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          ✓ Signed — waiting for {tx.confirmationsRequired - tx.confirmationsCount} more
        </span>
      )}

      {/* Execute (threshold met) */}
      {tx.isExecutable && (
        <button
          onClick={() => executeTx.mutate({ safeTxHash: tx.safeTxHash })}
          disabled={isExecuteBusy}
          className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExecuteBusy ? 'Executing…' : 'Execute'}
        </button>
      )}

      {/* Errors */}
      {confirmTx.isError && confirmTx.variables?.safeTxHash === tx.safeTxHash && (
        <span className="max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={confirmTx.error?.message}>
          {confirmTx.error?.message?.slice(0, 80)}
        </span>
      )}
      {executeTx.isError && executeTx.variables?.safeTxHash === tx.safeTxHash && (
        <span className="max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={executeTx.error?.message}>
          {executeTx.error?.message?.slice(0, 80)}
        </span>
      )}

      {/* Success */}
      {confirmTx.isSuccess && confirmTx.data?.safeTxHash === tx.safeTxHash && (
        <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Signature submitted</span>
      )}
      {executeTx.isSuccess && executeTx.data?.safeTxHash === tx.safeTxHash && (
        <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Transaction executed</span>
      )}
    </div>
  )
}
