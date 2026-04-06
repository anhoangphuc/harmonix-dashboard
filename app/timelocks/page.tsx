import type { Metadata } from 'next'
import { getTimelockPageData } from '@/lib/timelocks-reader'
import TimelockClient from './components/TimelockClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Timelocks — Harmonix' }

export default async function TimelocksPage() {
  let data
  try {
    data = await getTimelockPageData()
  } catch (err) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900 dark:text-white">Timelocks</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load timelock data: {err instanceof Error ? err.message : String(err)}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-white">Timelocks</h1>
      <TimelockClient data={data} />
    </main>
  )
}
