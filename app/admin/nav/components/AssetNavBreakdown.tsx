'use client'

import { useState } from 'react'
import { formatTokenAmount, formatDenomination, truncateAddress } from '@/lib/format'
import type { NavPageData } from '@/lib/nav-reader'
import CategoryTable, { type Roles } from './CategoryTable'

type Props = { data: NavPageData; roles: Roles }

export default function AssetNavBreakdown({ data, roles }: Props) {
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set())

  function toggleAsset(asset: string) {
    setExpandedAssets((prev) => {
      const next = new Set(prev)
      if (next.has(asset)) next.delete(asset)
      else next.add(asset)
      return next
    })
  }

  if (data.assets.length === 0) {
    return (
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
          Per-Asset NAV Breakdown
        </h2>
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-400">No registered assets found.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-white">
        Per-Asset NAV Breakdown
      </h2>
      <div className="space-y-2">
        {data.assets.map((assetData) => {
          const isExpanded = expandedAssets.has(assetData.asset)

          return (
            <div
              key={assetData.asset}
              className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            >
              {/* Asset header row — clickable to expand */}
              <button
                onClick={() => toggleAsset(assetData.asset)}
                className="w-full rounded-lg px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Symbol + address */}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {assetData.symbol}
                    </span>
                    <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">
                      {truncateAddress(assetData.asset)}
                    </span>
                  </div>

                  {/* Off-chain NAV */}
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs">Off-chain NAV:</span>
                    <span className="tabular-nums font-medium text-neutral-900 dark:text-white">
                      {formatTokenAmount(assetData.offChainNav, assetData.decimals, 4)}
                      <span className="ml-1 text-xs text-neutral-400">{assetData.symbol}</span>
                    </span>
                  </div>

                  {/* Stored NAV denomination */}
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400 text-xs">Stored:</span>
                    <span className="tabular-nums font-medium text-neutral-900 dark:text-white">
                      {formatDenomination(assetData.storedDenomination)}
                    </span>
                  </div>

                  {/* Category count badge */}
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    {assetData.categories.length} {assetData.categories.length === 1 ? 'category' : 'categories'}
                  </span>

                  {/* Expand chevron */}
                  <span className="ml-auto text-neutral-400 dark:text-neutral-500">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded category table */}
              {isExpanded && (
                <div className="border-t border-neutral-100 px-4 pb-4 dark:border-neutral-800">
                  <CategoryTable
                    asset={assetData.asset}
                    symbol={assetData.symbol}
                    decimals={assetData.decimals}
                    categories={assetData.categories}
                    roles={roles}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
