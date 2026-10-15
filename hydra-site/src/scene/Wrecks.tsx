import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LayerGroup, useActive } from './LayerGroup'
import { SandFloor } from './SandFloor'
import { Shafts } from './Water'
import { PALETTE, SEA } from '../theme'
import { useSea } from '../state/store'

// −8,000 fathoms. The glowing skeletons of every predator HYDRA has beaten, one per
// attack, each crossed by the gold scar of the burn that ended it.
const SLOTS: { pos: [number, number, number]; rot: number; size: number }[] = [
  { pos: [-0.6, -2.75, 0.9], rot: 0.25, size: 1.0 },
  { pos: [2.2, -2.8, -0.6], rot: 0.5, size: 0.95 },
  { pos: [-2.9, -2.8, -1.8], rot: -0.6, size: 0.95 },
  { pos: [0.9, -2.85, -3.2], rot: 1.1, size: 0.9 },
  { pos: [-2.2, -2.85, -4.6], rot: -2.0, size: 0.85 },
  { pos: [3.6, -2.85, -3.8], rot: 0.6, size: 0.85 },
  { pos: [-0.8, -2.85, -6.4], rot: 2.4, size: 0.8 },
  { pos: [-5.0, -2.85, -5.4], rot: -1.3, size: 0.8 },
]

// One predator skeleton as a single geometry: skull, spine and ribs, with `aU` running
// 0 at the skull to 1 at the tail so the shader can place the scar and the pulse.
function skeleton(seed: number) {
  const len = 3.4
  const pts = Array.from({ length: 7 }, (_, i) => {
    const u = i / 6
    return new THREE.Vector3(-len / 2 + u * len, 0.05 + Math.sin(u * 3 + seed) * 0.05, Math.sin(u * 5.5 + seed * 2) * 0.35)
  })
  const spine = new THREE.CatmullRomCurve3(pts)
  const parts: THREE.BufferGeometry[] = []
  const tag = (g: THREE.BufferGeometry, u: number) => {
    const ng = g.index ? g.toNonIndexed() : g
    ng.deleteAttribute('uv')
    ng.setAttribute('aU', new THREE.Float32BufferAttribute(new Array(ng.attributes.position.count).fill(u), 1))
    parts.push(ng)
  }
  const p = new THREE.Vector3()
  const tan = new THREE.Vector3()
  const side = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  // skull and jaw
  tag(new THREE.ConeGeometry(0.2, 0.62, 6).rotateZ(Math.PI / 2).translate(pts[0].x - 0.28, pts[0].y + 0.04, pts[0].z), 0)
  tag(new THREE.ConeGeometry(0.12, 0.5, 5).rotateZ(Math.PI / 2 + 0.25).translate(pts[0].x - 0.24, pts[0].y - 0.12, pts[0].z), 0)
  const V = 30
  for (let i = 0; i < V; i++) {
    const u = 0.04 + (i / (V - 1)) * 0.94
    spine.getPointAt(u, p)
    spine.getTangentAt(u, tan)
    const r = 0.075 * (1 - u * 0.65)
    tag(new THREE.IcosahedronGeometry(r, 0).translate(p.x, p.y, p.z), u)
    // ribs along the front half, curving down to the sand
    if (u > 0.1 && u < 0.62 && i % 2 === 0) {
      side.crossVectors(tan, up).normalize()
      for (const s of [1, -1]) {
        const reach = 0.5 * (1 - Math.abs(u - 0.32) * 1.6)
        const rib = new THREE.CatmullRomCurve3([
          p.clone(),
          p.clone().addScaledVector(side, s * reach * 0.6).add(new THREE.Vector3(0, 0.22, 0)),
          p.clone().addScaledVector(side, s * reach).add(new THREE.Vector3(0, -0.05, 0)),
          p.clone().addScaledVector(side, s * reach * 0.9).add(new THREE.Vector3(0.05, -0.25, 0)),
        ])
        tag(new THREE.TubeGeometry(rib, 10, 0.016, 4), u)
      }
    }
  }
  tag(new THREE.TubeGeometry(spine, 80, 0.025, 5), 0.5)
  return mergeGeometries(parts)!
}

const boneMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      ...SEA,
      uEmber: { value: new THREE.Color(PALETTE.ember) },
      uGold: { value: new THREE.Color(PALETTE.gold) },
      uScar: { value: 0.4 },
      uLit: { value: 0 },
      uSeed: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aU;
      varying float vU; varying float vF;
      void main(){
        vU = aU;
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vF = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uScar, uLit, uSeed;
      uniform vec3 uEmber, uGold;
      varying float vU; varying float vF;
      void main(){
        // a slow ember heartbeat still running down the dead spine
        float pulse = 0.5 + 0.5 * sin(vU * 14.0 - uTime * 1.3 + uSeed);
        vec3 col = uEmber * (0.3 + vF * 0.8 + pulse * 0.2) * (1.1 + uLit * 0.9);
        float scar = smoothstep(0.06, 0.015, abs(vU - uScar));
        col = mix(col, uGold * (1.6 + uLit), scar);
        gl_FragColor = vec4(col, 0.85);
      }`,
  })

export function Wrecks() {
  return (
    <LayerGroup id="wrecks">
      <SandFloor tint={PALETTE.ember} glow={0.3} />
      <Shafts y={0} count={5} />
      {SLOTS.map((s, i) => (
        <Wreck key={i} slot={i} {...s} />
      ))}
    </LayerGroup>
  )
}

function Wreck({ slot, pos, rot, size }: { slot: number; pos: [number, number, number]; rot: number; size: number }) {
  const active = useActive()
  const group = useRef<THREE.Group>(null)
  const geo = useMemo(() => skeleton(slot * 1.7 + 0.4), [slot])
  const mat = useMemo(() => {
    const m = boneMaterial()
    m.uniforms.uSeed.value = slot * 2.1
    m.uniforms.uScar.value = 0.3 + ((slot * 0.37) % 0.4)
    return m
  }, [slot])
  const lit = useRef(0)
  useFrame((_, rawDt) => {
    if (!active.current || !group.current) return
    const { wrecks, selectedWreck } = useSea.getState()
    // The newest attack lies in the front slot.
    const w = wrecks[wrecks.length - 1 - slot]
    group.current.visible = !!w
    if (!w) return
    const on = selectedWreck === w.n ? 1 : 0
    lit.current += (on - lit.current) * (1 - Math.exp(-5 * Math.min(rawDt, 0.05)))
    mat.uniforms.uLit.value = lit.current
  })
  const pick = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const { wrecks, set } = useSea.getState()
    const w = wrecks[wrecks.length - 1 - slot]
    if (w) set({ selectedWreck: w.n })
  }
  return (
    <group ref={group} position={pos} rotation={[0, rot, 0]} scale={size}>
      <mesh
        geometry={geo}
        material={mat}
        onPointerDown={pick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      {/* the burn mark it left in the sand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]}>
        <circleGeometry args={[1.6, 40]} />
        <meshBasicMaterial color={PALETTE.ember} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}
