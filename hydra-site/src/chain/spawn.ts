// HydraSpawn on Robinhood Chain: the reads behind the Spawning Pool and the visitor's own transactions.
// Loaded only when VITE_SPAWN_NFT is set. The art is drawn here with the same code as the contract's
// renderer (nft/spawn-art.js), which matches tokenURI byte for byte, so nothing heavy is read from chain.
import { createWalletClient, custom, formatUnits, getAddress, parseAbiItem, type Address, type Hex } from 'viem'
import { CONFIG } from '../config'
import { chain, reader } from './client'

export const SPAWN_ABI = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'qty', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'hatch', stateMutability: 'nonpayable', inputs: [{ name: 'max', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'stake', stateMutability: 'nonpayable', inputs: [{ name: 'ids', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'unstake', stateMutability: 'nonpayable', inputs: [{ name: 'ids', type: 'uint256[]' }], outputs: [] },
  { type: 'function', name: 'claim', stateMutability: 'nonpayable', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MAX_SUPPLY', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MINT_START', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'STAKE_START', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'MINT_END', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalClaimed', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'stats',
    stateMutability: 'view',
    inputs: [],
    outputs: ['minted', 'hatched', 'pm', 'staked', 'points', 'rate', 'endsAt', 'pool', 'paid'].map((name) => ({ name, type: 'uint256' })),
  },
  {
    type: 'function',
    name: 'account',
    stateMutability: 'view',
    inputs: [{ name: 'a', type: 'address' }],
    outputs: ['minted', 'points', 'earnedNow', 'daily', 'balance'].map((name) => ({ name, type: 'uint256' })),
  },
  { type: 'function', name: 'projectedDailyAll', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256[5]' }] },
  {
    type: 'function',
    name: 'tokensOf',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'from', type: 'uint256' },
      { name: 'to', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'tokenInfo',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'target', type: 'uint64' },
          { name: 'seed', type: 'uint32' },
          { name: 'tier', type: 'uint8' },
          { name: 'one', type: 'uint8' },
          { name: 'hatched', type: 'bool' },
          { name: 'staked', type: 'bool' },
        ],
      },
    ],
  },
] as const

const HATCHED = parseAbiItem('event Hatched(uint256 indexed id, uint8 tier, uint8 one, uint32 seed)')
const REWARD = parseAbiItem('event RewardAdded(address indexed from, uint256 amount, uint256 rate, uint256 endsAt)')

const nft = () => getAddress(CONFIG.spawnNft)
const read = <T>(functionName: string, args: unknown[] = []) =>
  reader().readContract({ address: nft(), abi: SPAWN_ABI, functionName: functionName as never, args: args as never }) as Promise<T>
const orbio = (v: bigint) => Number(formatUnits(v, 18))
/** The on-chain 32-bit seed as the art's seed string: 8 lowercase hex characters. */
export const seedString = (seed: number) => seed.toString(16).padStart(8, '0')

export type ChainToken = { id: number; seed: string; tier: number; one: number | null; staked: boolean; hatching: boolean }
export type ChainHatch = { id: number; seed: string; tier: number; one: number | null; time: number }

/** Values that never change after deploy. */
export async function readFixed() {
  const [supply, start, stakeStart, end] = await Promise.all([
    read<bigint>('MAX_SUPPLY'),
    read<bigint>('MINT_START'),
    read<bigint>('STAKE_START'),
    read<bigint>('MINT_END'),
  ])
  return { supply: Number(supply), mintStart: Number(start) * 1000, stakeStart: Number(stakeStart) * 1000, mintEnd: Number(end) * 1000 }
}

export async function readStats() {
  const [st, perTier, claimed] = await Promise.all([
    read<readonly bigint[]>('stats'),
    read<readonly bigint[]>('projectedDailyAll'),
    read<bigint>('totalClaimed'),
  ])
  const [minted, hatched, pm, staked, points, rate, endsAt, pool, paid] = st
  return {
    minted: Number(minted),
    hatched: Number(hatched),
    pm: Number(pm),
    staked: Number(staked),
    points: Number(points),
    daily: orbio(rate * 86400n),
    endsAt: Number(endsAt) * 1000,
    pool: orbio(pool),
    paid: orbio(paid),
    claimedAll: orbio(claimed),
    perTier: perTier.map(orbio),
  }
}

