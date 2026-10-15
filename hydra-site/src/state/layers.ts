export type LayerId = 'membrane' | 'reef' | 'spawn' | 'lair' | 'vault' | 'current' | 'coral' | 'wrecks' | 'grotto' | 'trench'

export type Layer = {
  id: LayerId
  name: string
  depth: number // fathoms shown on the gauge
  y: number // world height of the layer's floor plane
  look?: number // where the camera aims, relative to y (desktop)
  phoneLook?: number // the same on phones, where the sheet covers the bottom
  span?: number // half-width of the scene that must stay in view on narrow screens
}

// Every layer of the Ember Sea, top to bottom, 30 world units apart.
export const LAYERS: Layer[] = [
  { id: 'membrane', name: 'The Membrane', depth: 0, y: 90, look: -0.4, phoneLook: -1.6 },
  { id: 'reef', name: 'Lantern Reef', depth: 200, y: 60, look: -0.3, phoneLook: -2.6 },
  { id: 'spawn', name: 'Spawning Pool', depth: 600, y: 30, look: -0.5, phoneLook: -2.6 },
  { id: 'lair', name: 'The Lair', depth: 1000, y: 0 },
  { id: 'vault', name: 'Pearl Vault', depth: 2500, y: -30, phoneLook: -3.6 },
  { id: 'current', name: 'The Current', depth: 4000, y: -60, look: -0.2, phoneLook: -3.9, span: 4.4 },
  { id: 'coral', name: 'Thinking Coral', depth: 6000, y: -90, look: -0.5, phoneLook: -2.8 },
  { id: 'wrecks', name: 'Wreck Field', depth: 8000, y: -120, look: -1.2, phoneLook: -3.4 },
  { id: 'grotto', name: 'Survivor Grotto', depth: 10000, y: -150, look: -0.4, phoneLook: -2.4 },
  { id: 'trench', name: 'Endless Trench', depth: 10500, y: -180, look: -0.2, phoneLook: -2.0 },
]

/** Each stratum of the Trench is one more day back in HYDRA's memory. */
export const TRENCH_STEP = 1000

export const layer = (id: LayerId) => LAYERS.find((l) => l.id === id)!
export const layerY = (id: LayerId) => layer(id).y
export const layerIndex = (id: LayerId) => LAYERS.findIndex((l) => l.id === id)
