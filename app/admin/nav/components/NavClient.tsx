'use client'

import { useEffect, useTransition, useState, useRef } from 'react'
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

const AUTO_REFRESH_MS = 30_000

export default function NavClient({ data }: { data: NavPageData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [secondsAgo, setSecondsAgo] = useState(0)
  const prevFetchedAt = useRef(data.fetchedAt)
  const { address, isConnected } = useAccount()

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh())
    }, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [router])

  // Tick the "X seconds ago" counter, reset when new data arrives
  useEffect(() => {
    if (data.fetchedAt !== prevFetchedAt.current) {
      prevFetchedAt.current = data.fetchedAt
    }
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

      {/* Freshness footer */}
      <div className="flex items-center gap-2 border-t border-neutral-100 pt-4 text-xs text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
        {isPending ? (
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        )}
        <span>
          {isPending ? 'Refreshing…' : `Updated ${secondsAgo}s ago`}
          {' · '}
          auto-refresh every {AUTO_REFRESH_MS / 1_000}s
        </span>
      </div>
    </div>
  )
}
