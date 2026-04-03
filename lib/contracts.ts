export const HA_VAULT_READER_ADDRESS =
  '0x5Fddb683056BEa407b629d01B4c815869A576AB9' as const

export const FUND_NAV_FEED_ADDRESS =
  '0xA428Df5D9343cB801D6Fc4E56989d76C7F26Cc85' as const

/** Known asset token metadata keyed by lowercase address. */
export const ASSET_METADATA: Record<string, { symbol: string; decimals: number }> = {
  '0x63cc83cff07aa77107f4ba8b7a6cfb855075975f': { symbol: 'DAI', decimals: 18 },
  '0xe37b52201571f92487505d32677a6711d7d096c9': { symbol: 'USDT', decimals: 6 },
}

export { HA_VAULT_READER_ABI, VAULT_ASSET_ABI, FUND_NAV_FEED_ABI } from './abis';