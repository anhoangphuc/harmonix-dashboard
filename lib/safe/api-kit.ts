import SafeApiKit from '@safe-global/api-kit'

let _apiKit: SafeApiKit | null = null

/**
 * Returns a singleton SafeApiKit instance for HyperEVM (chain 999).
 * api.safe.global always requires an API key — set NEXT_PUBLIC_SAFE_API_KEY.
 * Get one free at https://developer.safe.global
 */
export function getApiKit(): SafeApiKit {
  if (_apiKit) return _apiKit
  const apiKey = process.env.NEXT_PUBLIC_SAFE_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_SAFE_API_KEY is not set. Get a free key at https://developer.safe.global')
  _apiKit = new SafeApiKit({ chainId: 999n, apiKey })
  return _apiKit
}

export function getSafeAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_SAFE_ADDRESS
  if (!addr) return '0x' as `0x${string}` // will show as unconfigured in the UI
  return addr as `0x${string}`
}
