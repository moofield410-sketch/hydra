import { useSea } from './store'
import { now } from './fx'
import { LAYERS, TRENCH_STEP, layer, layerIndex, layerY, type LayerId } from './layers'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const BASE = reducedMotion ? 0.6 : 1.9

// The dive in progress, read every frame by the camera and the depth readout.
// A dive inside the Trench keeps `from === to` and moves `trenchFrom → trenchTo` instead.
export const dive = {
  from: 'membrane' as LayerId,
  to: 'membrane' as LayerId,
  trenchFrom: 0,
  trenchTo: 0,
  start: -1,
  dur: BASE,
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** 0..1 while diving, or -1 when still. */
export function diveProgress() {
  if (dive.start < 0) return -1
  return Math.min(1, (now() - dive.start) / dive.dur)
}

function begin(to: LayerId, dur: number, trenchTo: number) {
  const s = useSea.getState()
  dive.from = s.layer
  dive.to = to
  dive.trenchFrom = s.trenchLevel
  dive.trenchTo = trenchTo
  dive.dur = dur
  dive.start = now()
  s.set({ diveTarget: to, moodPreview: null })
  // The panel swaps at the deepest, blurriest point of the dive.
  setTimeout(() => useSea.getState().set({ layer: to, trenchLevel: trenchTo, selectedDecision: null, selectedWreck: null }), dur * 500)
  setTimeout(() => {
    dive.start = -1
    useSea.getState().set({ diveTarget: null })
    try {
      history.replaceState(null, '', to === 'membrane' ? location.pathname + location.search : `#${to}`)
    } catch {
      /* sandboxed frames may refuse history changes */
    }
  }, dur * 1000)
}

export function diveTo(id: LayerId) {
  const s = useSea.getState()
  if (s.diveTarget) return
  if (id === s.layer) {
    // Clicking the Trench while deep inside it brings you back to its top.
    if (id === 'trench' && s.trenchLevel > 0) begin('trench', BASE, 0)
    return
  }
  // Longer jumps take a little longer, so passing layers stay readable.
  const steps = Math.abs(layerIndex(id) - layerIndex(s.layer))
  begin(id, Math.min(BASE * (1 + (steps - 1) * 0.22), BASE * 2.2), 0)
}

export function diveStep(dir: 1 | -1) {
  const s = useSea.getState()
  if (s.diveTarget) return
  // The Trench has no bottom: below it, every step is one more day back.
  if (s.layer === 'trench' && (dir > 0 || s.trenchLevel > 0)) {
    begin('trench', reducedMotion ? 0.5 : 1.3, s.trenchLevel + dir)
    return
  }
  const next = LAYERS[layerIndex(s.layer) + dir]
  if (next) diveTo(next.id)
}

/** Camera height for the current moment, mid-dive included. */
export function cameraLayerY() {
  const p = diveProgress()
  if (p < 0) return layerY(useSea.getState().layer)
  const e = easeInOut(p)
  return layerY(dive.from) + (layerY(dive.to) - layerY(dive.from)) * e
}

/** Blend of a per-layer number (like the camera aim) across a dive. */
export function acrossDive(get: (id: LayerId) => number) {
  const p = diveProgress()
  if (p < 0) return get(useSea.getState().layer)
  return get(dive.from) + (get(dive.to) - get(dive.from)) * easeInOut(p)
}

const fathomsAt = (id: LayerId, level: number) => layer(id).depth + (id === 'trench' ? level * TRENCH_STEP : 0)

/** Fathoms shown on the gauge, counting smoothly during a dive. */
export function depthReadout() {
  const p = diveProgress()
  const s = useSea.getState()
  if (p < 0) return fathomsAt(s.layer, s.trenchLevel)
  const a = fathomsAt(dive.from, dive.trenchFrom)
  const b = fathomsAt(dive.to, dive.trenchTo)
  return a + (b - a) * easeInOut(p)
}
