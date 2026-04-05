import { keccak256, toHex } from 'viem'

export type RoleType = 'operator' | 'curator' | 'price_updater' | 'admin'

/** keccak256 hashes of each role string, matching the on-chain AccessManager. */
export const ROLE_HASHES: Record<RoleType, `0x${string}`> = {
  operator: keccak256(toHex('OPERATOR_ROLE')),
  curator: keccak256(toHex('CURATOR_ROLE')),
  price_updater: keccak256(toHex('PRICE_UPDATER_ROLE')),
  admin: '0x0000000000000000000000000000000000000000000000000000000000000000', // DEFAULT_ADMIN_ROLE = bytes32(0)
}

export const ROLE_LABELS: Record<RoleType, string> = {
  operator: 'Operator',
  curator: 'Curator',
  price_updater: 'Price Updater',
  admin: 'Admin',
}

const ENV_KEYS: Record<RoleType, string> = {
  operator: 'NEXT_PUBLIC_SAFE_OPERATOR',
  curator: 'NEXT_PUBLIC_SAFE_CURATOR',
  price_updater: 'NEXT_PUBLIC_SAFE_PRICE_UPDATER',
  admin: 'NEXT_PUBLIC_SAFE_ADMIN',
}

/** Returns the default Safe address (fallback for all roles). */
export function getDefaultSafeAddress(): `0x${string}` {
  const addr = process.env.NEXT_PUBLIC_SAFE_ADDRESS
  if (!addr) return '0x' as `0x${string}`
  return addr as `0x${string}`
}

/** Returns the Safe address for a given role, falling back to NEXT_PUBLIC_SAFE_ADDRESS. */
export function getSafeAddressForRole(role: RoleType): `0x${string}` {
  const addr = process.env[ENV_KEYS[role]]
  if (addr) return addr as `0x${string}`
  return getDefaultSafeAddress()
}
