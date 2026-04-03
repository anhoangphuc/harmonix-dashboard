type Props = {
  idle: bigint
  deployed: bigint
}

export default function CapitalBreakdownBar({ idle, deployed }: Props) {
  const total = idle + deployed
  if (total === 0n) {
    return (
      <p className="text-xs text-neutral-400 dark:text-neutral-500">No capital tracked</p>
    )
  }

  // Calculate percentages using integer arithmetic (basis points = 1/100 of a percent)
  const basisPoints = 10_000n
  const idleBps = (idle * basisPoints) / total
  const deployedBps = basisPoints - idleBps
  const pctIdle = Number(idleBps) / 100
  const pctDeployed = Number(deployedBps) / 100

  return (
    <div className="space-y-1.5">
      {/* Bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${pctIdle}%` }}
          title={`Idle: ${pctIdle.toFixed(1)}%`}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${pctDeployed}%` }}
          title={`Deployed: ${pctDeployed.toFixed(1)}%`}
        />
      </div>
      {/* Legend */}
      <div className="flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          Idle {pctIdle.toFixed(1)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-500" />
          Deployed {pctDeployed.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}
