import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { LayerGroup, useActive } from './LayerGroup'
import { Shafts } from './Water'
import { PALETTE, SEA } from '../theme'
import { useSea } from '../state/store'
import { flowQueue, now, type FlowEdge } from '../state/fx'

// −4,000 fathoms. Where every fee goes, drawn as a river of light between organs.
// Each real movement of money travels its vein as a bright spark.
type NodeId = 'trades' | 'split' | 'stake' | 'credit' | 'brain' | 'vault' | 'burn'

export const NODES: Record<NodeId, { pos: [number, number, number]; color: string; label: string; short: string; size: number }> = {
  trades: { pos: [-3.4, 1.6, -0.6], color: PALETTE.pearl, label: 'Trades on Pons', short: 'Trades', size: 0.32 },
  split: { pos: [-2.6, 0.8, 0.2], color: PALETTE.jade, label: 'Orbio fee split', short: 'Fee split', size: 0.4 },
  stake: { pos: [-3.4, -1.6, -0.5], color: PALETTE.orchid, label: '50% staked', short: 'Staked', size: 0.34 },
  credit: { pos: [-0.6, 0.0, 0.6], color: PALETTE.jade, label: 'CREDIT stomach', short: 'CREDIT', size: 0.5 },
  brain: { pos: [0.9, 2.1, -0.7], color: PALETTE.orchid, label: 'Brain: 60-day runway', short: 'Brain', size: 0.44 },
  vault: { pos: [1.1, -1.8, 0.4], color: PALETTE.gold, label: 'Pearl Vault', short: 'Vault', size: 0.5 },
  burn: { pos: [2.9, -0.2, -0.3], color: PALETTE.ember, label: 'Burn: 0x…dEaD', short: 'Burn', size: 0.36 },
}

const EDGES: Record<FlowEdge, [NodeId, NodeId]> = {
  'trades-split': ['trades', 'split'],
  'split-stake': ['split', 'stake'],
  'split-credit': ['split', 'credit'],
  'stake-credit': ['stake', 'credit'],
  'credit-brain': ['credit', 'brain'],
  'credit-vault': ['credit', 'vault'],
  'vault-burn': ['vault', 'burn'],
}
const EDGE_IDS = Object.keys(EDGES) as FlowEdge[]

function veinCurve(a: NodeId, b: NodeId, i: number) {
  const A = new THREE.Vector3(...NODES[a].pos)
  const B = new THREE.Vector3(...NODES[b].pos)
  const mid = A.clone().lerp(B, 0.5)
  const side = new THREE.Vector3(-(B.y - A.y), B.x - A.x, 0).normalize().multiplyScalar(0.35 * (i % 2 ? 1 : -1))
  return new THREE.CatmullRomCurve3([
    A,
    A.clone().lerp(mid, 0.5).add(side),
    mid.clone().add(side.clone().multiplyScalar(1.4)).setZ(mid.z + 0.4),
    mid.clone().lerp(B, 0.5).add(side),
    B,
  ])
}

export function Current() {
  const curves = useMemo(() => EDGE_IDS.map((e, i) => veinCurve(EDGES[e][0], EDGES[e][1], i)), [])
  return (
    <LayerGroup id="current">
      <Shafts y={0} count={5} />
      <Veins curves={curves} />
      <Flow curves={curves} />
      {(Object.keys(NODES) as NodeId[]).map((id) => (
        <Organ key={id} id={id} />
      ))}
      <Labels />
    </LayerGroup>
  )
}

// Edge brightness, bumped by sparks and decaying back to a resting glow.
const heat = Object.fromEntries(EDGE_IDS.map((e) => [e, 0])) as Record<FlowEdge, number>
const organPulse: Record<NodeId, number> = { trades: 0, split: 0, stake: 0, credit: 0, brain: 0, vault: 0, burn: 0 }

