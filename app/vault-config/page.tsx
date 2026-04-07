import type { Metadata } from 'next'
import VaultConfigClient from './components/VaultConfigClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Vault Config — Harmonix' }

export default function VaultConfigPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Vault Configuration</h1>
      <VaultConfigClient />
    </main>
  )
}
