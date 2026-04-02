'use client'

export type StatusFilter = 'all' | 'pending' | 'fulfilled'

type Props = {
  status: StatusFilter
  onStatusChange: (s: StatusFilter) => void
  startDate: string
  endDate: string
  onStartDateChange: (d: string) => void
  onEndDateChange: (d: string) => void
  onClear: () => void
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
]

export default function FilterBar({
  status,
  onStatusChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: Props) {
  const hasActiveFilter = status !== 'all' || startDate !== '' || endDate !== ''

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      {/* Status toggle */}
      <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={[
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              status === opt.value
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-neutral-500 dark:text-neutral-400">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        <label className="text-sm text-neutral-500 dark:text-neutral-400">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
      </div>

      {/* Clear */}
      {hasActiveFilter && (
        <button
          onClick={onClear}
          className="text-sm text-neutral-400 underline-offset-2 hover:text-neutral-900 hover:underline dark:hover:text-white"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
