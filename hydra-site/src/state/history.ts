// HYDRA's memory: decisions (Thinking Coral), attacks survived (Wreck Field) and
// every event by day (Endless Trench), all read from the agent's events table.
import type { Activity } from './store'

export type Verdict = 'hold' | 'buyback' | 'save' | 'rest'

export type Decision = {
  id: number
  time: number
  verdict: Verdict
  title: string
  reason: string
  fear: number
  change: number
  runway: number
}

export type Wreck = {
  n: number
  time: number
  fear: number
  change: number
  spent: number
  burned: number
  heads: number
  fud: string[]
  tx?: string
}

export type Memory = { time: number; activity: Activity; text: string; tx?: string }

export type Stratum = { level: number; day: number; date: number; events: Memory[]; unwritten: boolean; launch: boolean }

export const DAY = 86_400_000
const NOW = Date.now()
export const TODAY = NOW - (NOW % DAY)
