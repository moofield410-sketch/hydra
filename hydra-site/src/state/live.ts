// The live agent. The agent's events table (Supabase) drives the creature within seconds,
// and the fund and caps are read from the chain itself. Before launch there is nothing to
// read, so the sea waits: one head, an empty ticker, and the Trench still unwritten.
import * as THREE from 'three'
import { CONFIG, HAS_LIVE_FEED, HAS_VAULT } from '../config'
import { useSea, type Activity } from './store'
import { emit, flow, now, pulses } from './fx'
import { DAY, TODAY, type Memory, type Stratum, type Verdict } from './history'
import { RIG } from '../theme'

type Row = { id: number; time: string; type: string; data: Record<string, unknown> | null; tx_hash: string | null }
type StateRow = Partial<{
  mood: 'calm' | 'fear' | 'hype'
  heads: number
  attacks: number
  fund: number
  runway_days: number
  fear_score: number
  price: number
  change_24h: number
  burned: number
  survivors: number
  diary: string
}>

const ACTIVITY: Record<string, Activity> = {
  listen: 'listening',
  think: 'thinking',
  feed: 'feeding',
  digest: 'digesting',
  hunted: 'hunted',
  fight: 'fighting',
  burn: 'burning',
  new_head: 'growing',
  post: 'posting',
  sleep: 'sleeping',
  wake: 'idle',
  reward: 'feeding', // the daily ORBIO deposit is fee income too
}

const sea = () => useSea.getState()
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : d)
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
let idleTimer: ReturnType<typeof setTimeout> | undefined
let launchAt = 0

function textOf(r: Row): string {
  const d = r.data ?? {}
  if (typeof d.text === 'string') return d.text
  switch (r.type) {
    case 'feed':
      return `Harvested trading fees: +${num(d.credit).toFixed(2)} CREDIT`
    case 'digest':
      return `Spare CREDIT swapped: +${fmt(num(d.orbio))} ORBIO into the defense fund`
    case 'fight':
      return `Buyback fired: ${fmt(num(d.orbio))} ORBIO from the defense fund`
    case 'burn':
      return `Burned ${fmt(num(d.hydra))} $HYDRA. Gone for good.`
    case 'new_head':
      return `Attack #${num(d.attack)} repelled. A new head has grown.`
    case 'reward':
      return `Daily deposit: ${fmt(num(d.orbio))} ORBIO from trading fees to the Jellypion pool`
    case 'staked':
      return `${fmt(num(d.count))} Jellypions staked, ${fmt(num(d.points))} points`
    case 'hatch':
      return `Jellypion #${num(d.id)} hatched`
    case 'hunted':
      return `Fear ${num(d.fear)}/100 and price ${num(d.change)}% in 24h. Under attack.`
    default:
      return r.type
  }
}

const toMemory = (r: Row): Memory => ({ time: Date.parse(r.time), activity: ACTIVITY[r.type] ?? 'idle', text: textOf(r), tx: r.tx_hash ?? undefined })

/** Folds one event into memory: the ticker, the coral and the wreck field. */
function remember(r: Row) {
  const s = sea()
  const d = r.data ?? {}
  const time = Date.parse(r.time)
  const activity = ACTIVITY[r.type]
  if (activity) {
    s.set({ events: [{ id: r.id, time, activity, text: textOf(r) }, ...s.events].slice(0, 40) })
    const hours = s.hours.slice()
    if (time > TODAY) hours[new Date(time).getUTCHours()] = activity
    s.set({ hours })
  }
  if (r.type === 'think' && typeof d.verdict === 'string') {
    s.set({
      decisions: [
        {
          id: r.id,
          time,
          verdict: d.verdict as Verdict,
          title: String(d.title ?? d.verdict),
          reason: String(d.reason ?? ''),
          fear: num(d.fear),
          change: num(d.change),
          runway: num(d.runway),
        },
        ...s.decisions.filter((x) => x.id !== r.id),
      ].slice(0, 24),
    })
  }
  if (r.type === 'new_head' && d.attack !== undefined) {
    const n = num(d.attack)
    s.set({
      wrecks: [
        ...s.wrecks.filter((w) => w.n !== n),
        {
          n,
          time,
          fear: num(d.fear),
          change: num(d.change),
          spent: num(d.orbio),
          burned: num(d.hydra),
          heads: num(d.heads, s.heads),
          fud: Array.isArray(d.fud) ? (d.fud as string[]).slice(0, 4) : [],
          tx: typeof d.burn_tx === 'string' ? d.burn_tx : (r.tx_hash ?? undefined),
        },
      ].sort((a, b) => a.n - b.n),
    })
  }
  if (r.type === 'diary' && typeof d.text === 'string') s.set({ diary: d.text })
  if (r.type === 'mood_change' && typeof d.mood === 'string') s.set({ mood: d.mood as 'calm' | 'fear' | 'hype' })
}

