'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import type { SafeMultisigTransactionResponse } from '@safe-global/types-kit'
import { getApiKit, getSafeAddress } from './api-kit'
import { initProtocolKit } from './protocol-kit'
import { decodeTransactionData, summarizeDecodedData } from './decoder'
import type { PendingSafeTx, SafeInfo } from './types'

// ─── Fetch Safe Info ──────────────────────────────────────────────────────────

export function useSafeInfo() {
  const safeAddress = getSafeAddress()
  console.log("SAFE ADDRSS", safeAddress)
  return useQuery<SafeInfo>({
    queryKey: ['safe', 'info', safeAddress],
    queryFn: async () => {
      const apiKit = getApiKit()
      const info = await apiKit.getSafeInfo(safeAddress)
      return {
        address: safeAddress,
        owners: info.owners,
        threshold: info.threshold,
        nonce: info.nonce,
      }
    },
    staleTime: 60_000,
  })
}

// ─── Fetch Pending Transactions ───────────────────────────────────────────────

export function usePendingSafeTransactions() {
  const safeAddress = getSafeAddress()
  return useQuery<PendingSafeTx[]>({
    queryKey: ['safe', 'pendingTxs', safeAddress],
    queryFn: async () => {
      const apiKit = getApiKit()
      const response = await apiKit.getPendingTransactions(safeAddress)

      return Promise.all(
        (response.results as SafeMultisigTransactionResponse[]).map(async (tx) => {
          const dataDecoded = tx.data
            ? await decodeTransactionData(tx.data, tx.to)
            : null
          const confirmationsCount = tx.confirmations?.length ?? 0
          return {
            safeTxHash: tx.safeTxHash,
            to: tx.to,
            value: tx.value ?? '0',
            data: tx.data ?? null,
            operation: tx.operation ?? 0,
            nonce: tx.nonce,
            submissionDate: tx.modified ?? tx.submissionDate,
            confirmationsRequired: tx.confirmationsRequired,
            confirmations: tx.confirmations ?? [],
            confirmationsCount,
            isExecutable: confirmationsCount >= tx.confirmationsRequired,
            dataDecoded,
            summary: summarizeDecodedData(dataDecoded, tx.to, tx.value ?? '0'),
          } satisfies PendingSafeTx
        }),
      )
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}

// ─── Sign (Confirm) a Pending Transaction ─────────────────────────────────────

export function useConfirmSafeTransaction() {
  const queryClient = useQueryClient()
  const { address, connector } = useAccount()

  return useMutation({
    mutationFn: async ({ safeTxHash }: { safeTxHash: string }) => {
      if (!address) throw new Error('Wallet not connected')
      if (!connector) throw new Error('Connector not ready')

      // Get the raw EIP-1193 provider from the wagmi connector
      const provider = await connector.getProvider()

      const protocolKit = await initProtocolKit(provider, address)
      const apiKit = getApiKit()

      const pendingTx = await apiKit.getTransaction(safeTxHash)
      const signedTx = await protocolKit.signTransaction(pendingTx)

      const sig = signedTx.getSignature(address.toLowerCase())
      if (!sig) throw new Error('Failed to generate signature')

      await apiKit.confirmTransaction(safeTxHash, sig.data)
      return { safeTxHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safe', 'pendingTxs'] })
    },
  })
}

// ─── Execute a Transaction (threshold met) ────────────────────────────────────

export function useExecuteSafeTransaction() {
  const queryClient = useQueryClient()
  const { address, connector } = useAccount()

  return useMutation({
    mutationFn: async ({ safeTxHash }: { safeTxHash: string }) => {
      if (!address) throw new Error('Wallet not connected')
      if (!connector) throw new Error('Connector not ready')

      const provider = await connector.getProvider()

      const protocolKit = await initProtocolKit(provider, address)
      const apiKit = getApiKit()

      const pendingTx = await apiKit.getTransaction(safeTxHash)
      const safeTransaction = await protocolKit.toSafeTransactionType(pendingTx)
      const result = await protocolKit.executeTransaction(safeTransaction)

      return { hash: result.hash, safeTxHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safe', 'pendingTxs'] })
      queryClient.invalidateQueries({ queryKey: ['safe', 'info'] })
    },
  })
}

// ─── Propose a New Safe Transaction ──────────────────────────────────────────

export function useProposeSafeTransaction() {
  const queryClient = useQueryClient()
  const { address, connector } = useAccount()

  return useMutation({
    mutationFn: async ({
      to,
      data,
      value = '0',
    }: {
      to: `0x${string}`
      data: `0x${string}`
      value?: string
    }) => {
      if (!address) throw new Error('Wallet not connected')
      if (!connector) throw new Error('Connector not ready')

      const provider = await connector.getProvider()
      const protocolKit = await initProtocolKit(provider, address)
      const apiKit = getApiKit()

      const safeTransaction = await protocolKit.createTransaction({
        transactions: [{ to, data, value }],
      })

      const signedTx = await protocolKit.signTransaction(safeTransaction)
      const safeTxHash = await protocolKit.getTransactionHash(signedTx)

      const sig = signedTx.getSignature(address.toLowerCase())
      if (!sig) throw new Error('Failed to generate signature')

      await apiKit.proposeTransaction({
        safeAddress: getSafeAddress(),
        safeTransactionData: signedTx.data,
        safeTxHash,
        senderAddress: address,
        senderSignature: sig.data,
      })

      return { safeTxHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safe', 'pendingTxs'] })
    },
  })
}

// ─── Cancel (Reject) a Pending Transaction ───────────────────────────────────
// Safe cancellation works by proposing a rejection transaction with the SAME
// nonce but empty calldata (to=Safe, value=0, data=0x). Whichever executes
// first claims the nonce slot, permanently orphaning the other.

export function useCancelSafeTransaction() {
  const queryClient = useQueryClient()
  const { address, connector } = useAccount()

  return useMutation({
    mutationFn: async ({ nonce }: { nonce: number }) => {
      if (!address) throw new Error('Wallet not connected')
      if (!connector) throw new Error('Connector not ready')

      const provider = await connector.getProvider()
      const protocolKit = await initProtocolKit(provider, address)
      const apiKit = getApiKit()

      // Creates a no-op tx (to=Safe, value=0, data=0x) with the same nonce
      const rejectionTx = await protocolKit.createRejectionTransaction(nonce)
      const signedTx = await protocolKit.signTransaction(rejectionTx)
      const safeTxHash = await protocolKit.getTransactionHash(signedTx)

      const sig = signedTx.getSignature(address.toLowerCase())
      if (!sig) throw new Error('Failed to generate signature')

      await apiKit.proposeTransaction({
        safeAddress: getSafeAddress(),
        safeTransactionData: signedTx.data,
        safeTxHash,
        senderAddress: address,
        senderSignature: sig.data,
      })

      return { safeTxHash }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safe', 'pendingTxs'] })
    },
  })
}
