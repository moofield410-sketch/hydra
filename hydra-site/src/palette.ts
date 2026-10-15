// Colors and moods, kept free of three.js so the HUD and the 2D sea load without it.
import type { Activity } from './state/store'
import type { Verdict } from './state/history'

export const PALETTE = {
  abyss: '#0B0610',
  ink: '#1A0F24',
  jade: '#3EF2C4',
  ember: '#FF3B4E',
  gold: '#FFC94A',
  orchid: '#C66BFF',
  pearl: '#F4EEFF',
} as const

export type Mood = 'calm' | 'fear' | 'hype'

export const MOOD_COLOR: Record<Mood, string> = {
  calm: PALETTE.jade,
  fear: PALETTE.ember,
  hype: PALETTE.gold,
}

// What each hour of the 24h ring (and each memory in the Trench) is colored by.
export const HOUR_COLOR: Record<Activity, string> = {
  idle: '#8A7FA0',
  listening: PALETTE.orchid,
  thinking: PALETTE.orchid,
  feeding: PALETTE.jade,
  digesting: PALETTE.jade,
  hunted: PALETTE.ember,
  fighting: PALETTE.ember,
  burning: PALETTE.gold,
  growing: PALETTE.gold,
  posting: PALETTE.gold,
  sleeping: '#5B3F8C',
}

export const VERDICT_COLOR: Record<Verdict, string> = {
  hold: PALETTE.orchid,
  buyback: PALETTE.ember,
  save: PALETTE.gold,
  rest: '#8A7FC8',
}
