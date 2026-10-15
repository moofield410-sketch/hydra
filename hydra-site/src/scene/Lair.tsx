import { useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { Shafts, Water } from './Water'
import { Floor } from './Floor'
import { Hydra } from './Hydra'
import { Predators } from './Predators'
import { Particles, RisingLight, Sonar } from './Particles'
import { Vault } from './Vault'
import { Membrane } from './Membrane'
import { Reef } from './Reef'
import { SpawnPool } from './SpawnPool'
import { Current } from './Current'
import { Coral } from './Coral'
import { Wrecks } from './Wrecks'
import { Grotto } from './Grotto'
import { Trench } from './Trench'
import { LayerGroup } from './LayerGroup'
import { lowerQuality } from '../quality'
import { MOOD_COLOR, PALETTE, RIG, SEA } from '../theme'
import { useSea } from '../state/store'
import { now, pulses } from '../state/fx'
import { acrossDive, cameraLayerY, dive, diveProgress } from '../state/nav'
import { layer as layerOf, layerIndex } from '../state/layers'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// The whole Ember Sea in one canvas. Layers sit at different depths and the camera dives between them.
export function Sea() {
  const quality = useSea((s) => s.quality)
  const start = useMemo(() => layerOf(useSea.getState().layer).y + 1.6, [])
  // The glow is decided once: mounting or unmounting it later flashes the whole screen.
  const glow = useMemo(() => useSea.getState().quality !== 'low', [])
  const born = useMemo(() => performance.now(), [])
  return (
    <Canvas
      dpr={quality === 'high' ? [1, 2] : quality === 'mid' ? [1, 1.5] : 1}
      camera={{ position: [0, start, 9.2], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(PALETTE.abyss)
        scene.fog = new THREE.FogExp2(PALETTE.abyss, 0.045)
      }}
    >
      {/* Step down a tier if the device cannot keep up, but not while the first frames compile shaders. */}
      <PerformanceMonitor
        onDecline={() => {
          if (performance.now() - born < 8000) return
          useSea.getState().set({ quality: lowerQuality(useSea.getState().quality) })
        }}
        flipflops={2}
      />
      <SeaDriver />
      <CameraRig />
      <ambientLight intensity={0.35} />
      <Water />
      <FollowCamera>
        <RisingLight count={quality === 'high' ? 1600 : quality === 'mid' ? 900 : 400} />
      </FollowCamera>
      <Membrane />
      <Reef />
      <SpawnPool />
      <LairLayer />
      <Vault />
      <Current />
      <Coral />
      <Wrecks />
      <Grotto />
      <Trench />
      <Particles />
      <Sonar />
      {glow && <Post full={quality === 'high'} />}
    </Canvas>
  )
}

function LairLayer() {
  return (
    <LayerGroup id="lair">
      <pointLight position={[0, -2.5, 1]} intensity={8} distance={12} color={PALETTE.jade} />
      <Shafts y={0} />
      <Floor />
      <Hydra />
      <Predators />
    </LayerGroup>
  )
}

// Keeps ambient fields (the rising light) around the camera at every depth.
function FollowCamera({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => ref.current?.position.set(0, camera.position.y - 1.6, 0))
  return <group ref={ref}>{children}</group>
}

// Eases every shared uniform toward what the agent is doing right now.
function SeaDriver() {
  const target = useMemo(() => new THREE.Color(), [])
  const abyss = useMemo(() => new THREE.Color(PALETTE.abyss), [])
  useFrame(({ scene, camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const { mood: real, moodPreview, activity, runwayDays } = useSea.getState()
    // On the Lantern Reef, hovering a lantern shows that mood across the whole sea.
    const mood = moodPreview ?? real
    const k = (rate: number) => 1 - Math.exp(-rate * dt)
    SEA.uTime.value = now()
    target.set(MOOD_COLOR[mood])
    SEA.uMood.value.lerp(target, k(mood === 'fear' ? 3 : 1.2))
    SEA.uFear.value += ((mood === 'fear' ? 1 : 0) - SEA.uFear.value) * k(2)
    SEA.uHype.value += ((mood === 'hype' ? 1 : 0) - SEA.uHype.value) * k(1.5)
    SEA.uSleep.value += ((activity === 'sleeping' ? 1 : 0) - SEA.uSleep.value) * k(0.8)
    const thinking = activity === 'thinking' || activity === 'listening'
    SEA.uThink.value += ((thinking ? 1 : 0) - SEA.uThink.value) * k(3)
    SEA.uHunger.value += ((runwayDays < 30 ? 1 : 0) - SEA.uHunger.value) * k(1)
    pulses.flash = Math.max(0, pulses.flash - dt)
    SEA.uFlash.value = Math.min(1, pulses.flash * 2)
    // Light falls upward: dim at the surface, brighter with every layer, easing off deep down.
    const d = -(camera.position.y - 1.6) / 30
    SEA.uDepth.value = d < 1 ? Math.max(d, -0.85) : 1 + Math.min(0.5, (d - 1) * 0.1)
    const p = diveProgress()
    SEA.uDive.value = p < 0 ? 0 : Math.sin(Math.PI * p)
    const fog = scene.fog as THREE.FogExp2 | null
    if (fog) fog.color.copy(SEA.uMood.value).multiplyScalar(0.06).add(abyss)
  })
  return null
}

// A slow drifting camera with cursor parallax, a shake on strikes, and the dive between layers.
function CameraRig() {
  const look = useMemo(() => new THREE.Vector3(), [])
  const ndc = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, pointer, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    pulses.shake = Math.max(0, pulses.shake - dt)
    const drift = reducedMotion ? 0 : 1
    const shake = reducedMotion ? 0 : pulses.shake * 0.12
    // Frame the open water: left of the panel on desktop, above the sheet on phones.
    const aspect = size.width / size.height
    const phone = size.width <= 760
    const halfV = Math.tan(THREE.MathUtils.degToRad(42 / 2))
    const p = diveProgress()
    const diving = p >= 0
    const arc = diving ? Math.sin(Math.PI * p) : 0
    const span = acrossDive((id) => layerOf(id).span ?? 3.4)
    const dist = Math.max(9.2, span / (halfV * aspect)) + arc * 3
    const shiftX = phone ? 0 : size.width > 1100 ? 1.0 : 0.8
    const baseY = cameraLayerY()
    // Each layer says where the camera should aim; phones aim lower, above the sheet.
    const aim = acrossDive((id) => (phone ? layerOf(id).phoneLook ?? -2.2 : layerOf(id).look ?? -0.7))
    look.set(shiftX, baseY + aim - arc * 2, 0)
    const tx = shiftX + pointer.x * 0.6 * drift + Math.sin(t * 0.13) * 0.4 * drift + (Math.random() - 0.5) * shake
    const ty = baseY + 1.6 + pointer.y * 0.35 * drift + Math.sin(t * 0.17) * 0.15 * drift + (Math.random() - 0.5) * shake
    camera.position.x += (tx - camera.position.x) * (1 - Math.exp(-2 * dt))
    // While diving the camera rides the dive curve exactly; otherwise it eases.
    camera.position.y = diving ? ty : camera.position.y + (ty - camera.position.y) * (1 - Math.exp(-2 * dt))
    camera.position.z += (dist - camera.position.z) * (1 - Math.exp(-3 * dt))
    camera.lookAt(look)
    if (diving && !reducedMotion) camera.rotateZ(arc * 0.06 * (layerIndex(dive.to) >= layerIndex(dive.from) ? 1 : -1))

    // Where the visitor is pointing, projected onto a plane in front of the creatures.
    ndc.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize()
    RIG.pointer.copy(camera.position).addScaledVector(ndc, (2.6 - camera.position.z) / ndc.z)
  })
  return null
}

function Post({ full }: { full: boolean }) {
  // The effect keeps this vector as its uniform value, so mutating it animates the effect.
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), [])
  useFrame(() => {
    const v = reducedMotion ? 0.0004 : 0.0006 + SEA.uFlash.value * 0.006 + SEA.uFear.value * 0.0012 + SEA.uDive.value * 0.004
    offset.set(v, v)
  })
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={full ? 0.9 : 0.75} luminanceThreshold={0.32} luminanceSmoothing={0.3} radius={0.7} />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} blendFunction={full ? BlendFunction.NORMAL : BlendFunction.SKIP} />
      <Noise opacity={0.035} blendFunction={full ? BlendFunction.SOFT_LIGHT : BlendFunction.SKIP} />
      <Vignette darkness={0.78} offset={0.22} />
    </EffectComposer>
  )
}
