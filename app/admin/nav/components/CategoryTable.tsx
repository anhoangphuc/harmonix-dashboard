'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { encodeFunctionData, getAddress } from 'viem'
import { FUND_NAV_FEED_ABI } from '@/lib/abis'
import { FUND_NAV_FEED_ADDRESS } from '@/lib/contracts'
import { useProposeSafeTransaction } from '@/lib/safe/hooks'
import { formatTokenAmount } from '@/lib/format'
import type { NavCategoryData } from '@/lib/nav-reader'
import SyncNavForm from './SyncNavForm'
import AddCategoryForm from './AddCategoryForm'

export type Roles = {
  isConnected: boolean
  isSafeOwner: boolean
  safeHasPriceUpdater: boolean
  safeHasAdmin: boolean
}

type Props = {
  asset: string
  symbol: string
  decimals: number
  categories: NavCategoryData[]
  roles: Roles
}

type ActionState = { type: 'sync'; description: string } | { type: 'add' } | null

// ── Per-row actions: Toggle active / Remove (both Safe-only) ─────────────────
function CategoryRowActions({
  asset,
  category,
  roles,
  onSyncClick,
}: {
  asset: string
  category: NavCategoryData
  roles: Roles
  onSyncClick: () => void
}) {
  const { chainId } = useAccount()
  const feedAddress = getAddress(FUND_NAV_FEED_ADDRESS) as `0x${string}`
  const assetAddress = getAddress(asset) as `0x${string}`
  const isWrongChain = roles.isConnected && chainId !== 999

  const canProposePriceUpdater = roles.isConnected && !isWrongChain && roles.isSafeOwner && roles.safeHasPriceUpdater
  const canProposeAdmin = roles.isConnected && !isWrongChain && roles.isSafeOwner && roles.safeHasAdmin

  // Toggle status — separate proposeTx instance per row action
  const toggleTx = useProposeSafeTransaction()
  const removeTx = useProposeSafeTransaction()

  const [confirmRemove, setConfirmRemove] = useState(false)

  function handleToggle() {
    toggleTx.reset()
    const calldata = encodeFunctionData({
      abi: FUND_NAV_FEED_ABI,
      functionName: 'setCategoryStatus',
      args: [assetAddress, category.description, !category.isActive],
    })
    toggleTx.mutate({ to: feedAddress, data: calldata })
  }

  function handleRemoveSafe() {
    removeTx.reset()
    const calldata = encodeFunctionData({
      abi: FUND_NAV_FEED_ABI,
      functionName: 'removeNavCategory',
      args: [assetAddress, category.description],
    })
    removeTx.mutate({ to: feedAddress, data: calldata })
    setConfirmRemove(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sync button */}
      <button
        onClick={onSyncClick}
        disabled={!canProposePriceUpdater}
        title={!canProposePriceUpdater ? 'Safe requires PRICE_UPDATER_ROLE and you must be an owner' : undefined}
        className="rounded px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
      >
        Sync
      </button>

      {/* Toggle active — Safe propose */}
      <button
        onClick={handleToggle}
        disabled={!canProposeAdmin || toggleTx.isPending}
        title={!canProposeAdmin ? 'Safe requires DEFAULT_ADMIN_ROLE and you must be an owner' : undefined}
        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
          category.isActive
            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300'
            : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300'
        }`}
      >
        {toggleTx.isPending ? '…' : toggleTx.isSuccess ? '✓' : category.isActive ? 'Deactivate' : 'Activate'}
      </button>

      {/* Toggle error */}
      {toggleTx.isError && (
        <span className="text-xs text-red-500 cursor-help" title={toggleTx.error?.message}>
          Failed
        </span>
      )}

      {/* Remove — confirm then Safe propose */}
      {confirmRemove ? (
        <div className="flex items-center gap-1">
          <span className="text-xs text-red-600 dark:text-red-400">Remove?</span>
          <button
            onClick={handleRemoveSafe}
            disabled={removeTx.isPending}
            className="rounded px-2 py-1 text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            {removeTx.isPending ? '…' : 'Confirm'}
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="rounded px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          {removeTx.isSuccess && (
            <Link href="/safe-transactions" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              View →
            </Link>
          )}
          {removeTx.isError && (
            <span className="text-xs text-red-500 cursor-help" title={removeTx.error?.message}>
              Failed
            </span>
          )}
        </div>
      ) : (
        <button
          onClick={() => setConfirmRemove(true)}
          disabled={!canProposeAdmin}
          title={!canProposeAdmin ? 'Safe requires DEFAULT_ADMIN_ROLE and you must be an owner' : undefined}
          className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        >
          Remove
        </button>
      )}
    </div>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

export default function CategoryTable({ asset, symbol, decimals, categories, roles }: Props) {
  const [activeAction, setActiveAction] = useState<ActionState>(null)

  const canProposePriceUpdater = roles.isConnected && roles.isSafeOwner && roles.safeHasPriceUpdater
  const canProposeAdmin = roles.isConnected && roles.isSafeOwner && roles.safeHasAdmin

  if (categories.length === 0 && !canProposeAdmin) {
    return (
      <div className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
        No categories configured for this asset.
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Categories table */}
      {categories.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-neutral-100 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">NAV Value</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {categories.map((cat) => (
                <tr key={cat.description} className="bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50">
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {cat.description}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      cat.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cat.isActive ? 'bg-green-500' : 'bg-neutral-400'}`} />
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-900 dark:text-white">
                    {formatTokenAmount(cat.nav, decimals, 4)}
                    <span className="ml-1 text-xs text-neutral-400">{symbol}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <CategoryRowActions
                      asset={asset}
                      category={cat}
                      roles={roles}
                      onSyncClick={() =>
                        setActiveAction(
                          activeAction?.type === 'sync' && activeAction.description === cat.description
                            ? null
                            : { type: 'sync', description: cat.description },
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline sync form */}
      {activeAction?.type === 'sync' && (
        <SyncNavForm
          asset={asset}
          decimals={decimals}
          symbol={symbol}
          category={categories.find((c) => c.description === activeAction.description)!}
          canPropose={canProposePriceUpdater}
          isConnected={roles.isConnected}
          onClose={() => setActiveAction(null)}
        />
      )}

      {/* Add category */}
      {canProposeAdmin && (
        activeAction?.type === 'add' ? (
          <AddCategoryForm
            asset={asset}
            canPropose={canProposeAdmin}
            isConnected={roles.isConnected}
            onClose={() => setActiveAction(null)}
          />
        ) : (
          <button
            onClick={() => setActiveAction({ type: 'add' })}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-300"
          >
            <span>+</span> Add category
          </button>
        )
      )}
    </div>
  )
}
