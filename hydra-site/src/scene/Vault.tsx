import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { Shafts } from './Water'
import { fishGeometry, fishMaterial } from './fish'
import { PALETTE, SEA } from '../theme'
import { useSea } from '../state/store'
import { now } from '../state/fx'
import { layerY } from '../state/layers'

const Y = layerY('vault')
const PEARL_R = 1.25
const COOLDOWN_MS = 6 * 3600_000
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)

// −2,500 fathoms. The defense fund as a pearl: its liquid is the fund, every gold
// seam is a buyback it paid for, and the rings around it are the contract's caps.
export function Vault() {
  const group = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    if (group.current) group.current.visible = Math.abs(camera.position.y - (Y + 1.6)) < 26
  })
  return (
    <group ref={group} position={[0, Y, 0]}>
      <VaultFloor />
      <Shafts y={0} count={6} />
      <Clam />
      <Pearl />
      <CapRings />
      <InflowColumn />
      <Shoal />
    </group>
  )
}

function VaultFloor() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { ...SEA, uGold: { value: new THREE.Color(PALETTE.gold) } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime; uniform vec3 uMood, uGold;
          varying vec2 vP;
          void main(){
            float r = length(vP);
            float dunes = fbm(vec3(vP * 0.35, 0.0)) * 0.5 + 0.5;
            float glint = pow(max(0.0, snoise(vec3(vP * 9.0, uTime * 0.6))), 14.0) * 3.0;
            float under = smoothstep(5.5, 0.0, r);
            vec3 col = vec3(0.09, 0.05, 0.12) * (0.6 + dunes * 0.8);
            col += mix(uGold, uMood, 0.4) * under * 0.35;
            col += vec3(1.0, 0.92, 0.75) * glint;
            float a = smoothstep(15.0, 3.0, r);
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  )
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.95, 0]} material={mat}>
      <circleGeometry args={[15, 96]} />
    </mesh>
  )
}