/** Plays a fresh event on the creature. */
function perform(r: Row) {
  const s = sea()
  const d = r.data ?? {}
  const activity = ACTIVITY[r.type]
  if (!activity) return
  s.set({ activity })
  switch (r.type) {
    case 'feed':
      emit('plankton', 120)
      flow('trades-split', 'split-credit', 'split-stake')
      s.float(`+${num(d.credit).toFixed(1)} CREDIT`, 'jade')
      break
    case 'digest':
      emit('digest', 70)
      emit('inflow', 90)
      flow('credit-vault')
      s.float(`+${fmt(num(d.orbio))} ORBIO → Pearl Vault`, 'pearl')
      break
    case 'listen':
      pulses.sonarAt = now()
      flow('credit-brain')
      break
    case 'think':
      pulses.thoughtAt = now()
      emit('bubble', 12, RIG.mouths[0] ?? RIG.body, 0.2)
      break
    case 'hunted':
      s.set({ mood: 'fear' })
      s.float(`Fear ${num(d.fear)}/100`, 'ember')
      break
    case 'fight':
      emit('drain', 120)
      flow('vault-burn', 'vault-burn')
      pulses.flash = 0.6
      pulses.shake = 0.7
      for (const p of RIG.predators) emit('spark', 40, p, 0.4)
      break
    case 'burn':
      emit('ash', 300, new THREE.Vector3(RIG.body.x, RIG.body.y - 0.6, RIG.body.z), 0.35)
      s.float(`${fmt(num(d.hydra))} $HYDRA flushed forever`, 'gold')
      break
    case 'new_head':
      pulses.newHeadAt = now()
      s.set({ mood: 'calm' })
      s.float(`Attack #${num(d.attack)} repelled · a new head`, 'gold')
      break
    case 'post':
      emit('glyph', 1, RIG.mouths[0] ?? RIG.body)
      break
  }
  clearTimeout(idleTimer)
  if (activity !== 'sleeping') idleTimer = setTimeout(() => sea().set({ activity: 'idle' }), 7000)
}

function applyState(st: StateRow) {
  const p: Record<string, unknown> = {}
  if (st.mood) p.mood = st.mood
  if (st.heads !== undefined) p.heads = st.heads
  if (st.attacks !== undefined) p.attacks = st.attacks
  if (st.runway_days !== undefined) p.runwayDays = st.runway_days
  if (st.fear_score !== undefined) p.fearScore = st.fear_score
  if (st.price !== undefined) p.price = st.price
  if (st.change_24h !== undefined) p.change24h = st.change_24h
  if (st.burned !== undefined) p.burned = st.burned
  if (st.survivors !== undefined) p.survivors = st.survivors
  if (st.diary) p.diary = st.diary
  // The chain is the source of truth for the fund when it can be read.
  if (st.fund !== undefined && !HAS_VAULT) p.fund = st.fund
  sea().set(p)
}

type Supa = import('@supabase/supabase-js').SupabaseClient
let db: Supa | null = null

async function client() {
  if (db) return db
  const { createClient } = await import('@supabase/supabase-js')
  db = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: false } })
  return db
}

async function startFeed() {
  const c = await client()
  const [{ data: st }, { data: recent }, { data: first }, { data: heads }, { data: thoughts }] = await Promise.all([
    c.from('state').select('*').eq('id', 1).maybeSingle(),
    c.from('events').select('*').order('time', { ascending: false }).limit(50),
    c.from('events').select('time').order('time', { ascending: true }).limit(1),
    c.from('events').select('*').eq('type', 'new_head').order('time', { ascending: true }).limit(50),
    c.from('events').select('*').eq('type', 'think').order('time', { ascending: false }).limit(24),
  ])
  if (!recent) throw new Error('events table is not readable with the anon key')
  sea().set({ live: true, events: [], decisions: [], wrecks: [], activity: 'idle' })
  if (st) applyState(st as StateRow)
  launchAt = first?.[0] ? Date.parse((first[0] as { time: string }).time) : Date.now()
  ;[...((heads ?? []) as Row[]), ...((thoughts ?? []) as Row[]).reverse(), ...((recent ?? []) as Row[]).reverse()].forEach(remember)
  loadStratum(sea().trenchLevel)
  c.channel('hydra')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (m) => {
      const r = m.new as Row
      remember(r)
      perform(r)
      if (sea().trenchLevel === 0) loadStratum(0)
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'state' }, (m) => applyState(m.new as StateRow))
    .subscribe()
}

async function startChain() {
  const { readVault } = await import('../chain/client')
  const tick = async () => {
    try {
      sea().set(await readVault())
    } catch (e) {
      console.warn('vault read failed', e)
    }
  }
  await tick()
  setInterval(tick, 30_000)
}

/** Loads one day of the Trench from the events table. Before launch every day is still unwritten. */
export async function loadStratum(level: number) {
  const s = sea()
  const date = TODAY - level * DAY
  if (!s.live || !db) return s.set({ stratum: { level, day: -1, date, events: [], unwritten: true, launch: false } })
  const unwritten = date + DAY <= launchAt - (launchAt % DAY)
  if (unwritten) return s.set({ stratum: { level, day: -1, date, events: [], unwritten: true, launch: false } })
  const { data } = await db
    .from('events')
    .select('*')
    .gte('time', new Date(date).toISOString())
    .lt('time', new Date(date + DAY).toISOString())
    .order('time', { ascending: false })
    .limit(50)
  if (sea().trenchLevel !== level) return
  const st: Stratum = {
    level,
    day: Math.floor((date - (launchAt - (launchAt % DAY))) / DAY),
    date,
    events: ((data ?? []) as Row[]).filter((r) => ACTIVITY[r.type]).map(toMemory),
    unwritten: false,
    launch: date <= launchAt && launchAt < date + DAY,
  }
  s.set({ stratum: st })
}

export function startLive() {
  // The Trench follows the visitor down, a day at a time.
  let last = sea().trenchLevel
  useSea.subscribe((s) => {
    if (s.trenchLevel !== last) {
      last = s.trenchLevel
      loadStratum(last)
    }
  })
  loadStratum(last)
  if (HAS_LIVE_FEED) startFeed().catch((e) => console.warn('live feed failed', e))
  if (HAS_VAULT) startChain()
}
