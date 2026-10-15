import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { LayerGroup, useActive } from './LayerGroup'
import { SandFloor } from './SandFloor'
import { Shafts } from './Water'
import { PALETTE, SEA } from '../theme'
import { useSea } from '../state/store'
import { now, pulses } from '../state/fx'
import { VERDICT_COLOR } from '../palette'

// −6,000 fathoms. A coral where every polyp is one decision HYDRA made.
// The newest pulses orchid; click any polyp to read the reasoning it gave.
const SLOTS = 24


type Branch = { curve: THREE.CatmullRomCurve3; tip: THREE.Vector3; geo: THREE.TubeGeometry }

// The same coral every visit: slot 0 (the newest decision) grows at the front.
function grow(): Branch[] {
  return Array.from({ length: SLOTS }, (_, i) => {
    const a = i * 2.399 + 0.6
    const ring = 0.35 + Math.sqrt(i / SLOTS) * 2.6
    const base = new THREE.Vector3(Math.cos(a) * ring * 0.55 - 0.6, -2.9, Math.sin(a) * ring * 0.45 - 0.6)
    const h = 3.6 - Math.sqrt(i / SLOTS) * 2.2 + Math.sin(i * 7.1) * 0.35
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a) * 0.8).multiplyScalar(0.25 + (i % 4) * 0.12)
    const pts = [0, 0.3, 0.6, 1].map((u) =>
      base
        .clone()
        .add(out.clone().multiplyScalar(u * u * 3))
        .add(new THREE.Vector3(Math.sin(u * 5 + i) * 0.12, u * h, Math.cos(u * 4 + i) * 0.12)),
    )
    const curve = new THREE.CatmullRomCurve3(pts)
    const geo = new THREE.TubeGeometry(curve, 24, 0.06, 6)
    // taper the branch toward its polyp
    const pos = geo.attributes.position as THREE.BufferAttribute
    const uv = geo.attributes.uv as THREE.BufferAttribute
    const c = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) {
      const u = uv.getX(k)
      curve.getPointAt(u, c)
      const scale = 1.6 - u * 1.1
      pos.setXYZ(k, c.x + (pos.getX(k) - c.x) * scale, c.y + (pos.getY(k) - c.y) * scale, c.z + (pos.getZ(k) - c.z) * scale)
    }
    geo.computeVertexNormals()
    return { curve, tip: pts[3], geo }
  })
}

export function Coral() {
  const branches = useMemo(grow, [])
  return (
    <LayerGroup id="coral">
      <SandFloor tint={PALETTE.orchid} glow={0.4} />
      <Shafts y={0} count={6} />
      <Stems branches={branches} />
      {branches.map((b, i) => (
        <Polyp key={i} slot={i} tip={b.tip} />
      ))}
    </LayerGroup>
  )
}

function Stems({ branches }: { branches: Branch[] }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...SEA, uOrchid: { value: new THREE.Color(PALETTE.orchid) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying float vF;
          void main(){
            vUv = uv;
            vec3 n = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uThink; uniform vec3 uOrchid, uMood;
          varying vec2 vUv; varying float vF;
          void main(){
            float rise = 0.5 + 0.5 * sin(vUv.x * 30.0 - uTime * (1.5 + uThink * 4.0));
            vec3 col = vec3(0.16, 0.08, 0.22) * (0.6 + vUv.x * 0.6);
            col += mix(uOrchid, uMood, 0.25) * (pow(vF, 2.0) * 0.6 + rise * vUv.x * 0.18 * (1.0 + uThink));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  return (
    <>
      {branches.map((b, i) => (
        <mesh key={i} geometry={b.geo} material={mat} />
      ))}
    </>
  )
}

function crownGeometry() {
  // A ring of tentacles around the polyp's mouth, pointing up and out.
  const parts: THREE.BufferGeometry[] = []
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2
    const g = new THREE.ConeGeometry(0.035, 0.34, 4).translate(0, 0.17, 0)
    g.rotateZ(-0.7).rotateY(a)
    parts.push(g)
  }
  const out = new THREE.BufferGeometry()
  const pos: number[] = []
  const nor: number[] = []
  for (const g of parts) {
    const ng = g.toNonIndexed()
    pos.push(...(ng.attributes.position.array as Float32Array))
    nor.push(...(ng.attributes.normal.array as Float32Array))
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  return out
}

function Polyp({ slot, tip }: { slot: number; tip: THREE.Vector3 }) {
  const active = useActive()
  const group = useRef<THREE.Group>(null)
  const crown = useRef<THREE.Mesh>(null)
  const crownGeo = useMemo(crownGeometry, [])
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.orchid), toneMapped: false, transparent: true }), [])
  const crownMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.orchid), toneMapped: false, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    [],
  )
  const target = useMemo(() => new THREE.Color(), [])
  const open = useRef(0.6)
  useFrame((_, rawDt) => {
    if (!active.current || !group.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    const { decisions, selectedDecision } = useSea.getState()
    const d = decisions[slot]
    group.current.visible = !!d
    if (!d) return
    const selected = selectedDecision === d.id
    const newest = slot === 0
    const fresh = Math.max(0, 1 - (t - pulses.thoughtAt) / 4)
    let glow = 0.55 + (selected ? 1.4 : 0) + (newest ? 0.6 + Math.sin(t * 3) * 0.4 + fresh * 1.5 : 0)
    if (useSea.getState().activity === 'sleeping') glow *= 0.55
    target.set(newest ? PALETTE.orchid : VERDICT_COLOR[d.verdict]).multiplyScalar(glow)
    bulbMat.color.lerp(target, 1 - Math.exp(-6 * dt))
    crownMat.color.copy(bulbMat.color).multiplyScalar(0.8)
    // Polyps open when watched or chosen, and close a little while HYDRA sleeps.
    const want = selected ? 1.25 : SEA.uSleep.value > 0.5 ? 0.35 : 0.75 + Math.sin(t * 1.2 + slot) * 0.15
    open.current += (want - open.current) * (1 - Math.exp(-3 * dt))
    if (crown.current) crown.current.scale.set(open.current, 0.6 + open.current * 0.5, open.current)
    group.current.scale.setScalar(selected ? 1.35 : 1)
  })
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const d = useSea.getState().decisions[slot]
    if (d) useSea.getState().set({ selectedDecision: d.id })
  }
  return (
    <group ref={group} position={tip}>
      <mesh
        material={bulbMat}
        onPointerDown={pick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <icosahedronGeometry args={[0.13, 2]} />
      </mesh>
      <mesh ref={crown} geometry={crownGeo} material={crownMat} position={[0, 0.06, 0]} />
    </group>
  )
}