function veinMaterial(a: string, b: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...SEA, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uHeat: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying float vEdge;
      void main(){
        vUv = uv;
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vEdge = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uHeat, uSleep; uniform vec3 uA, uB;
      varying vec2 vUv; varying float vEdge;
      void main(){
        float flow = 0.5 + 0.5 * sin(vUv.x * 60.0 - uTime * (3.0 + uHeat * 6.0));
        vec3 col = mix(uA, uB, vUv.x) * (0.35 + flow * 0.4 + uHeat * 1.4);
        float a = pow(vEdge, 1.5) * (0.35 + uHeat * 0.5) * mix(1.0, 0.5, uSleep);
        gl_FragColor = vec4(col, a);
      }`,
  })
}

function Veins({ curves }: { curves: THREE.CatmullRomCurve3[] }) {
  const active = useActive()
  const parts = useMemo(
    () =>
      EDGE_IDS.map((e, i) => {
        const [a, b] = EDGES[e]
        return {
          e,
          core: new THREE.TubeGeometry(curves[i], 80, 0.045, 8),
          halo: new THREE.TubeGeometry(curves[i], 80, 0.16, 10),
          mat: veinMaterial(NODES[a].color, NODES[b].color),
          haloMat: veinMaterial(NODES[a].color, NODES[b].color),
        }
      }),
    [curves],
  )
  useFrame((_, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 0.05)
    for (const p of parts) {
      heat[p.e] = Math.max(0, heat[p.e] - dt * 0.6)
      p.mat.uniforms.uHeat.value = heat[p.e]
      p.haloMat.uniforms.uHeat.value = heat[p.e] * 0.5
    }
  })
  return (
    <>
      {parts.map((p) => (
        <group key={p.e}>
          <mesh geometry={p.core} material={p.mat} />
          <mesh geometry={p.halo} material={p.haloMat} />
        </group>
      ))}
    </>
  )
}

const AMBIENT = 18 // drifting motes per vein
const SPARKS = 24

// Motes drift down every vein all the time; a spark is one real movement of money.
function Flow({ curves }: { curves: THREE.CatmullRomCurve3[] }) {
  const active = useActive()
  const motes = useRef<THREE.InstancedMesh>(null)
  const sparks = useRef<THREE.InstancedMesh>(null)
  const live = useMemo(() => [] as { edge: number; t: number }[], [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const colors = useMemo(() => EDGE_IDS.map((e) => new THREE.Color(NODES[EDGES[e][1]].color).multiplyScalar(2.5)), [])
  const colored = useRef(false)
  useFrame((_, rawDt) => {
    // Drain the queue even when away, so arrivals do not pile up.
    while (flowQueue.length) {
      const e = flowQueue.shift()!
      if (live.length < SPARKS) live.push({ edge: EDGE_IDS.indexOf(e), t: 0 })
    }
    if (!active.current || !motes.current || !sparks.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    const m = motes.current
    if (!colored.current) {
      colored.current = true
      for (let i = 0; i < EDGE_IDS.length * AMBIENT; i++) m.setColorAt(i, colors[Math.floor(i / AMBIENT)].clone().multiplyScalar(0.35))
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    const sleepy = useSea.getState().activity === 'sleeping' ? 0.3 : 1
    EDGE_IDS.forEach((e, ei) => {
      for (let k = 0; k < AMBIENT; k++) {
        const u = (k / AMBIENT + t * 0.06 * sleepy * (1 + heat[e] * 2)) % 1
        curves[ei].getPointAt(u, p)
        tmp.position.copy(p)
        tmp.scale.setScalar(0.022 + heat[e] * 0.02)
        tmp.updateMatrix()
        m.setMatrixAt(ei * AMBIENT + k, tmp.matrix)
      }
    })
    m.instanceMatrix.needsUpdate = true
    const s = sparks.current
    for (let i = live.length - 1; i >= 0; i--) {
      const sp = live[i]
      sp.t += dt / 1.6
      const e = EDGE_IDS[sp.edge]
      heat[e] = Math.min(1.2, heat[e] + dt * 1.2)
      if (sp.t >= 1) {
        organPulse[EDGES[e][1]] = 1
        live.splice(i, 1)
      }
    }
    for (let i = 0; i < SPARKS; i++) {
      const sp = live[i]
      if (!sp) {
        tmp.scale.setScalar(0)
      } else {
        curves[sp.edge].getPointAt(THREE.MathUtils.smootherstep(sp.t, 0, 1), p)
        tmp.position.copy(p)
        tmp.scale.setScalar(0.09 + Math.sin(sp.t * Math.PI) * 0.05)
        s.setColorAt(i, colors[sp.edge])
      }
      tmp.updateMatrix()
      s.setMatrixAt(i, tmp.matrix)
    }
    s.instanceMatrix.needsUpdate = true
    if (s.instanceColor) s.instanceColor.needsUpdate = true
  })
  return (
    <>
      <instancedMesh ref={motes} args={[undefined, undefined, EDGE_IDS.length * AMBIENT]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={sparks} args={[undefined, undefined, SPARKS]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}

function Organ({ id }: { id: NodeId }) {
  const active = useActive()
  const n = NODES[id]
  const shell = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uColor: { value: new THREE.Color(n.color) }, uPulse: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uPulse;
          varying vec3 vN; varying vec3 vV;
          void main(){
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
            gl_FragColor = vec4(uColor * (0.15 + f * (0.9 + uPulse * 1.6)), 0.5);
          }`,
      }),
    [n.color],
  )
  const coreMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(n.color).multiplyScalar(1.6), toneMapped: false }), [n.color])
  const phase = useMemo(() => Math.random() * 6, [])
  useFrame((_, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 0.05)
    organPulse[id] = Math.max(0, organPulse[id] - dt * 1.2)
    const k = organPulse[id]
    const t = now() + phase
    shellMat.uniforms.uPulse.value = k
    shell.current?.scale.setScalar(n.size * (1 + Math.sin(t * 1.4) * 0.04 + k * 0.25))
    core.current?.scale.setScalar(n.size * (0.32 + k * 0.2))
  })
  return (
    <group position={n.pos}>
      <mesh ref={shell} material={shellMat}>
        <icosahedronGeometry args={[1, 4]} />
      </mesh>
      <mesh ref={core} material={coreMat}>
        <icosahedronGeometry args={[1, 2]} />
      </mesh>
    </group>
  )
}

// Real HTML labels, shown only once the visitor has arrived.
function Labels() {
  const here = useSea((s) => s.layer === 'current' && s.diveTarget === null)
  const phone = usePhone()
  if (!here) return null
  return (
    <>
      {(Object.keys(NODES) as NodeId[]).map((id) => {
        const n = NODES[id]
        return (
          <Html key={id} position={[n.pos[0], n.pos[1] - n.size - 0.22, n.pos[2]]} center zIndexRange={[2, 0]} style={{ pointerEvents: 'none' }}>
            <span className={`node-label ${phone ? 'sm' : ''}`} style={{ ['--c' as string]: n.color }}>
              {phone ? n.short : n.label}
            </span>
          </Html>
        )
      })}
    </>
  )
}

// Phones get the short names: the long ones collide on a narrow screen.
function usePhone() {
  const query = '(max-width: 760px)'
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setPhone(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return phone
}