function shellMaterial(flip: number) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...SEA, uFlip: { value: flip } },
    vertexShader: /* glsl */ `
      varying float vRib; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        float ang = atan(position.z, position.x);
        vRib = abs(sin(ang * 13.0));
        vH = position.y;
        vec3 p = position * (1.0 + vRib * 0.035 * position.y);
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFlip, uFear; uniform vec3 uMood;
      varying float vRib; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        bool inside = gl_FrontFacing == (uFlip > 0.5);
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        vec3 col;
        if (inside) {
          // nacre: iridescent, brighter toward the hinge
          vec3 irid = 0.5 + 0.5 * cos(6.2831 * (f * 0.9 + vRib * 0.12 + uTime * 0.03 + vec3(0.0, 0.33, 0.67)));
          col = mix(vec3(0.85, 0.8, 0.95), irid, 0.45) * (0.16 + 0.32 * f + 0.08 * vH);
          col = mix(col, uMood, 0.12);
        } else {
          col = vec3(0.13, 0.07, 0.18) * (0.7 + vRib * 0.6);
          col += uMood * pow(f, 3.0) * 0.6;
          col += uMood * smoothstep(0.92, 1.0, vRib) * 0.15 * (1.0 + uFear);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
}

// An open clam. It closes protectively while HYDRA is hunted and opens wide when it strikes.
function Clam() {
  const top = useRef<THREE.Group>(null)
  const bottomMat = useMemo(() => shellMaterial(1), [])
  const topMat = useMemo(() => shellMaterial(0), [])
  const open = useRef(1.05)
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const { activity } = useSea.getState()
    let target = 1.05 + Math.sin(now() * 0.5) * 0.04
    if (activity === 'hunted') target = 0.55
    if (activity === 'fighting' || activity === 'burning') target = 1.35
    if (activity === 'sleeping') target = 0.78
    open.current += (target - open.current) * damp(2.2, dt)
    if (top.current) top.current.rotation.x = -open.current
  })
  return (
    <group>
      <mesh material={bottomMat} position={[0, -2.0, 0]} scale={[2.8, -0.75, 2.4]}>
        <sphereGeometry args={[1, 96, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <group ref={top} position={[0, -2.0, -2.4]}>
        <mesh material={topMat} position={[0, 0, 2.4]} scale={[2.8, 0.75, 2.4]}>
          <sphereGeometry args={[1, 96, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
    </group>
  )
}

// Each seam is a wandering crack around the pearl: a tilted great circle bent by noise.
const SEAMS = /* glsl */ `
float seams(vec3 p, float count){
  float best = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float on = clamp(count - fi, 0.0, 1.0);
    if (on <= 0.0) break;
    vec3 axis = normalize(vec3(sin(fi * 2.39 + 0.5), cos(fi * 1.71) * 0.8, sin(fi * 3.13 + 1.2)));
    float d = dot(p, axis) + fbm(p * 2.2 + fi * 7.1) * 0.32;
    float w = 0.012 + 0.01 * (0.5 + 0.5 * snoise(p * 6.0 + fi));
    best = max(best, smoothstep(w, w * 0.25, abs(d)) * on);
  }
  return best;
}
`

function Pearl() {
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          ...SEA,
          uFill: { value: 0.5 },
          uSeams: { value: 2 },
          uDrain: { value: 0 },
          uJade: { value: new THREE.Color(PALETTE.jade) },
          uGold: { value: new THREE.Color(PALETTE.gold) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vO; varying vec3 vN; varying vec3 vV;
          void main(){
            vO = position;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          ${SEAMS}
          uniform float uTime, uFill, uSeams, uDrain, uFear;
          uniform vec3 uMood, uJade, uGold;
          varying vec3 vO; varying vec3 vN; varying vec3 vV;
          void main(){
            float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
            float level = mix(-0.9, 0.9, uFill)
              + sin(vO.x * 5.0 + uTime * 1.4) * 0.03 + sin(vO.z * 4.0 - uTime * 1.1) * 0.03
              + uDrain * sin(atan(vO.z, vO.x) * 6.0 + uTime * 8.0) * 0.06;
            float wet = step(vO.y, level);
            float caustic = 0.5 + 0.5 * snoise(vO * 4.0 + vec3(0.0, uTime * 0.6, 0.0));
            vec3 liquid = mix(uJade * 0.7, uGold, smoothstep(-1.0, level, vO.y) * 0.8) * (0.42 + caustic * 0.32);
            liquid = mix(liquid, vec3(0.96, 0.93, 1.0) * 0.5, 0.18 + f * 0.3);
            liquid = mix(liquid, uMood, 0.12);
            vec3 irid = 0.5 + 0.5 * cos(6.2831 * (f * 1.1 + uTime * 0.04 + vec3(0.0, 0.33, 0.67)));
            vec3 glass = mix(vec3(0.95, 0.92, 1.0), irid, 0.5) * (0.12 + f * 0.9);
            vec3 col = mix(glass, liquid, wet);
            col += vec3(1.0, 0.96, 0.85) * smoothstep(0.03, 0.0, abs(vO.y - level)) * 1.1;
            // kintsugi: one gold seam per buyback the vault has paid for
            float seam = seams(normalize(vO), uSeams);
            col = mix(col, uGold * 2.2, seam);
            float a = mix(0.38 + f * 0.55, 1.0, max(wet, seam));
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  )
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const { fund, fundGoal, attacks, activity } = useSea.getState()
    const u = mat.uniforms
    const fill = THREE.MathUtils.clamp(fund / fundGoal, 0.05, 0.98)
    u.uFill.value += (fill - u.uFill.value) * damp(1.5, dt)
    u.uSeams.value += (attacks - u.uSeams.value) * damp(2, dt)
    const draining = activity === 'fighting' || activity === 'burning'
    u.uDrain.value += ((draining ? 1 : 0) - u.uDrain.value) * damp(3, dt)
    if (mesh.current) {
      const t = now()
      mesh.current.position.y = -1 + Math.sin(t * 0.8) * 0.06
      mesh.current.rotation.y = t * 0.08
    }
  })
  return (
    <mesh ref={mesh} material={mat} position={[0, -1, 0]} scale={PEARL_R} renderOrder={2}>
      <sphereGeometry args={[1, 96, 64]} />
    </mesh>
  )
}

// The contract's hard limits, drawn as rings around the pearl.
function CapRings() {
  const daily = useSea((s) => s.dailyUsedPct)
  const weekly = useSea((s) => s.weeklyUsedPct)
  const last = useSea((s) => s.lastBuybackAt)
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])
  const cooldown = Math.min(1, (clock - last) / COOLDOWN_MS)
  const rings = [
    { r: 1.85, frac: daily / 10, color: daily >= 8 ? PALETTE.ember : PALETTE.jade, tilt: 0.18 },
    { r: 2.2, frac: weekly / 30, color: PALETTE.orchid, tilt: -0.12 },
    { r: 2.55, frac: cooldown, color: PALETTE.gold, tilt: 0.06 },
  ]
  const group = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = group.current
    if (!g) return
    g.children.forEach((c, i) => (c.rotation.z = now() * (0.05 + i * 0.03) * (i % 2 ? -1 : 1)))
  })
  return (
    <group ref={group} position={[0, -1, 0]}>
      {rings.map((ring, i) => (
        <CapRing key={i} {...ring} />
      ))}
    </group>
  )
}

function CapRing({ r, frac, color, tilt }: { r: number; frac: number; color: string; tilt: number }) {
  const f = Math.max(0.004, Math.round(Math.min(1, frac) * 200) / 200)
  const fill = useMemo(() => new THREE.TorusGeometry(r, 0.028, 8, 160, Math.PI * 2 * f), [r, f])
  const track = useMemo(() => new THREE.TorusGeometry(r, 0.008, 6, 160), [r])
  useEffect(() => () => fill.dispose(), [fill])
  // A full ring means "nothing left to wait for": it glows softly instead of shouting.
  const glow = new THREE.Color(color).multiplyScalar(f >= 1 ? 0.9 : 2.2)
  return (
    <group rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <mesh geometry={track}>
        <meshBasicMaterial color={PALETTE.pearl} transparent opacity={0.15} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh geometry={fill}>
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      <mesh position={[Math.cos(Math.PI * 2 * f) * r, Math.sin(Math.PI * 2 * f) * r, 0]}>
        <sphereGeometry args={[0.06, 12, 8]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
    </group>
  )
}

// A thread of light from the Lair above: spare CREDIT arriving as ORBIO.
function InflowColumn() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uOn: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uTime, uOn; uniform vec3 uMood;
          varying vec2 vUv;
          void main(){
            float pulse = 0.5 + 0.5 * sin(vUv.y * 40.0 + uTime * 9.0);
            float a = (0.08 + uOn * 0.5) * (0.5 + pulse * 0.5) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
            gl_FragColor = vec4(mix(uMood, vec3(1.0), 0.3) * 1.5, a);
          }`,
      }),
    [],
  )
  useFrame((_, rawDt) => {
    const on = useSea.getState().activity === 'digesting' ? 1 : 0
    mat.uniforms.uOn.value += (on - mat.uniforms.uOn.value) * damp(3, Math.min(rawDt, 0.05))
  })
  return (
    <mesh material={mat} position={[0, 4.4, 0]}>
      <cylinderGeometry args={[0.05, 0.16, 9.5, 16, 1, true]} />
    </mesh>
  )
}

