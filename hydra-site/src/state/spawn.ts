// The Spawning Pool: the Jellypions NFT mint, soft staking and the ORBIO reward pool.
// Every value is read from HydraSpawn (chain/spawn.ts) and every action is the matching transaction.
// Until VITE_SPAWN_NFT is set the pool is empty and counts down to VITE_MINT_START.
import { create } from 'zustand'
import { TIERS } from '@spawn-art'
import type { Address } from 'viem'
import { CONFIG, HAS_SPAWN } from '../config'
import { useSea } from './store'

export const SUPPLY = 3333
export const PRICE_ETH = 0.001
export const MAX_PER_WALLET = 5
/** True once the HydraSpawn contract is configured; until then the mint has not opened. */
export const SPAWN_LIVE = HAS_SPAWN
const H = 3600_000
const DAY = 24 * H

export type Spawn = { id: number; seed: string; tier: number; one: number | null; staked: boolean; hatching: boolean }
export type Hatch = { id: number; seed: string; tier: number; one: number | null; time: number }

type State = {
  supply: number
  payout: string // the dev wallet every mint's ETH goes to (PAYOUT in the contract, fixed forever)
  minted: number
  mintedByMe: number | null // what the contract counts for this wallet
  poolExtra: number // live: ORBIO in the pool beyond the current stream (carry)
  perTier: number[] | null // live: projectedDailyAll() from the contract
  lastDeposit: { amount: number; tx: string } | null
  treasury: { pending: number; total: number } | null // live: HydraTreasury (VITE_TREASURY)
  mintStart: number // Infinity while the start is not known
  stakeStart: number // mintStart + 12h
  mintEnd: number // mintStart + 72h: the mint closes and every Spawn reveals in full
  mine: Spawn[] // the connected wallet's Spawn
  owner: string | null // whose Spawn `mine` holds
  recent: Hatch[] // newest hatches across the whole collection
  // The reward stream: each deposit streams out over 24 hours, weighted by staked points.
  streamStart: number
  streamEnd: number
  streamAmount: number // ORBIO in the current 24h stream
  paidBefore: number // ORBIO streamed by earlier deposits
  otherPoints: number // points staked by everyone else
  otherStaked: number // Spawn staked by everyone else
  earnedBase: number // the wallet's unclaimed ORBIO, settled at earnedAt
  earnedAt: number
  claimed: number
  pending: 'mint' | 'stake' | 'unstake' | 'claim' | null
  set: (p: Partial<State>) => void
}

const points = (tier: number) => TIERS[tier][1]

// Starts empty and fills from the first read of the contract.
const START = CONFIG.mintStart || Infinity
export const useSpawn = create<State>((set) => ({
  supply: SUPPLY,
  payout: '',
  minted: 0,
  mintedByMe: null,
  poolExtra: 0,
  perTier: null,
  lastDeposit: null,
  treasury: null,
  mintStart: START,
  stakeStart: START + 12 * H,
  mintEnd: START + 72 * H,
  mine: [],
  owner: null,
  recent: [],
  streamStart: 0,
  streamEnd: 0,
  streamAmount: 0,
  paidBefore: 0,
  otherPoints: 0,
  otherStaked: 0,
  earnedBase: 0,
  earnedAt: Date.now(),
  claimed: 0,
  pending: null,
  set: (p) => set(p),
}))

type S = State
const get = () => useSpawn.getState()

// ---------- readings (the same views the contract will expose) ----------

/** Reveal progress as the contract computes it: per mille of supply, or 100% after sell-out or the deadline. */
export const progressOf = (s: S, t = Date.now()) => (s.minted >= s.supply || t >= s.mintEnd ? 1 : Math.floor((s.minted * 1000) / s.supply) / 1000)
export const phaseOf = (s: S, t = Date.now()) => (s.minted >= s.supply ? 'soldout' : t < s.mintStart ? 'soon' : t >= s.mintEnd ? 'closed' : 'open')
export const myPoints = (s: S) => s.mine.reduce((a, x) => a + (x.staked ? points(x.tier) : 0), 0)
export const totalPoints = (s: S) => s.otherPoints + myPoints(s)
export const stakedCount = (s: S) => s.otherStaked + s.mine.filter((x) => x.staked).length
/** ORBIO per day flowing out of the pool right now. */
export const dailyRate = (s: S, t = Date.now()) => (t >= s.streamStart && t < s.streamEnd ? s.streamAmount : 0)
/** "One staked Spawn of this tier gets about this much ORBIO a day at today's rate." */
export const projectedDailyFor = (s: S, tier: number, t = Date.now()) =>
  s.perTier ? s.perTier[tier] : (dailyRate(s, t) * points(tier)) / Math.max(totalPoints(s), points(tier))
/** How many this wallet has minted (the 5-per-wallet limit counts mints, not holdings). */
export const mintedByWallet = (s: S) => s.mintedByMe ?? s.mine.length
export const projectedDaily = (s: S, t = Date.now()) => (totalPoints(s) ? (dailyRate(s, t) * myPoints(s)) / totalPoints(s) : 0)
const streamedIn = (s: S, t: number) => s.streamAmount * Math.min(1, Math.max(0, (t - s.streamStart) / DAY))
export const totalPaid = (s: S, t = Date.now()) => s.paidBefore + streamedIn(s, t)
export const poolBalance = (s: S, t = Date.now()) => s.streamAmount - streamedIn(s, t) + s.poolExtra
/** ETH the dev wallet has received from the mint. */
export const mintEth = (s: S) => s.minted * PRICE_ETH
export function earnedNow(s: S, t = Date.now()) {
  const tp = totalPoints(s)
  const mp = myPoints(s)
  if (!tp || !mp) return s.earnedBase
  const span = Math.max(0, Math.min(t, s.streamEnd) - Math.max(s.earnedAt, s.streamStart))
  return s.earnedBase + ((s.streamAmount * span) / DAY) * (mp / tp)
}

