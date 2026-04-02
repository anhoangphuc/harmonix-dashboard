'use client'

import { useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useConnection } from 'wagmi'
import { VAULT_ASSET_ABI } from '@/lib/abis'
import { ASSET_METADATA } from '@/lib/contracts'
import type { Withdrawal } from '@/lib/vault-reader'

type Props = {
  selected: Withdrawal[]
  vaultAssetMap: Record<string, string>
  onSuccess: () => void
}

function formatUnits(value: string, decimals: number): string {
  const bn = BigInt(value)
  if (bn === 0n) return '0'
  const divisor = 10n ** BigInt(decimals)
  const whole = bn / divisor
  const frac = bn % divisor
  if (frac === 0n) return whole.toLocaleString()
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '').slice(0, 4)
  return `${whole.toLocaleString()}.${fracStr}`
}

export default function FulfillPanel({ selected, vaultAssetMap, onSuccess }: Props) {
  const { isConnected, chainId } = useConnection()
  const { writeContract, data: txHash, isPending: isWritePending, error, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  })
  // Guard: only treat as confirmed if we actually submitted a tx
  const isSuccess = Boolean(txHash) && isTxSuccess

  // Auto-dismiss and refresh on confirmation
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        reset()
        onSuccess()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, onSuccess, reset])

  if (selected.length === 0) return null

  const vaultAddress = selected[0].vault as `0x${string}`
  const assetAddr = vaultAssetMap[selected[0].vault]
  const meta = assetAddr ? ASSET_METADATA[assetAddr] : undefined

  const totalAmount = selected.reduce((sum, w) => sum + BigInt(w.assets), 0n)
  const controllers = selected.map((w) => w.controller as `0x${string}`)

  const isWrongChain = isConnected && chainId !== 999

  function handleFulfill() {
    reset()
    writeContract({
      address: vaultAddress,
      abi: VAULT_ASSET_ABI,
      functionName: 'fulfillRedeem',
      args: [totalAmount, controllers],
    })
  }

  // Derive button label + disabled state
  let buttonLabel: string
  let buttonDisabled = false
  let buttonClass = 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'

  if (!isConnected) {
    buttonLabel = 'Connect wallet to fulfill'
    buttonDisabled = true
    buttonClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (isWrongChain) {
    buttonLabel = 'Wrong network'
    buttonDisabled = true
    buttonClass = 'bg-amber-100 text-amber-600 cursor-not-allowed dark:bg-amber-900/30 dark:text-amber-400'
  } else if (isWritePending) {
    buttonLabel = 'Confirm in wallet…'
    buttonDisabled = true
  } else if (isConfirming) {
    buttonLabel = 'Processing…'
    buttonDisabled = true
  } else if (isSuccess) {
    buttonLabel = '✓ Fulfilled'
    buttonDisabled = true
    buttonClass = 'bg-green-600 text-white cursor-not-allowed'
  } else if (error) {
    buttonLabel = 'Failed — Retry'
    buttonClass = 'bg-red-600 text-white hover:bg-red-700'
  } else {
    buttonLabel = `Fulfill ${selected.length} Request${selected.length > 1 ? 's' : ''}`
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        {/* Selection summary */}
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-neutral-900 dark:text-white">
            {selected.length} request{selected.length > 1 ? 's' : ''} selected
          </span>
          <span className="text-neutral-400">·</span>
          <span className="text-neutral-600 dark:text-neutral-300">
            Total:{' '}
            <span className="font-medium text-neutral-900 dark:text-white">
              {meta ? formatUnits(totalAmount.toString(), meta.decimals) : totalAmount.toString()}
              {meta && <span className="ml-1 text-neutral-500">{meta.symbol}</span>}
            </span>
          </span>
          {meta && (
            <>
              <span className="text-neutral-400">·</span>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {meta.symbol} vault
              </span>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Error message */}
          {error && (
            <span className="max-w-xs truncate text-xs text-red-600 dark:text-red-400" title={error.message}>
              {error.message.slice(0, 60)}…
            </span>
          )}

          {/* Spinner for processing state */}
          {(isWritePending || isConfirming) && (
            <svg
              className="h-4 w-4 animate-spin text-neutral-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}

          <button
            onClick={handleFulfill}
            disabled={buttonDisabled}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${buttonClass}`}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