// Lantern fish that keep the vault company. They scatter when fear rises.
function Shoal({ count = 22 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const fish = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r: 3.2 + (i % 5) * 0.6,
        h: -1.8 + (i % 7) * 0.55,
        speed: 0.18 + (i % 4) * 0.06,
        phase: (i / count) * Math.PI * 2 * 3,
        dir: i % 3 === 0 ? -1 : 1,
      })),
    [count],
  )
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const colors = useMemo(() => [PALETTE.gold, PALETTE.jade, PALETTE.pearl].map((c) => new THREE.Color(c).multiplyScalar(0.8)), [])
  const geo = useMemo(fishGeometry, [])
  const mat = useMemo(fishMaterial, [])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    fish.forEach((_, i) => m.setColorAt(i, colors[i % colors.length]))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [fish, colors])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const t = now()
    const scatter = 1 + SEA.uFear.value * 0.8
    fish.forEach((f, i) => {
      const a = f.phase + t * f.speed * f.dir * (1 + SEA.uFear.value * 1.5)
      const r = f.r * scatter
      tmp.position.set(Math.cos(a) * r, f.h + Math.sin(t * 1.3 + i) * 0.15, Math.sin(a) * r * 0.75)
      const ahead = a + 0.1 * f.dir
      tmp.lookAt(Math.cos(ahead) * r, tmp.position.y, Math.sin(ahead) * r * 0.75)
      tmp.scale.setScalar(0.09)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
  )
}
