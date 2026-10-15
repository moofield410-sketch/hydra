import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { LayerGroup, useActive } from './LayerGroup'
import { fishGeometry, fishMaterial } from './fish'
import { PALETTE, SEA } from '../theme'
import { useSea } from '../state/store'
import { now } from '../state/fx'

// −10,000 fathoms. Every wallet that held through an attack swims here as a small
// fish. Connect a wallet and yours lights up and swims out to meet you.
const MAX_FISH = 480

/** Which fish in the shoal belongs to this address. Stable for the same address. */
export function fishIndex(address: string, count: number) {
  let h = 2166136261
  for (const c of address.toLowerCase()) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0) % Math.max(1, Math.min(count, MAX_FISH))
}

export function Grotto() {
  return (
    <LayerGroup id="grotto">
      <Cave />
      <Pool />
      <Stalactites />
      <Shoal />
      <pointLight position={[0, -1.5, 1]} intensity={6} distance={14} color={PALETTE.gold} />
    </LayerGroup>
  )
}

function Cave() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { ...SEA, uGold: { value: new THREE.Color(PALETTE.gold) } },
        vertexShader: /* glsl */ `
          ${NOISE}
          varying vec3 vP; varying float vRock;
          void main(){
            vec3 p = position;
            vRock = fbm(normalize(p) * 3.0);
            p *= 1.0 + vRock * 0.18;
            vP = p;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime; uniform vec3 uMood, uGold;
          varying vec3 vP; varying float vRock;
          void main(){
            vec3 d = normalize(vP);
            float veins = smoothstep(0.03, 0.0, abs(snoise(d * 5.0 + vec3(0.0, uTime * 0.02, 0.0))));
            float floorGlow = smoothstep(0.2, -0.6, d.y);
            vec3 col = vec3(0.07, 0.04, 0.09) * (0.7 + vRock);
            col += mix(uGold, uMood, 0.4) * veins * (0.25 + 0.15 * sin(uTime + d.x * 4.0));
            col += uGold * floorGlow * 0.12;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  return (
    <mesh material={mat} position={[0, 1, -2]} scale={[16, 9, 13]}>
      <icosahedronGeometry args={[1, 5]} />
    </mesh>
  )
}

function Pool() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uGold: { value: new THREE.Color(PALETTE.gold) } },
        vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uGold, uMood;
          varying vec2 vP;
          void main(){
            float r = length(vP);
            float rings = 0.5 + 0.5 * sin(r * 7.0 - uTime * 1.2);
            float a = smoothstep(4.2, 0.0, r) * (0.25 + rings * 0.2);
            gl_FragColor = vec4(mix(uGold, uMood, 0.3) * 1.3, a);
          }`,
      }),
    [],
  )
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.9, -0.5]} material={mat}>
      <circleGeometry args={[4.2, 64]} />
    </mesh>
  )
}

function Stalactites({ count = 46 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.ConeGeometry(0.18, 1, 6).rotateX(Math.PI), [])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...SEA, uGold: { value: new THREE.Color(PALETTE.gold) } },
        vertexShader: /* glsl */ `
          varying float vH;
          void main(){ vH = position.y + 0.5; gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uGold;
          varying float vH;
          void main(){
            float tip = smoothstep(0.25, 0.0, vH);
            vec3 col = vec3(0.09, 0.05, 0.11) + uGold * tip * (1.6 + 0.4 * sin(uTime * 2.0));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  const placed = useRef(false)
  useFrame(() => {
    const m = ref.current
    if (!m || placed.current) return
    placed.current = true
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const a = i * 2.399
      const r = 1.5 + Math.sqrt(i / count) * 10
      const h = 0.6 + ((i * 53) % 13) / 13 * 2.2
      o.position.set(Math.cos(a) * r, 6.2 - h / 2, Math.sin(a) * r * 0.8 - 2)
      o.scale.set(1 + (i % 3) * 0.4, h, 1 + (i % 3) * 0.4)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

function Shoal() {
  const active = useActive()
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(fishGeometry, [])
  const mat = useMemo(fishMaterial, [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const ahead = useMemo(() => new THREE.Vector3(), [])
  const fish = useMemo(
    () =>
      Array.from({ length: MAX_FISH }, (_, i) => ({
        r: 1.6 + (((i * 7919) % 1000) / 1000) * 3.2,
        h: -2 + (((i * 104729) % 1000) / 1000) * 3.6,
        speed: 0.12 + (((i * 31) % 100) / 100) * 0.16,
        phase: i * 0.7,
        tilt: (((i * 13) % 100) / 100 - 0.5) * 0.6,
      })),
    [],
  )
  const palette = useMemo(() => [PALETTE.jade, PALETTE.pearl, PALETTE.orchid, PALETTE.jade].map((c) => new THREE.Color(c).multiplyScalar(0.55)), [])
  const mine = useMemo(() => new THREE.Color(PALETTE.gold).multiplyScalar(2.4), [])
  const meet = useRef(0)
  const lastMine = useRef(-1)
  useFrame((_, rawDt) => {
    const m = ref.current
    if (!active.current || !m) return
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    const { survivors, wallet } = useSea.getState()
    const count = Math.min(survivors, MAX_FISH)
    m.count = count
    const myIndex = wallet ? fishIndex(wallet, count) : -1
    if (myIndex !== lastMine.current) {
      for (let i = 0; i < count; i++) m.setColorAt(i, i === myIndex ? mine : palette[i % palette.length])
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      lastMine.current = myIndex
      meet.current = 0
    }
    meet.current = Math.min(1, meet.current + dt * 0.35)
    const scatter = 1 + SEA.uFear.value * 0.6
    for (let i = 0; i < count; i++) {
      const f = fish[i]
      const a = f.phase + t * f.speed
      const r = f.r * scatter
      const y = f.h + Math.sin(a * 2 + i) * 0.25
      if (i === myIndex) {
        // Leave the shoal and come out to circle just in front of the visitor.
        const k = THREE.MathUtils.smootherstep(meet.current, 0, 1)
        const near = new THREE.Vector3(0.6 + Math.cos(t * 1.1) * 0.7, 0.2 + Math.sin(t * 1.7) * 0.25, 4.2 + Math.sin(t * 1.1) * 0.5)
        const away = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r * 0.7 - 1)
        tmp.position.lerpVectors(away, near, k)
        ahead.set(0.6 + Math.cos(t * 1.1 + 0.2) * 0.7, near.y, 4.2 + Math.sin(t * 1.1 + 0.2) * 0.5)
        ahead.lerpVectors(new THREE.Vector3(Math.cos(a + 0.1) * r, y, Math.sin(a + 0.1) * r * 0.7 - 1), ahead, k)
        tmp.lookAt(ahead)
        tmp.scale.setScalar(0.16 + k * 0.08)
      } else {
        tmp.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.7 - 1)
        ahead.set(Math.cos(a + 0.1) * r, y + f.tilt * 0.1, Math.sin(a + 0.1) * r * 0.7 - 1)
        tmp.lookAt(ahead)
        tmp.scale.setScalar(0.085)
      }
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, MAX_FISH]} frustumCulled={false} />
}
