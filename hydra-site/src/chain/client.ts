// Robinhood Chain access: public reads for the vault and badges, and the visitor's own
// wallet (any EIP-1193 wallet) for claiming. Loaded lazily, only when configured.
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatUnits,
  getAddress,
  http,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem'
import { CONFIG } from '../config'

// The interface the contracts in hydra/contracts must expose (see README.md).
export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
] as const

export const VAULT_ABI = [
  { type: 'function', name: 'spentTodayBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'spentWeekBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'lastBuybackAt', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

export const NFT_ABI = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'attackId', type: 'uint256' },
      { name: 'proof', type: 'bytes32[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const chain = defineChain({
  id: CONFIG.chainId,
  name: CONFIG.chainName,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: CONFIG.rpcUrl ? [CONFIG.rpcUrl] : [] } },
  blockExplorers: CONFIG.explorer ? { default: { name: 'Explorer', url: CONFIG.explorer } } : undefined,
})

let pub: PublicClient | null = null
export const reader = () => (pub ??= createPublicClient({ chain, transport: http(CONFIG.rpcUrl) }) as PublicClient)

/** The defense fund straight from the chain. */
export async function readVault() {
  const vault = getAddress(CONFIG.defenseVault)
  const [bal, today, week, last] = await Promise.all([
    reader().readContract({ address: getAddress(CONFIG.orbioToken), abi: ERC20_ABI, functionName: 'balanceOf', args: [vault] }),
    reader().readContract({ address: vault, abi: VAULT_ABI, functionName: 'spentTodayBps' }),
    reader().readContract({ address: vault, abi: VAULT_ABI, functionName: 'spentWeekBps' }),
    reader().readContract({ address: vault, abi: VAULT_ABI, functionName: 'lastBuybackAt' }),
  ])
  return {
    fund: Number(formatUnits(bal, 18)),
    dailyUsedPct: Number(today) / 100,
    weeklyUsedPct: Number(week) / 100,
    lastBuybackAt: Number(last) * 1000,
  }
}

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
const injected = () => (window as unknown as { ethereum?: Eip1193 }).ethereum

export const hasWallet = () => !!injected()

export async function connectWallet(): Promise<Address> {
  const eth = injected()
  if (!eth) throw new Error('No wallet found. Install a browser wallet to connect.')
  const [a] = (await eth.request({ method: 'eth_requestAccounts' })) as string[]
  return getAddress(a)
}

async function onChain(eth: Eip1193) {
  const hex = `0x${CONFIG.chainId.toString(16)}`
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  } catch {
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: hex, chainName: CONFIG.chainName, rpcUrls: [CONFIG.rpcUrl], nativeCurrency: chain.nativeCurrency, blockExplorerUrls: CONFIG.explorer ? [CONFIG.explorer] : [] }],
    })
  }
}

/** Badges this wallet already holds, by attack number. */
export async function readBadges(account: Address, attacks: number[]) {
  const nft = getAddress(CONFIG.survivorNft)
  const bals = await Promise.all(
    attacks.map((n) => reader().readContract({ address: nft, abi: NFT_ABI, functionName: 'balanceOf', args: [account, BigInt(n)] })),
  )
  return attacks.filter((_, i) => bals[i] > 0n)
}

/** The Merkle proof the agent published for this wallet and attack, or null if it did not hold. */
export async function proofFor(account: Address, attack: number): Promise<Hex[] | null> {
  const res = await fetch(`${CONFIG.proofsBase}/attack-${attack}.json`, { cache: 'no-cache' })
  if (!res.ok) return null
  const file = (await res.json()) as { claims?: Record<string, Hex[]> }
  return file.claims?.[account.toLowerCase()] ?? null
}

/** Sends the claim from the visitor's wallet; they pay their own gas. Returns the tx hash. */
export async function claimBadge(account: Address, attack: number, proof: Hex[]) {
  const eth = injected()
  if (!eth) throw new Error('No wallet found.')
  await onChain(eth)
  const wallet = createWalletClient({ account, chain, transport: custom(eth) })
  const hash = await wallet.writeContract({ address: getAddress(CONFIG.survivorNft), abi: NFT_ABI, functionName: 'claim', args: [BigInt(attack), proof] })
  await reader().waitForTransactionReceipt({ hash })
  return hash
}
