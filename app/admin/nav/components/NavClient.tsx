'use client'

import { useEffect, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount, useReadContract } from 'wagmi'
import { getAddress } from 'viem'
import { HA_VAULT_READER_ADDRESS, HA_VAULT_READER_ABI } from '@/lib/contracts'
import { getSafeAddress } from '@/lib/safe/api-kit'
import { useSafeInfo } from '@/lib/safe/hooks'
import type { NavPageData } from '@/lib/nav-reader'
import RoleBanner from './RoleBanner'
import NavSummaryCards from './NavSummaryCards'
import UpdateNavSection from './UpdateNavSection'
import AssetNavBreakdown from './AssetNavBreakdown'

// PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE")
const PRICE_UPDATER_ROLE = '0xd96ba01d6560c2ab35f2940dd8d70c5f5fe06236c72674237120515918198fb0' as const
// DEFAULT_ADMIN_ROLE = bytes32(0)
const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000' as const

const AUTO_REFRESH_MS = 60_000

export default function NavClient({ data }: { data: NavPageData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [secondsAgo, setSecondsAgo] = useState(0)
  const { address, isConnected } = useAccount()

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh())
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [router])

  // Tick the "X seconds ago" counter, reset to 0 when new data arrives
  useEffect(() => {
    setSecondsAgo(0)
    const ticker = setInterval(() => setSecondsAgo((s) => s + 1), 1_000)
    return () => clearInterval(ticker)
  }, [data.fetchedAt])

  // ── Safe info (owners list) ───────────────────────────────────────────────
  const safeAddress = getSafeAddress()
  const { data: safeInfo } = useSafeInfo()

  // Is the connected wallet one of the Safe owners?
  const isSafeOwner = Boolean(
    address &&
    safeInfo?.owners.some((o) => o.toLowerCase() === address.toLowerCase()),
  )

  // ── Role checks: does the Safe itself hold each role? ─────────────────────
  const { data: safeHasPriceUpdater } = useReadContract({
    address: HA_VAULT_READER_ADDRESS,
    abi: HA_VAULT_READER_ABI,
    functionName: 'hasRole',
    args: safeAddress && safeAddress !== '0x'
      ? [PRICE_UPDATER_ROLE, getAddress(safeAddress)]
      : undefined,
    query: { enabled: Boolean(safeAddress && safeAddress !== '0x') },
  })

  const { data: safeHasAdmin } = useReadContract({
    address: HA_VAULT_READER_ADDRESS,
    abi: HA_VAULT_READER_ABI,
    functionName: 'hasRole',
    args: safeAddress && safeAddress !== '0x'
      ? [DEFAULT_ADMIN_ROLE, getAddress(safeAddress)]
      : undefined,
    query: { enabled: Boolean(safeAddress && safeAddress !== '0x') },
  })

  const roles = {
    isConnected,
    isSafeOwner,
    safeHasPriceUpdater: Boolean(safeHasPriceUpdater),
    safeHasAdmin: Boolean(safeHasAdmin),
  }

  return (
    <div className="space-y-6">

      {/* Page title + refresh controls */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
          NAV Management
        </h1>
        <div className="ml-auto flex flex-col items-end gap-1">
          <button
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14" height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPending ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
            {isPending ? 'Refreshing…' : 'Refresh'}
          </button>
          <p className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
            {isPending ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
            {isPending ? 'Updating…' : `Updated ${secondsAgo}s ago`}
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            auto-refresh every {AUTO_REFRESH_MS / 1_000}s
          </p>
        </div>
      </div>

      {/* Role / access indicator */}
      <RoleBanner
        isConnected={isConnected}
        isSafeOwner={isSafeOwner}
        safeHasPriceUpdater={roles.safeHasPriceUpdater}
        safeHasAdmin={roles.safeHasAdmin}
        safeAddress={safeAddress}
      />

      {/* NAV summary cards */}
      <NavSummaryCards data={data} />

      {/* Update NAV action */}
      <UpdateNavSection
        data={data}
        canPropose={isSafeOwner && roles.safeHasPriceUpdater}
        isConnected={isConnected}
      />

      {/* Per-asset breakdown */}
      <AssetNavBreakdown data={data} roles={roles} />
    </div>
  )
}