async function tokenOf(id: number): Promise<ChainToken> {
  const t = await read<{ seed: number; tier: number; one: number; hatched: boolean; staked: boolean }>('tokenInfo', [BigInt(id)])
  return { id, seed: seedString(t.seed), tier: t.tier, one: t.one === 255 ? null : t.one, staked: t.staked, hatching: !t.hatched }
}

/** The wallet's numbers and its Spawn (the collection is not enumerable, so ids are scanned in chunks). */
export async function readAccount(a: Address, minted: number) {
  const [acc, ...chunks] = await Promise.all([
    read<readonly bigint[]>('account', [a]),
    ...Array.from({ length: Math.ceil(minted / 1000) }, (_, k) => read<readonly bigint[]>('tokensOf', [a, BigInt(k * 1000 + 1), BigInt((k + 1) * 1000)])),
  ])
  const ids = chunks.flat().map(Number)
  return {
    mintedByMe: Number(acc[0]),
    points: Number(acc[1]),
    earned: orbio(acc[2]),
    daily: orbio(acc[3]),
    tokens: await Promise.all(ids.map(tokenOf)),
  }
}

/** Newest hatches across the collection, from the Hatched events in the last `blocks` blocks. */
export async function readRecentHatches(blocks = 5000n): Promise<ChainHatch[]> {
  try {
    const head = await reader().getBlockNumber()
    const logs = await reader().getLogs({ address: nft(), event: HATCHED, fromBlock: head > blocks ? head - blocks : 0n, toBlock: head })
    return logs
      .slice(-8)
      .reverse()
      .map((l) => ({ id: Number(l.args.id), seed: seedString(Number(l.args.seed)), tier: Number(l.args.tier), one: l.args.one === 255 ? null : Number(l.args.one), time: Date.now() }))
  } catch {
    return [] // some RPCs limit log ranges; the panel then just shows the wallet's own Spawn
  }
}

const TREASURY_ABI = [
  { type: 'function', name: 'pending', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'totalDistributed', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const

/** HYDRA's fee stake on Orbio, held by HydraTreasury: what the next deposit will be, and everything paid so far. */
export async function readTreasury() {
  if (!CONFIG.treasury) return null
  const address = getAddress(CONFIG.treasury)
  const [pending, total] = await Promise.all([
    reader().readContract({ address, abi: TREASURY_ABI, functionName: 'pending' }),
    reader().readContract({ address, abi: TREASURY_ABI, functionName: 'totalDistributed' }),
  ])
  return { pending: orbio(pending), total: orbio(total) }
}

/** The most recent daily deposit: amount and its transaction, for the receipt link. */
export async function readLastDeposit(blocks = 200_000n) {
  try {
    const head = await reader().getBlockNumber()
    const logs = await reader().getLogs({ address: nft(), event: REWARD, fromBlock: head > blocks ? head - blocks : 0n, toBlock: head })
    const l = logs[logs.length - 1]
    return l ? { amount: orbio(l.args.amount ?? 0n), tx: l.transactionHash as Hex } : null
  } catch {
    return null
  }
}

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }

/** Sends one HydraSpawn transaction from the visitor's wallet and waits for it. Returns the tx hash. */
export async function send(account: Address, functionName: 'mint' | 'hatch' | 'stake' | 'unstake' | 'claim', args: unknown[] = []) {
  const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum
  if (!eth) throw new Error('No wallet found.')
  const hex = `0x${CONFIG.chainId.toString(16)}`
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
  } catch {
    await eth.request({
      method: 'wallet_addEthereumChain',
      params: [{ chainId: hex, chainName: CONFIG.chainName, rpcUrls: [CONFIG.rpcUrl], nativeCurrency: chain.nativeCurrency, blockExplorerUrls: CONFIG.explorer ? [CONFIG.explorer] : [] }],
    })
  }
  const wallet = createWalletClient({ account, chain, transport: custom(eth) })
  const hash = await wallet.writeContract({ address: nft(), abi: SPAWN_ABI, functionName, args: args as never } as never)
  const receipt = await reader().waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('The transaction failed on-chain.')
  return hash
}
