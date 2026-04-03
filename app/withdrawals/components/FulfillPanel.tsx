'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { encodeFunctionData, getAddress } from 'viem'
import { VAULT_ASSET_ABI } from '@/lib/abis'
import { ASSET_METADATA } from '@/lib/contracts'
import { useProposeSafeTransaction } from '@/lib/safe/hooks'
import type { SafeInfo } from '@/lib/safe/types'
import type { Withdrawal } from '@/lib/vault-reader'

type Props = {
  selected: Withdrawal[]
  vaultAssetMap: Record<string, string>
  safeInfo: SafeInfo | undefined
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

export default function FulfillPanel({ selected, vaultAssetMap, safeInfo, onSuccess }: Props) {
  const { address, isConnected, chainId } = useAccount()

  // ── Direct EOA fulfill ──────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  })
  const isDirectSuccess = Boolean(txHash) && isTxSuccess

  useEffect(() => {
    if (isDirectSuccess) {
      const t = setTimeout(() => { reset(); onSuccess() }, 1000)
      return () => clearTimeout(t)
    }
  }, [isDirectSuccess, onSuccess, reset])

  // ── Safe propose ────────────────────────────────────────────────────────
  const proposeTx = useProposeSafeTransaction()

  if (selected.length === 0) return null

  // Checksum all addresses — Safe Transaction Service requires EIP-55 format
  const vaultAddress = getAddress(selected[0].vault) as `0x${string}`
  const assetAddr = vaultAssetMap[selected[0].vault]
  const meta = assetAddr ? ASSET_METADATA[assetAddr] : undefined

  const totalAmount = selected.reduce((sum, w) => sum + BigInt(w.assets), 0n)
  const controllers = selected.map((w) => getAddress(w.controller) as `0x${string}`)

  const isWrongChain = isConnected && chainId !== 999
  const isOwner = Boolean(address && safeInfo?.owners.some(
    (o) => o.toLowerCase() === address.toLowerCase(),
  ))

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleDirectFulfill() {
    reset()
    writeContract({
      address: vaultAddress,
      abi: VAULT_ASSET_ABI,
      functionName: 'fulfillRedeem',
      args: [totalAmount, controllers],
    })
  }

  function handleProposeSafe() {
    proposeTx.reset()
    const data = encodeFunctionData({
      abi: VAULT_ASSET_ABI,
      functionName: 'fulfillRedeem',
      args: [totalAmount, controllers],
    })
    proposeTx.mutate({ to: vaultAddress, data })
  }

  // ── Derived state for the direct-fulfill button ─────────────────────────

  let directLabel: string
  let directDisabled = false
  let directClass = 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200'

  if (!isConnected) {
    directLabel = 'Connect wallet'
    directDisabled = true
    directClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (isWrongChain) {
    directLabel = 'Wrong network'
    directDisabled = true
    directClass = 'bg-amber-100 text-amber-600 cursor-not-allowed dark:bg-amber-900/30 dark:text-amber-400'
  } else if (isWritePending) {
    directLabel = 'Confirm in wallet…'
    directDisabled = true
  } else if (isConfirming) {
    directLabel = 'Processing…'
    directDisabled = true
  } else if (isDirectSuccess) {
    directLabel = '✓ Fulfilled'
    directDisabled = true
    directClass = 'bg-green-600 text-white cursor-not-allowed'
  } else if (writeError) {
    directLabel = 'Failed — Retry'
    directClass = 'bg-red-600 text-white hover:bg-red-700'
  } else {
    directLabel = `Fulfill ${selected.length} Request${selected.length > 1 ? 's' : ''}`
  }

  // ── Derived state for the Safe-propose button ───────────────────────────

  let safeLabel: string
  let safeDisabled = false
  let safeClass = 'bg-blue-600 text-white hover:bg-blue-700'

  if (!isConnected) {
    safeLabel = 'Connect wallet'
    safeDisabled = true
    safeClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (isWrongChain) {
    safeLabel = 'Wrong network'
    safeDisabled = true
    safeClass = 'bg-amber-100 text-amber-600 cursor-not-allowed'
  } else if (!isOwner) {
    safeLabel = 'Not a Safe owner'
    safeDisabled = true
    safeClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (proposeTx.isPending) {
    safeLabel = 'Confirm in wallet…'
    safeDisabled = true
  } else if (proposeTx.isSuccess) {
    safeLabel = '✓ Proposed'
    safeDisabled = true
    safeClass = 'bg-green-600 text-white cursor-not-allowed'
  } else if (proposeTx.isError) {
    safeLabel = 'Failed — Retry'
    safeClass = 'bg-red-600 text-white hover:bg-red-700'
  } else {
    safeLabel = `Propose via Safe`
  }

  const isBusy = isWritePending || isConfirming || proposeTx.isPending

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white px-4 py-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-7xl items-center gap-4 flex-wrap">

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

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {/* Error messages — full text in tooltip, truncated on screen */}
          {writeError && (
            <span
              className="max-w-xs truncate text-xs text-red-600 dark:text-red-400 cursor-help"
              title={writeError.message}
            >
              {writeError.message}
            </span>
          )}
          {proposeTx.error && (
            <span
              className="max-w-xs truncate text-xs text-red-600 dark:text-red-400 cursor-help"
              title={proposeTx.error.message}
            >
              {proposeTx.error.message}
            </span>
          )}

          {/* Spinner */}
          {isBusy && (
            <svg className="h-4 w-4 animate-spin text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}

          {/* Success link to Safe Transactions page */}
          {proposeTx.isSuccess && (
            <Link
              href="/safe-transactions"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              View pending →
            </Link>
          )}

          {/* Propose via Safe (primary when wallet is a Safe owner) */}
          <button
            onClick={handleProposeSafe}
            disabled={safeDisabled}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${safeClass}`}
          >
            {safeLabel}
          </button>

          {/* Direct fulfill (secondary — for non-multisig operators) */}
          <button
            onClick={handleDirectFulfill}
            disabled={directDisabled}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${directClass}`}
          >
            {directLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
