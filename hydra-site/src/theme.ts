import * as THREE from 'three'

import { PALETTE } from './palette'

export { PALETTE, MOOD_COLOR, type Mood } from './palette'

// Uniforms shared by every shader in the sea. Updated once per frame by <SeaDriver/>.
export const SEA = {
  uTime: { value: 0 },
  uMood: { value: new THREE.Color(PALETTE.jade) },
  uFear: { value: 0 },
  uHype: { value: 0 },
  uSleep: { value: 0 },
  uThink: { value: 0 },
  uHunger: { value: 0 },
  uFlash: { value: 0 },
  uDepth: { value: 0 }, // 0 at the Lair, rising with depth: the deeper, the brighter
  uDive: { value: 0 }, // 0..1..0 over a dive
}

// Live positions written by the Hydra each frame so effects can aim at it.
export const RIG = {
  mouths: [] as THREE.Vector3[],
  body: new THREE.Vector3(0, -1.1, 0),
  pearl: new THREE.Vector3(-3.6, -2.8, -2.2),
  vaultPearl: new THREE.Vector3(0, -31, 0),
  predators: [] as THREE.Vector3[],
  pointer: new THREE.Vector3(0, 0.5, 3),
}
