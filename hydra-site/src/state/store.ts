import { create } from 'zustand'
import type { Mood } from '../theme'
import { LAYERS, type LayerId } from './layers'
import type { Decision, Stratum, Wreck } from './history'
import type { Quality } from '../quality'

export type Activity =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'feeding'
  | 'digesting'
  | 'hunted'
  | 'fighting'
  | 'burning'
  | 'growing'
  | 'posting'
  | 'sleeping'

export const ACTIVITY_INFO: Record<Activity, { title: string; line: string }> = {
  idle: { title: 'Breathing', line: 'Resting between turns. Its eyes follow whoever is watching.' },
  listening: { title: 'Listening', line: 'Reading what X is saying about $HYDRA right now.' },
  thinking: { title: 'Thinking', line: 'Weighing fear, price and its runway before it decides.' },
  feeding: { title: 'Feeding', line: 'Trading fees have arrived. It is swallowing them as CREDIT.' },
  digesting: { title: 'Digesting', line: 'Spare CREDIT becomes ORBIO and sinks into the Pearl Vault.' },
  hunted: { title: 'Hunted', line: 'FUD is rising and the price is falling. Shapes are circling.' },
  fighting: { title: 'Fighting back', line: 'Buyback fired from the defense fund. Inside its hard caps.' },
  burning: { title: 'Burn vent', line: 'Flushing the bought-back $HYDRA out of existence.' },
  growing: { title: 'Growing a head', line: 'Attack repelled. Two grow back where one was cut.' },
  posting: { title: 'Speaking', line: 'Posting its receipt to X for everyone to check.' },
  sleeping: { title: 'Sleeping', line: 'Quiet hours. Thinking every few hours to save its runway.' },
}

export type SeaEvent = { id: number; time: number; activity: Activity; text: string }
export type Floater = { id: number; text: string; tone: 'jade' | 'ember' | 'gold' | 'orchid' | 'pearl' }

type HourSlot = Activity | null

type State = {
  mood: Mood
  activity: Activity
  heads: number
  attacks: number
  fund: number
  price: number
  change24h: number
  burned: number
  runwayDays: number
  fearScore: number
  diary: string
  events: SeaEvent[]
  floaters: Floater[]
  hours: HourSlot[]
  // navigation
  layer: LayerId
  diveTarget: LayerId | null
  trenchLevel: number
  stratum: Stratum | null
  // Lantern Reef: hovering a lantern previews that mood across the sea
  moodPreview: Mood | null
  // memory
  decisions: Decision[]
  selectedDecision: number | null
  wrecks: Wreck[]
  selectedWreck: number | null
  // Survivor Grotto
  survivors: number
  wallet: string | null
  // shell
  live: boolean // the agent's event feed is connected
  sound: boolean
  quality: Quality
  // Pearl Vault (read from the DefenseVault contract)
  seed: number
  swappedIn: number
  spent: number
  fundGoal: number
  dailyUsedPct: number
  weeklyUsedPct: number
  lastBuybackAt: number
  set: (p: Partial<State>) => void
  log: (activity: Activity, text: string) => void
  float: (text: string, tone: Floater['tone']) => void
}

let nextId = 1

// A shared link like /#vault opens straight at that layer; everyone else lands at the Membrane.
function startLayer(): LayerId {
  const h = typeof location !== 'undefined' ? location.hash.slice(1) : ''
  return LAYERS.find((l) => l.id === h)?.id ?? 'membrane'
}

export const useSea = create<State>((set, get) => ({
  mood: 'calm',
  activity: 'idle',
  // Until the agent's feed and the contracts answer, every number starts where HYDRA starts: one head, nothing yet.
  heads: 1,
  attacks: 0,
  fund: 0,
  price: 0,
  change24h: 0,
  burned: 0,
  runwayDays: 0,
  fearScore: 0,
  diary: '',
  events: [],
  floaters: [],
  hours: Array.from({ length: 24 }, () => null),
  layer: startLayer(),
  diveTarget: null,
  trenchLevel: 0,
  stratum: null,
  moodPreview: null,
  decisions: [],
  selectedDecision: null,
  wrecks: [],
  selectedWreck: null,
  survivors: 0,
  wallet: null,
  live: false,
  sound: false,
  quality: 'mid',
  seed: 0,
  swappedIn: 0,
  spent: 0,
  fundGoal: 30000,
  dailyUsedPct: 0,
  weeklyUsedPct: 0,
  lastBuybackAt: 0,
  set: (p) => set(p),
  log: (activity, text) => {
    const hours = get().hours.slice()
    hours[new Date().getUTCHours()] = activity
    set({
      events: [{ id: nextId++, time: Date.now(), activity, text }, ...get().events].slice(0, 40),
      hours,
    })
  },
  float: (text, tone) => {
    const id = nextId++
    set({ floaters: [...get().floaters, { id, text, tone }] })
    setTimeout(() => set({ floaters: get().floaters.filter((f) => f.id !== id) }), 2600)
  },
}))

/** Lantern Reef: show a mood across the whole sea without changing HYDRA's real one. */
export const previewMood = (m: Mood | null) => useSea.getState().set({ moodPreview: m })
