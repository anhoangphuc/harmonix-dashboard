import { truncateAddress } from '@/lib/format'

type Props = {
  isConnected: boolean
  isSafeOwner: boolean
  safeHasPriceUpdater: boolean
  safeHasAdmin: boolean
  safeAddress: string
}

export default function RoleBanner({
  isConnected,
  isSafeOwner,
  safeHasPriceUpdater,
  safeHasAdmin,
  safeAddress,
}: Props) {
  const safeLabel = safeAddress && safeAddress !== '0x'
    ? truncateAddress(safeAddress)
    : 'Safe not configured'

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400">
        🔌 Connect your wallet to manage NAV values. Actions are submitted as{' '}
        <span className="font-medium">Safe multisig proposals</span>.
      </div>
    )
  }

  if (!safeAddress || safeAddress === '0x') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        ⚠ <span className="font-medium">NEXT_PUBLIC_SAFE_ADDRESS</span> is not configured. Cannot propose transactions.
      </div>
    )
  }

  if (!isSafeOwner) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
        ⚠ Your wallet is not an owner of Safe{' '}
        <span className="font-mono font-medium">{safeLabel}</span>. You can view NAV data but cannot propose transactions.
      </div>
    )
  }

  // Connected wallet is a Safe owner — show what the Safe can do
  if (safeHasPriceUpdater && safeHasAdmin) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
        ✓ Safe <span className="font-mono font-medium">{safeLabel}</span> has full NAV access —
        can sync values, update NAV, and manage categories. You are an owner and can propose transactions.
      </div>
    )
  }

  if (safeHasPriceUpdater) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        ✓ Safe <span className="font-mono font-medium">{safeLabel}</span> has{' '}
        <span className="font-medium">PRICE_UPDATER_ROLE</span> — can sync NAV values and trigger updateNav().
        Category management requires <span className="font-medium">DEFAULT_ADMIN_ROLE</span>.
      </div>
    )
  }

  if (safeHasAdmin) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
        ✓ Safe <span className="font-mono font-medium">{safeLabel}</span> has{' '}
        <span className="font-medium">DEFAULT_ADMIN_ROLE</span> — can add and remove NAV categories.
        Syncing values requires <span className="font-medium">PRICE_UPDATER_ROLE</span>.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
      ⚠ Safe <span className="font-mono font-medium">{safeLabel}</span> has no NAV management roles.
      All actions are disabled.
    </div>
  )
}
