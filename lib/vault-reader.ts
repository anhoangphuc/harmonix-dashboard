import { createPublicClient, http, defineChain } from 'viem'
import { HA_VAULT_READER_ADDRESS, HA_VAULT_READER_ABI } from './contracts'

const hyperEvmMainnet = defineChain({
  id: 999,
  name: 'HyperEVM Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
})

const publicClient = createPublicClient({
  chain: hyperEvmMainnet,
  transport: http(),
})

/** Serializable withdrawal — bigints converted to strings for the client boundary. */
export type Withdrawal = {
  id: string
  vault: string
  controller: string
  shares: string
  assets: string
  requestedAt: number
  isFulfilled: boolean
}

const PAGE_SIZE = 100n

/**
 * Returns a map of vault address (lowercase) → asset address (lowercase)
 * for every registered asset vault.
 */
export async function getVaultAssetMap(): Promise<Record<string, string>> {
  const assets = await publicClient.readContract({
    address: HA_VAULT_READER_ADDRESS,
    abi: HA_VAULT_READER_ABI,
    functionName: 'getRegisteredAssets',
  })

  const map: Record<string, string> = {}
  await Promise.all(
    assets.map(async (asset) => {
      const vault = await publicClient.readContract({
        address: HA_VAULT_READER_ADDRESS,
        abi: HA_VAULT_READER_ABI,
        functionName: 'getVaultForAsset',
        args: [asset],
      })
      const zero = '0x0000000000000000000000000000000000000000'
      if (vault.toLowerCase() !== zero) {
        map[vault.toLowerCase()] = asset.toLowerCase()
      }
    })
  )
  return map
}

/**
 * Fetches all withdrawal requests from the on-chain queue in pages of 100.
 * Returns serializable objects (no bigints) ready to pass across the server→client boundary.
 */
export async function getAllWithdrawals(): Promise<Withdrawal[]> {
  const length = await publicClient.readContract({
    address: HA_VAULT_READER_ADDRESS,
    abi: HA_VAULT_READER_ABI,
    functionName: 'getRedeemQueueLength',
  })

  if (length === 0n) return []

  const results: Withdrawal[] = []

  for (let fromId = 1n; fromId <= length; fromId += PAGE_SIZE) {
    const toId = fromId + PAGE_SIZE - 1n > length ? length : fromId + PAGE_SIZE - 1n

    const page = await publicClient.readContract({
      address: HA_VAULT_READER_ADDRESS,
      abi: HA_VAULT_READER_ABI,
      functionName: 'getPendingWithdrawals',
      args: [fromId, toId],
    })

    for (const w of page) {
      results.push({
        id: w.id.toString(),
        vault: w.vault.toLowerCase(),
        controller: w.controller.toLowerCase(),
        shares: w.shares.toString(),
        assets: w.assets.toString(),
        requestedAt: Number(w.requestedAt),
        isFulfilled: w.isFulfilled,
      })
    }
  }

  return results
}
