import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { LayerGroup, useActive } from './LayerGroup'
import { HOUR_COLOR } from './Floor'
import { PALETTE, SEA } from '../theme'
import { useSea, type Activity } from '../state/store'
import { dive, diveProgress, easeInOut } from '../state/nav'
import { now } from '../state/fx'

// −10,500 fathoms and on forever. Each step down is one more day back in HYDRA's
// memory: the canyon's strata scroll past and that day's events hang as relics.
export function Trench() {
  return (
    <LayerGroup id="trench">
      <Walls />
      <Relics />
      <Unwritten />
    </LayerGroup>
  )
}

/** How far the strata have scrolled, eased through a Trench dive. */
function trenchScroll() {
  const s = useSea.getState()
  const p = diveProgress()
  if (p >= 0 && dive.from === 'trench' && dive.to === 'trench') return dive.trenchFrom + (dive.trenchTo - dive.trenchFrom) * easeInOut(p)
  return s.trenchLevel
}

function Walls() {
  const active = useActive()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { ...SEA, uScroll: { value: 0 }, uOrchid: { value: new THREE.Color(PALETTE.orchid) }, uGold: { value: new THREE.Color(PALETTE.gold) } },
        vertexShader: /* glsl */ `
          ${NOISE}
          uniform float uScroll;
          varying vec3 vP; varying float vRock;
          void main(){
            vec3 p = position;
            vRock = fbm(vec3(p.x * 0.4, (p.y - uScroll * 12.0) * 0.25, p.z * 0.4));
            p.xz *= 1.0 + vRock * 0.22;
            vP = p;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uScroll; uniform vec3 uMood, uOrchid, uGold;
          varying vec3 vP; varying float vRock;
          void main(){
            float y = vP.y - uScroll * 12.0;
            // one bright stratum per day, faint lines between
            float day = smoothstep(0.06, 0.0, abs(fract(y / 12.0) - 0.5));
            float lines = smoothstep(0.44, 0.5, abs(fract(y * 0.6 + vRock * 0.8) - 0.5));
            vec3 col = vec3(0.06, 0.035, 0.08) * (0.6 + vRock * 1.2);
            col += mix(uOrchid, uMood, 0.3) * lines * 0.18;
            col += uGold * day * 0.5;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  useFrame(() => {
    if (active.current) mat.uniforms.uScroll.value = trenchScroll()
  })
  return (
    <mesh material={mat} position={[0.4, 0, -3]} scale={[6.5, 1, 4.5]}>
      <cylinderGeometry args={[1, 1, 60, 64, 60, true]} />
    </mesh>
  )
}

const RELICS = 14

// One relic per remembered event, in a slow spiral down the canyon.
function shapeFor(a: Activity) {
  if (a === 'fighting' || a === 'hunted') return 'spike'
  if (a === 'burning' || a === 'growing') return 'ring'
  if (a === 'thinking' || a === 'listening') return 'orb'
  if (a === 'posting') return 'glyph'
  return 'shell'
}

function Relics() {
  return (
    <>
      {Array.from({ length: RELICS }, (_, i) => (
        <Relic key={i} slot={i} />
      ))}
    </>
  )
}

const GEOS = {
  spike: new THREE.OctahedronGeometry(0.22, 0).scale(1, 1.8, 1),
  ring: new THREE.TorusGeometry(0.2, 0.05, 8, 24),
  orb: new THREE.IcosahedronGeometry(0.17, 1),
  glyph: new THREE.TetrahedronGeometry(0.22, 0),
  shell: new THREE.DodecahedronGeometry(0.17, 0),
}

function Relic({ slot }: { slot: number }) {
  const active = useActive()
  const meshes = useRef<Record<string, THREE.Mesh | null>>({})
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uColor: { value: new THREE.Color() }, uLit: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uLit;
          varying vec3 vN; varying vec3 vV;
          void main(){
            float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
            gl_FragColor = vec4(uColor * (0.25 + f * 1.3) * (0.8 + uLit), 0.8);
          }`,
      }),
    [],
  )
  // Where this slot sits in the spiral; it rises in from below on each new day.
  const home = useMemo(() => {
    const a = slot * 1.1 + 0.4
    return new THREE.Vector3(Math.cos(a) * (1.4 + (slot % 3) * 0.6) - 0.6, 2.6 - slot * 0.42, Math.sin(a) * 1.4 - 0.6)
  }, [slot])
  const seenLevel = useRef<number | null>(null)
  const enter = useRef(1)
  const fromBelow = useRef(1)
  useFrame((_, rawDt) => {
    if (!active.current || !group.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    const st = useSea.getState().stratum
    const ev = st?.events[slot]
    if (st && seenLevel.current !== st.level) {
      fromBelow.current = seenLevel.current === null || st.level > seenLevel.current ? 1 : -1
      seenLevel.current = st.level
      enter.current = 0
    }
    group.current.visible = !!ev
    if (!ev) return
    enter.current = Math.min(1, enter.current + dt * (0.9 - slot * 0.03))
    const k = THREE.MathUtils.smootherstep(enter.current, 0, 1)
    const kind = shapeFor(ev.activity)
    for (const [name, m] of Object.entries(meshes.current)) if (m) m.visible = name === kind
    ;(mat.uniforms.uColor.value as THREE.Color).set(HOUR_COLOR[ev.activity] ?? PALETTE.pearl)
    mat.uniforms.uLit.value = ev.tx ? 0.6 : 0
    group.current.position.set(home.x, home.y - (1 - k) * 9 * fromBelow.current + Math.sin(t * 0.6 + slot) * 0.08, home.z)
    group.current.rotation.set(t * 0.2 + slot, t * 0.3, 0)
    group.current.scale.setScalar(0.6 + k * 0.6)
  })
  return (
    <group ref={group}>
      {(Object.keys(GEOS) as (keyof typeof GEOS)[]).map((name) => (
        <mesh key={name} ref={(m) => void (meshes.current[name] = m)} geometry={GEOS[name]} material={mat} />
      ))}
    </group>
  )
}

// Below launch day: a soft orchid glow where nothing has happened yet.
function Unwritten() {
  const active = useActive()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uOn: { value: 0 }, uOrchid: { value: new THREE.Color(PALETTE.orchid) } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uOn; uniform vec3 uOrchid;
          varying vec2 vUv;
          void main(){
            float r = length(vUv);
            float n = 0.6 + 0.4 * fbm(vec3(vUv * 2.0, uTime * 0.1));
            gl_FragColor = vec4(mix(uOrchid, vec3(1.0), 0.3) * n, smoothstep(1.0, 0.0, r) * 0.45 * uOn);
          }`,
      }),
    [],
  )
  useFrame((_, rawDt) => {
    if (!active.current) return
    const on = useSea.getState().stratum?.unwritten ? 1 : 0
    mat.uniforms.uOn.value += (on - mat.uniforms.uOn.value) * Math.min(1, rawDt * 2)
  })
  return (
    <mesh position={[-0.4, 0, -2]} material={mat}>
      <planeGeometry args={[9, 9]} />
    </mesh>
  )
}
