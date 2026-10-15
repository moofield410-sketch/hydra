import * as THREE from 'three'

export type FxKind = 'plankton' | 'digest' | 'ash' | 'spark' | 'bubble' | 'glyph' | 'inflow' | 'drain'

export type FxRequest = { kind: FxKind; count: number; origin?: THREE.Vector3; spread?: number }

// One-shot effect requests from the life scripts; drained by <Particles/> each frame.
export const fxQueue: FxRequest[] = []

export function emit(kind: FxKind, count: number, origin?: THREE.Vector3, spread = 0.3) {
  fxQueue.push({ kind, count, origin: origin?.clone(), spread })
}

// Money moving through The Current: each request sends one bright spark down an edge.
export type FlowEdge = 'trades-split' | 'split-stake' | 'split-credit' | 'stake-credit' | 'credit-brain' | 'credit-vault' | 'vault-burn'
export const flowQueue: FlowEdge[] = []
export const flow = (...edges: FlowEdge[]) => void flowQueue.push(...edges)

// Scene-wide one-shots that are not particles.
export const pulses = {
  flash: 0, // seconds left of the strike flash
  shake: 0, // seconds left of camera shake
  newHeadAt: -1, // clock time a head started growing
  sonarAt: -10, // clock time of the last sonar ping
  thoughtAt: -10, // clock time of the newest decision (the coral pulses)
}

export const now = () => performance.now() / 1000
