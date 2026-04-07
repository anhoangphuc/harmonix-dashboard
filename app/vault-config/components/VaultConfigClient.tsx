'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { encodeFunctionData, getAddress } from 'viem'
import { HA_BASE_ABI, VAULT_MANAGER_ADMIN_ABI } from '@/lib/abis'
import { useProposeSafeTransaction, useRoleCheck } from '@/lib/safe/hooks'
import { TIMELOCKED_FUNCTIONS } from '@/lib/timelocks-reader'
import type { PendingOperation } from '@/lib/timelocks-reader'
import { getVaultConfigData } from '@/lib/vault-config-reader'
import type { VaultConfigData } from '@/lib/vault-config-reader'

// ── Types ─────────────────────────────────────────────────────────────────────

type SetterFnName = 'setAccessManager' | 'setShareToken' | 'setFundVault' | 'setFeeReceiver'

type SetterDef = {
  fnName: SetterFnName
  label: string
  currentValue: (data: VaultConfigData) => string | null
  argLabel: string
}

const SETTERS: SetterDef[] = [
  {
    fnName: 'setAccessManager',
    label: 'Access Manager',
    currentValue: (d) => d.accessManager,
    argLabel: 'New access manager address',
  },
  {
    fnName: 'setShareToken',
    label: 'Share Token',
    currentValue: (d) => d.shareToken,
    argLabel: 'New share token address',
  },
  {
    fnName: 'setFundVault',
    label: 'Fund Vault',
    currentValue: (d) => d.fundVaultAddress,
    argLabel: 'New fund vault address',
  },
  {
    fnName: 'setFeeReceiver',
    label: 'Fee Receiver',
    currentValue: (d) => d.feeConfig.feeReceiver,
    argLabel: 'New fee receiver address',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0s'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

function formatCountdown(executableAt: string): string {
  const diff = Number(executableAt) * 1000 - Date.now()
  if (diff <= 0) return 'Ready to execute'
  const totalSecs = Math.ceil(diff / 1000)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const parts: string[] = []
  if (d) parts.push(`${d}d`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || parts.length === 0) parts.push(`${s}s`)
  return `Executable in ${parts.join(' ')}`
}

/** Formats a WAD-scaled rate (1e18 = 100%) as a percentage string. */
function formatWadRate(raw: string): string {
  if (!raw || raw === '0') return '0%'
  try {
    const pct = (Number(BigInt(raw)) / 1e18) * 100
    return `${pct.toFixed(2).replace(/\.00$/, '')}%`
  } catch {
    return raw
  }
}

/** Formats a unix timestamp as a locale date string, or "Never" if 0. */
function formatTimestamp(raw: string): string {
  if (!raw || raw === '0') return 'Never'
  try {
    return new Date(Number(raw) * 1000).toLocaleString()
  } catch {
    return raw
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="font-mono text-neutral-900 dark:text-neutral-100" title={value}>
        {value ? truncate(value) : '—'}
      </span>
    </div>
  )
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-neutral-900 dark:text-neutral-100">{value || '—'}</span>
    </div>
  )
}

// ── Setter card ───────────────────────────────────────────────────────────────

type SetterCardProps = {
  def: SetterDef
  data: VaultConfigData
  safeAddress?: `0x${string}`
  isSafeOwner: boolean
  hasRole: boolean
}

function SetterCard({ def, data, safeAddress, isSafeOwner, hasRole }: SetterCardProps) {
  const { isConnected, chainId } = useAccount()
  const proposeTx = useProposeSafeTransaction(safeAddress)
  const [addressArg, setAddressArg] = useState('')

  const isWrongChain = isConnected && chainId !== 999
  const fnTimelockDef = TIMELOCKED_FUNCTIONS.find((f) => f.name === def.fnName)
  const durationSeconds = Number(data.timelockDurations[def.fnName] ?? '0')

  const pendingOp: PendingOperation | undefined = data.pendingOps.find(
    (op) => op.fnName === def.fnName,
  )

  const currentValue = def.currentValue(data)

  let encodedInner: `0x${string}` | null = null
  try {
    if (addressArg) {
      const addr = getAddress(addressArg)
      encodedInner = encodeFunctionData({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: VAULT_MANAGER_ADMIN_ABI as any,
        functionName: def.fnName,
        args: [addr],
      })
    }
  } catch {
    encodedInner = null
  }

  function handlePropose() {
    if (!encodedInner || !data.vaultManagerAdminAddress) return
    proposeTx.reset()
    const calldata = encodeFunctionData({
      abi: HA_BASE_ABI,
      functionName: 'submit',
      args: [encodedInner],
    })
    proposeTx.mutate({
      to: getAddress(data.vaultManagerAdminAddress),
      data: calldata,
    })
  }

  const canPropose = Boolean(encodedInner && fnTimelockDef)

  // button state machine
  let btnLabel: string
  let btnDisabled = false
  let btnClass = 'bg-blue-600 text-white hover:bg-blue-700'

  if (!isConnected) {
    btnLabel = 'Connect wallet'; btnDisabled = true
    btnClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (isWrongChain) {
    btnLabel = 'Wrong network'; btnDisabled = true
    btnClass = 'bg-amber-100 text-amber-600 cursor-not-allowed'
  } else if (!isSafeOwner) {
    btnLabel = 'Not a Safe owner'; btnDisabled = true
    btnClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (!hasRole) {
    btnLabel = 'Safe lacks DEFAULT_ADMIN_ROLE'; btnDisabled = true
    btnClass = 'bg-neutral-200 text-neutral-400 cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-500'
  } else if (proposeTx.isPending) {
    btnLabel = 'Confirm in wallet...'; btnDisabled = true
  } else if (proposeTx.isSuccess) {
    btnLabel = 'Proposed'; btnDisabled = true
    btnClass = 'bg-green-600 text-white cursor-not-allowed'
  } else if (proposeTx.isError) {
    btnLabel = 'Failed — Retry'
    btnClass = 'bg-red-600 text-white hover:bg-red-700'
  } else {
    btnLabel = 'Propose via Safe'
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
          {def.label}
        </h3>
        <div className="flex items-center gap-2">
          {durationSeconds > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Timelocked · {formatDuration(durationSeconds)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              No delay set
            </span>
          )}
        </div>
      </div>

      {/* Current value */}
      <div className="mb-4 text-xs">
        <span className="text-neutral-500 dark:text-neutral-400">Current: </span>
        {currentValue ? (
          <span className="font-mono text-neutral-700 dark:text-neutral-300" title={currentValue}>
            {truncate(currentValue)}
          </span>
        ) : (
          <span className="italic text-neutral-400 dark:text-neutral-500">no on-chain getter</span>
        )}
      </div>

      {/* Pending operation */}
      {pendingOp && (
        <div className={`mb-4 rounded-md px-3 py-2 text-xs ${
          pendingOp.isReady
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        }`}>
          <span className="font-medium">Pending operation: </span>
          {pendingOp.isReady ? 'Ready to execute' : formatCountdown(pendingOp.executableAt)}
        </div>
      )}

      {/* Input */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
          {def.argLabel}
        </label>
        <input
          type="text"
          placeholder="0x..."
          value={addressArg}
          onChange={(e) => { setAddressArg(e.target.value); proposeTx.reset() }}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-mono dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      {/* Preview */}
      {encodedInner && (
        <div className="mb-4 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800">
          <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Preview</p>
          <p className="text-xs text-neutral-700 dark:text-neutral-300">
            <span className="font-medium">submit(</span>
            <span className="font-mono">{def.fnName}({truncate(addressArg)})</span>
            <span className="font-medium">)</span>
            {' → '}
            <span className="font-mono text-neutral-500">{truncate(data.vaultManagerAdminAddress)}</span>
          </p>
          {durationSeconds > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Executable after {formatDuration(durationSeconds)} delay
            </p>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePropose}
          disabled={btnDisabled || !canPropose}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            !canPropose
              ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
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
          <Link href="/safe-transactions" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            View pending transactions
          </Link>
        )}

        {proposeTx.error && (
          <span
            className="max-w-xs cursor-help truncate text-xs text-red-600 dark:text-red-400"
            title={proposeTx.error.message}
          >
            {proposeTx.error.message}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VaultConfigClient() {
  const { safeAddress, isSafeOwner, hasRole } = useRoleCheck('admin')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vault-config'],
    queryFn: getVaultConfigData,
    refetchInterval: 300_000,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Loading configuration…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load vault configuration.{' '}
        {error instanceof Error ? error.message : 'Unknown error.'}
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ── Contract Addresses ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
          Contract Addresses
        </h2>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          <AddressRow label="VaultManager"       value={data.vaultManagerAddress} />
          <AddressRow label="VaultManagerAdmin"  value={data.vaultManagerAdminAddress} />
          <AddressRow label="Access Manager"     value={data.accessManager} />
          <AddressRow label="Share Token"        value={data.shareToken} />
          <AddressRow label="Fund Vault"         value={data.fundVaultAddress} />
          <AddressRow label="Request Manager"    value={data.requestManager} />
          <AddressRow label="Price Feed"         value={data.priceFeed} />
          <AddressRow label="Fund NAV"           value={data.fundNav} />
        </div>
      </section>

      {/* ── Fee Configuration ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
          Fee Configuration
        </h2>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          <AddressRow label="Fee Receiver"               value={data.feeConfig.feeReceiver} />
          <ValueRow   label="Management Fee Rate"        value={formatWadRate(data.feeConfig.managementFeeRate)} />
          <ValueRow   label="Performance Fee Rate"       value={formatWadRate(data.feeConfig.performanceFeeRate)} />
          <ValueRow   label="High Watermark (PPS)"       value={formatWadRate(data.feeConfig.highWatermark)} />
          <ValueRow   label="Last Management Harvest"    value={formatTimestamp(data.feeConfig.lastManagementHarvest)} />
          <ValueRow   label="Last Performance Harvest"   value={formatTimestamp(data.feeConfig.lastHarvestPerformanceFeeTime)} />
        </div>
      </section>

      {/* ── NAV / Risk Parameters ────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">
          NAV &amp; Risk Parameters
        </h2>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-700 dark:bg-neutral-900">
          <ValueRow label="Max PPS Deviation"   value={data.deviationPps === '0' ? 'No limit' : formatWadRate(data.deviationPps)} />
          <ValueRow label="Max NAV Staleness"   value={data.maxNavStaleness === '0' ? 'Disabled' : `${formatDuration(Number(data.maxNavStaleness))}`} />
        </div>
      </section>

      {/* ── Update Configuration ──────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-base font-semibold text-neutral-900 dark:text-white">
          Update Configuration
        </h2>
        <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
          All changes go through the admin Safe and are subject to a timelock delay before execution.
        </p>
        <div className="flex flex-col gap-4">
          {SETTERS.map((def) => (
            <SetterCard
              key={def.fnName}
              def={def}
              data={data}
              safeAddress={safeAddress}
              isSafeOwner={isSafeOwner}
              hasRole={hasRole}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