// ---------- actions: each is one contract call ----------

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Fired when a Spawn hatches, so the 3D pool can raise a new jelly. */
export const poolFx = { hatchAt: -10, color: '#ff7ad9' }

const NOT_OPEN = 'The mint opens at launch.'

export async function mintSpawn(qty: number) {
  if (!SPAWN_LIVE) throw new Error(NOT_OPEN)
  return liveMint(qty)
}

export async function setStaked(ids: number[], staked: boolean) {
  if (get().pending || !ids.length) return
  if (!SPAWN_LIVE) throw new Error(NOT_OPEN)
  return liveSend(staked ? 'stake' : 'unstake', [ids.map(BigInt)], staked ? 'stake' : 'unstake')
}

export async function claimRewards() {
  const s = get()
  if (s.pending) return
  if (!SPAWN_LIVE) throw new Error(NOT_OPEN)
  const before = earnedNow(s)
  await liveSend('claim', [], 'claim')
  if (before > 0) useSea.getState().float(`+${before.toFixed(2)} ORBIO`, 'gold')
}

let started = false
export function startSpawn() {
  if (started || !SPAWN_LIVE) return
  started = true
  startLive()
}

// ---------- HydraSpawn on-chain ----------

let chainMod: typeof import('../chain/spawn') | null = null
const chain = async () => (chainMod ??= await import('../chain/spawn'))

function liveWallet() {
  const w = useSea.getState().wallet
  if (!w) throw new Error('Connect your wallet first.')
  return w as Address
}

/** Fills the state from the contract. The views above then show exactly what the contract says. */
async function refresh() {
  const c = await chain()
  const st = await c.readStats()
  const w = useSea.getState().wallet
  const acc = w ? await c.readAccount(w as Address, st.minted) : null
  const t = Date.now()
  const mine = acc ? acc.tokens : []
  const prev = get()
  const myPts = mine.reduce((a, x) => a + (x.staked ? points(x.tier) : 0), 0)
  const streamStart = st.endsAt - DAY
  const streamed = st.daily * Math.min(1, Math.max(0, (t - streamStart) / DAY))
  // A Spawn of ours that was an egg on the last read and has hatched now: raise it in the 3D pool.
  const born = mine.filter((x) => !x.hatching && prev.mine.some((y) => y.id === x.id && y.hatching))
  get().set({
    minted: st.minted,
    mine,
    owner: w,
    mintedByMe: acc ? acc.mintedByMe : null,
    streamStart,
    streamEnd: st.endsAt,
    streamAmount: st.daily,
    paidBefore: st.paid - streamed,
    poolExtra: st.pool - (st.daily - streamed),
    otherPoints: st.points - myPts,
    otherStaked: st.staked - mine.filter((x) => x.staked).length,
    earnedBase: acc ? acc.earned : 0,
    earnedAt: t,
    perTier: st.perTier,
  })
  if (born.length) {
    const best = born.reduce((a, b) => (b.tier > a.tier ? b : a))
    poolFx.hatchAt = performance.now() / 1000
    poolFx.color = TIERS[best.tier][3]
    useSea.getState().float(`Hatched: ${TIERS[best.tier][0]}`, best.tier >= 3 ? 'gold' : 'jade')
  }
}

async function liveSend(fn: 'mint' | 'hatch' | 'stake' | 'unstake' | 'claim', args: unknown[], pending: State['pending'], value?: bigint) {
  const w = liveWallet()
  const c = await chain()
  get().set({ pending })
  try {
    await c.send(w, fn, args, value)
  } finally {
    get().set({ pending: null })
  }
  await refresh()
}

async function liveMint(qty: number) {
  const s = get()
  if (mintedByWallet(s) + qty > MAX_PER_WALLET) throw new Error(`At most ${MAX_PER_WALLET} per wallet.`)
  const had = new Set(s.mine.map((x) => x.id))
  await liveSend('mint', [BigInt(qty)], 'mint', BigInt(qty) * 10n ** 15n) // 0.001 ETH each
  useSea.getState().float(`${qty} egg${qty > 1 ? 's' : ''} laid`, 'orchid')
  // The agent's keeper hatches within a second or two; watch for it (hatchNow() is the fallback).
  for (let k = 0; k < 12 && get().mine.some((x) => x.hatching); k++) {
    await wait(1500)
    await refresh().catch(() => {})
  }
  return get().mine.filter((x) => !had.has(x.id))
}

/** Hatches the oldest pending eggs (ours included) if the keeper has not got to them yet. */
export async function hatchNow() {
  if (!SPAWN_LIVE || get().pending) return
  await liveSend('hatch', [20n], 'mint')
}

function startLive() {
  const boot = async () => {
    const c = await chain()
    const fixed = await c.readFixed()
    get().set({ ...fixed })
    await refresh()
    get().set({ recent: await c.readRecentHatches(), lastDeposit: await c.readLastDeposit(), treasury: await c.readTreasury() })
  }
  boot().catch((e) => console.warn('HydraSpawn read failed', e))
  useSea.subscribe((sea) => {
    if (sea.wallet !== get().owner) refresh().catch(() => {})
  })
  setInterval(() => refresh().catch(() => {}), 8000)
  setInterval(async () => {
    const c = await chain()
    get().set({ recent: await c.readRecentHatches(), lastDeposit: await c.readLastDeposit(), treasury: await c.readTreasury() })
  }, 30_000)
}
