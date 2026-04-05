'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { encodeFunctionData, getAddress, parseUnits } from 'viem'
import { FUND_VAULT_ABI } from '@/lib/abis'
import { ASSET_METADATA } from '@/lib/contracts'
import { useProposeSafeTransaction } from '@/lib/safe/hooks'
import { useSafeInfo } from '@/lib/safe/hooks'
import { formatTokenAmount, truncateAddress } from '@/lib/format'
import type { StrategyPageData, AssetStrategySummary, StrategyData } from '@/lib/strategy-reader'

type Props = { data: StrategyPageData }

// ─── Action types ────────────────────────────────────────────────────────────

type ActionType = 'addStrategy' | 'removeStrategy' | 'setStrategyCap' | 'allocate' | 'deallocate'

const ACTION_LABELS: Record<ActionType, string> = {
  addStrategy: 'Add Strategy',
  removeStrategy: 'Remove Strategy',
  setStrategyCap: 'Set Cap',
  allocate: 'Allocate',
  deallocate: 'Deallocate',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategyClient({ data }: Props) {
  const { address, isConnected, chainId } = useAccount()
  const { data: safeInfo } = useSafeInfo()
  const proposeTx = useProposeSafeTransaction()

  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [strategyInput, setStrategyInput] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<string>(data.assets[0]?.asset ?? '')

  const isWrongChain = isConnected && chainId !== 999
  const isOwner = Boolean(
    address && safeInfo?.owners.some((o) => o.toLowerCase() === address.toLowerCase()),
  )
  const fundVaultAddress = getAddress(data.fundVaultAddress) as `0x${string}`

  // Find current asset context for decimals
  const currentAssetSummary = data.assets.find((a) => a.asset === selectedAsset)
  const currentDecimals = currentAssetSummary?.decimals ?? 18

  // All strategies flattened for select dropdown
  const allStrategies = data.assets.flatMap((a) => a.strategies)

  function handlePropose() {
    if (!activeAction) return
    proposeTx.reset()

    let calldata: `0x${string}`

    switch (activeAction) {
      case 'addStrategy':
        calldata = encodeFunctionData({
          abi: FUND_VAULT_ABI,
          functionName: 'addStrategy',
          args: [getAddress(strategyInput)],
        })
        break
      case 'removeStrategy':
        calldata = encodeFunctionData({
          abi: FUND_VAULT_ABI,
          functionName: 'removeStrategy',
          args: [getAddress(strategyInput)],
        })
        break
      case 'setStrategyCap':
        calldata = encodeFunctionData({
          abi: FUND_VAULT_ABI,
          functionName: 'setStrategyCap',
          args: [getAddress(strategyInput), parseUnits(amountInput, currentDecimals)],
        })
        break
      case 'allocate':
        calldata = encodeFunctionData({
          abi: FUND_VAULT_ABI,
          functionName: 'allocate',
          args: [getAddress(strategyInput), parseUnits(amountInput, currentDecimals)],
        })
        break
      case 'deallocate':
        calldata = encodeFunctionData({
          abi: FUND_VAULT_ABI,
          functionName: 'deallocate',
          args: [getAddress(strategyInput), parseUnits(amountInput, currentDecimals)],
        })
        break
    }

    proposeTx.mutate({ to: fundVaultAddress, data: calldata })
  }

  const needsAmount = activeAction === 'setStrategyCap' || activeAction === 'allocate' || activeAction === 'deallocate'
  const needsStrategySelect = activeAction === 'removeStrategy' || activeAction === 'setStrategyCap' || activeAction === 'allocate' || activeAction === 'deallocate'
  const needsStrategyInput = activeAction === 'addStrategy'

  // ── Safe button state ────────────────────────────────────────────────────
  let btnLabel: string
  let btnDisabled = false
  let btnClass = 'bg-blue-600 text-white hover:bg-blue-700'

  if (!isConnected) {
    btnLabel = 'Connect wallet'
    btnDisabled = true
    btnClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (isWrongChain) {
    btnLabel = 'Wrong network'
    btnDisabled = true
    btnClass = 'bg-amber-100 text-amber-600 cursor-not-allowed'
  } else if (!isOwner) {
    btnLabel = 'Not a Safe owner'
    btnDisabled = true
    btnClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (proposeTx.isPending) {
    btnLabel = 'Confirm in wallet...'
    btnDisabled = true
  } else if (proposeTx.isSuccess) {
    btnLabel = 'Proposed'
    btnDisabled = true
    btnClass = 'bg-green-600 text-white cursor-not-allowed'
  } else if (proposeTx.isError) {
    btnLabel = 'Failed - Retry'
    btnClass = 'bg-red-600 text-white hover:bg-red-700'
  } else {
    btnLabel = 'Propose via Safe'
  }

  return (
    <div className="space-y-8">
      {/* ── Asset Overview Cards ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-white">FundVault Capital Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.assets.map((a) => (
            <AssetCard key={a.asset} asset={a} />
          ))}
        </div>
      </section>

      {/* ── Strategies per Asset ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-white">Whitelisted Strategies</h2>
        {data.assets.map((a) => (
          <AssetStrategiesTable key={a.asset} asset={a} />
        ))}
        {data.assets.length === 0 && (
          <p className="text-sm text-neutral-500">No registered assets found.</p>
        )}
      </section>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-white">Strategy Actions</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
          {/* Action tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(ACTION_LABELS) as ActionType[]).map((action) => (
              <button
                key={action}
                onClick={() => {
                  setActiveAction(activeAction === action ? null : action)
                  setStrategyInput('')
                  setAmountInput('')
                  proposeTx.reset()
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeAction === action
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>

          {/* Form */}
          {activeAction && (
            <div className="space-y-4">
              {/* Asset selector (for context on decimals) */}
              {needsAmount && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Asset context (for decimals)
                  </label>
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  >
                    {data.assets.map((a) => (
                      <option key={a.asset} value={a.asset}>
                        {a.symbol} ({truncateAddress(a.asset)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Strategy address input (for addStrategy) */}
              {needsStrategyInput && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Strategy address
                  </label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={strategyInput}
                    onChange={(e) => setStrategyInput(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              )}

              {/* Strategy selector (for remove/cap/allocate/deallocate) */}
              {needsStrategySelect && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Strategy
                  </label>
                  <select
                    value={strategyInput}
                    onChange={(e) => setStrategyInput(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  >
                    <option value="">Select a strategy...</option>
                    {allStrategies.map((s) => {
                      const meta = ASSET_METADATA[s.asset]
                      return (
                        <option key={s.address} value={s.address}>
                          {truncateAddress(s.address)} - {s.description || 'No description'} ({meta?.symbol ?? '?'})
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {/* Amount input */}
              {needsAmount && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Amount ({currentAssetSummary?.symbol ?? 'tokens'})
                  </label>
                  <input
                    type="text"
                    placeholder="0.0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  />
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePropose}
                  disabled={btnDisabled || !strategyInput}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    !strategyInput
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
                      : btnClass
                  }`}
                >
                  {btnLabel}
                </button>

                {proposeTx.isPending && (
                  <svg className="h-4 w-4 animate-spin text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}

                {proposeTx.isSuccess && (
                  <Link
                    href="/safe-transactions"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View pending transactions
                  </Link>
                )}

                {proposeTx.error && (
                  <span
                    className="max-w-xs truncate text-xs text-red-600 dark:text-red-400 cursor-help"
                    title={proposeTx.error.message}
                  >
                    {proposeTx.error.message}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AssetCard({ asset }: { asset: AssetStrategySummary }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{asset.symbol}</span>
        <span className="text-xs text-neutral-400 font-mono">{truncateAddress(asset.asset)}</span>
      </div>
      <div className="space-y-2 text-sm">
        <Row label="Idle (FundVault)" value={formatTokenAmount(asset.idleAssets, asset.decimals)} symbol={asset.symbol} />
        <Row label="Deployed" value={formatTokenAmount(asset.deployedAssets, asset.decimals)} symbol={asset.symbol} />
        <Row label="Total Managed" value={formatTokenAmount(asset.totalManagedAssets, asset.decimals)} symbol={asset.symbol} highlight />
        <div className="pt-1 text-xs text-neutral-400">
          {asset.strategies.length} strateg{asset.strategies.length === 1 ? 'y' : 'ies'}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, symbol, highlight }: { label: string; value: string; symbol: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={highlight ? 'font-medium text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}>
        {value} <span className="text-neutral-400 text-xs">{symbol}</span>
      </span>
    </div>
  )
}

function AssetStrategiesTable({ asset }: { asset: AssetStrategySummary }) {
  if (asset.strategies.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {asset.symbol} Strategies
        </h3>
        <p className="text-sm text-neutral-400">No strategies registered.</p>
      </div>
    )
  }

  return (
    <div className="mb-6 overflow-x-auto">
      <h3 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {asset.symbol} Strategies
      </h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="pb-2 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Address</th>
            <th className="pb-2 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Description</th>
            <th className="pb-2 pr-4 text-right font-medium text-neutral-500 dark:text-neutral-400">Balance</th>
            <th className="pb-2 pr-4 text-right font-medium text-neutral-500 dark:text-neutral-400">Cap</th>
            <th className="pb-2 pr-4 text-right font-medium text-neutral-500 dark:text-neutral-400">Utilization</th>
            <th className="pb-2 pr-4 text-right font-medium text-neutral-500 dark:text-neutral-400">Total In</th>
            <th className="pb-2 text-right font-medium text-neutral-500 dark:text-neutral-400">Total Out</th>
          </tr>
        </thead>
        <tbody>
          {asset.strategies.map((s) => (
            <StrategyRow key={s.address} strategy={s} decimals={asset.decimals} symbol={asset.symbol} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StrategyRow({ strategy, decimals, symbol }: { strategy: StrategyData; decimals: number; symbol: string }) {
  const balance = BigInt(strategy.totalAssets)
  const cap = BigInt(strategy.cap)
  const utilization = cap > 0n ? Number((balance * 10000n) / cap) / 100 : 0

  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      <td className="py-2 pr-4 font-mono text-xs text-neutral-700 dark:text-neutral-300">
        {truncateAddress(strategy.address)}
      </td>
      <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-400">
        {strategy.description || '-'}
      </td>
      <td className="py-2 pr-4 text-right text-neutral-900 dark:text-white">
        {formatTokenAmount(strategy.totalAssets, decimals)}
        <span className="ml-1 text-xs text-neutral-400">{symbol}</span>
      </td>
      <td className="py-2 pr-4 text-right text-neutral-700 dark:text-neutral-300">
        {cap === 0n ? (
          <span className="text-red-500">Blocked</span>
        ) : (
          <>
            {formatTokenAmount(strategy.cap, decimals)}
            <span className="ml-1 text-xs text-neutral-400">{symbol}</span>
          </>
        )}
      </td>
      <td className="py-2 pr-4 text-right">
        <span
          className={
            utilization >= 90
              ? 'text-red-600 dark:text-red-400'
              : utilization >= 70
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-green-600 dark:text-green-400'
          }
        >
          {utilization.toFixed(1)}%
        </span>
      </td>
      <td className="py-2 pr-4 text-right text-neutral-500 dark:text-neutral-400 text-xs">
        {formatTokenAmount(strategy.totalAllocated, decimals)}
      </td>
      <td className="py-2 text-right text-neutral-500 dark:text-neutral-400 text-xs">
        {formatTokenAmount(strategy.totalDeallocated, decimals)}
      </td>
    </tr>
  )
}
