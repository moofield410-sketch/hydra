// The sound of the sea, synthesized so there is nothing to download: a deep drone,
// HYDRA's heartbeat (faster under attack, slow in sleep) and a whoosh on every dive.
// Off by default; it only starts after the visitor turns it on.
import { useSea } from './state/store'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let beatTimer: ReturnType<typeof setTimeout> | undefined
let noise: AudioBuffer | null = null

const PREF = 'hydra.sound'

export function soundPreferred() {
  try {
    return localStorage.getItem(PREF) === 'on'
  } catch {
    return false
  }
}

function bpm() {
  const { activity, mood } = useSea.getState()
  if (activity === 'sleeping') return 40
  if (activity === 'fighting' || activity === 'burning') return 112
  if (mood === 'fear' || activity === 'hunted') return 92
  if (mood === 'hype') return 72
  return 56
}

function thump(at: number, gain: number, freq: number) {
  if (!ctx || !master) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(freq, at)
  o.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.18)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28)
  o.connect(g).connect(master)
  o.start(at)
  o.stop(at + 0.3)
}

function beat() {
  if (!ctx) return
  const t = ctx.currentTime + 0.02
  thump(t, 0.5, 62)
  thump(t + 0.17, 0.3, 54)
  beatTimer = setTimeout(beat, 60_000 / bpm())
}

function drone() {
  if (!ctx || !master) return
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 240
  const g = ctx.createGain()
  g.gain.value = 0.05
  for (const f of [41.2, 41.7, 61.8]) {
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.connect(filter)
    o.start()
  }
  // a slow swell, like breathing water
  const lfo = ctx.createOscillator()
  const depth = ctx.createGain()
  lfo.frequency.value = 0.07
  depth.gain.value = 0.025
  lfo.connect(depth).connect(g.gain)
  lfo.start()
  filter.connect(g).connect(master)
}

export function whoosh() {
  if (!ctx || !master || ctx.state !== 'running') return
  if (!noise) {
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noise
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 0.8
  const t = ctx.currentTime
  f.frequency.setValueAtTime(900, t)
  f.frequency.exponentialRampToValueAtTime(160, t + 1.8)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + 2)
}

export async function setSound(on: boolean) {
  useSea.getState().set({ sound: on })
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off')
  } catch {
    /* private mode: the choice just isn't remembered */
  }
  if (on) {
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.7
      master.connect(ctx.destination)
      drone()
    }
    await ctx.resume()
    clearTimeout(beatTimer)
    beat()
  } else {
    clearTimeout(beatTimer)
    await ctx?.suspend()
  }
}

// Every dive gets its rush of water.
let lastTarget: string | null = null
useSea.subscribe((s) => {
  if (s.diveTarget && s.diveTarget !== lastTarget && s.sound) whoosh()
  lastTarget = s.diveTarget
})
