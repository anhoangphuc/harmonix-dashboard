'use client'

import { useState } from 'react'
import { useRoleCheck } from '@/lib/safe/hooks'
import { truncateAddress } from '@/lib/format'
import DurationsTab from './DurationsTab'
import SubmitTab from './SubmitTab'
import RevokeTab from './RevokeTab'
import type { TimelockPageData } from '@/lib/timelocks-reader'

type Tab = 'durations' | 'submit' | 'revoke'

const TAB_LABELS: Record<Tab, string> = {
  durations: 'Durations',
  submit: 'Submit Operation',
  revoke: 'Revoke Operation',
}

type Props = { data: TimelockPageData }

export default function TimelockClient({ data }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('durations')
  const { safeAddress, hasRole, isSafeOwner } = useRoleCheck('admin')

  return (
    <div className="space-y-6">
      {/* Role banner */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">Admin Safe: </span>
            <span className="font-mono text-neutral-900 dark:text-white">
              {safeAddress && safeAddress !== '0x' ? truncateAddress(safeAddress) : '—'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">FundVault: </span>
            <span className="font-mono text-neutral-900 dark:text-white">{truncateAddress(data.fundVaultAddress)}</span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">VaultManagerAdmin: </span>
            <span className="font-mono text-neutral-900 dark:text-white">{truncateAddress(data.vaultManagerAdminAddress)}</span>
          </div>
          <div className="ml-auto flex gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                hasRole
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
              }`}
            >
              {hasRole ? 'Admin role' : 'No admin role'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isSafeOwner
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
              }`}
            >
              {isSafeOwner ? 'Safe owner' : 'Not owner'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {TAB_LABELS[tab]}
              {tab === 'revoke' && data.pendingOps.length > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {data.pendingOps.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'durations' && <DurationsTab timelocks={data.timelocks} />}
        {activeTab === 'submit' && <SubmitTab data={data} />}
        {activeTab === 'revoke' && <RevokeTab data={data} />}
      </div>
    </div>
  )
}
