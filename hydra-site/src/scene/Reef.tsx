import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { LiveTube } from './tube'
import { LayerGroup, useActive } from './LayerGroup'
import { SandFloor } from './SandFloor'
import { Shafts } from './Water'
import { MOOD_COLOR, SEA, type Mood } from '../theme'
import { previewMood, useSea } from '../state/store'
import { now } from '../state/fx'

// −200 fathoms. Three lantern creatures, one per mood. Hover one and the whole sea
// shows what that mood looks like.
export const LANTERNS: { mood: Mood; pos: [number, number, number]; size: number }[] = [
  { mood: 'fear', pos: [-3.1, 0.3, -0.4], size: 0.85 },
  { mood: 'calm', pos: [-0.5, 0.9, -1.2], size: 1.05 },
  { mood: 'hype', pos: [2.0, 0.2, 0.2], size: 0.8 },
]


export function Reef() {
  return (
    <LayerGroup id="reef">
      <SandFloor tint="#C66BFF" glow={0.25} />
      <Shafts y={0} count={6} />
      <Stalks />
      {LANTERNS.map((l) => (
        <Lantern key={l.mood} {...l} />
      ))}
    </LayerGroup>
  )
}

function bellMaterial(color: string) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { ...SEA, uColor: { value: new THREE.Color(color) }, uPulse: { value: 0 }, uLit: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uPulse;
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        vec3 p = position;
        float squeeze = 1.0 - uPulse * 0.16 * (1.0 - p.y);
        p.xz *= squeeze;
        p.y *= 1.0 + uPulse * 0.08;
        vH = position.y;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLit; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float rib = pow(abs(sin(atan(vN.z, vN.x) * 8.0)), 12.0) * 0.4;
        float rim = smoothstep(0.12, 0.0, vH) * 0.8;
        vec3 col = uColor * (0.08 + f * 0.7 + rib * f + rim) * (0.7 + uLit * 0.9);
        gl_FragColor = vec4(col, 0.6);
      }`,
  })
}

const TENTACLES = 6

function Lantern({ mood, pos, size }: { mood: Mood; pos: [number, number, number]; size: number }) {
  const active = useActive()
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.Mesh>(null)
  const color = MOOD_COLOR[mood]
  const bell = useMemo(() => bellMaterial(color), [color])
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), toneMapped: false }), [color])
  const tentMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.9), transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [color],
  )
  const tentacles = useMemo(
    () =>
      Array.from({ length: TENTACLES }, (_, i) => ({
        tube: new LiveTube(28, 5),
        curve: new THREE.CatmullRomCurve3(Array.from({ length: 6 }, () => new THREE.Vector3())),
        a: (i / TENTACLES) * Math.PI * 2,
        len: 1.6 + (i % 3) * 0.5,
      })),
    [],
  )
  const lit = useRef(0)
  const phase = useMemo(() => Math.random() * 6, [])
  useFrame((_, rawDt) => {
    if (!active.current || !group.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = now() + phase
    const { moodPreview, mood: real } = useSea.getState()
    const on = moodPreview === mood ? 1 : !moodPreview && real === mood ? 0.45 : 0
    lit.current += (on - lit.current) * (1 - Math.exp(-4 * dt))
    // Jellyfish swim: a squeeze, a glide, a gentle bob.
    const beat = Math.pow(Math.max(0, Math.sin(t * 1.6)), 3)
    bell.uniforms.uPulse.value = beat
    bell.uniforms.uLit.value = lit.current
    group.current.position.set(pos[0], pos[1] + Math.sin(t * 0.5) * 0.25 + beat * 0.06, pos[2])
    group.current.scale.setScalar(size * (1 + lit.current * 0.12))
    if (core.current) core.current.scale.setScalar(0.28 + beat * 0.05 + lit.current * 0.08)
    tentacles.forEach((tt, i) => {
      tt.curve.points.forEach((p, k) => {
        const u = k / (tt.curve.points.length - 1)
        const r = 0.62 * (1 - u * 0.5) * (1 - beat * 0.15)
        const sway = Math.sin(t * 1.3 - u * 3 + i) * 0.25 * u
        p.set(Math.cos(tt.a) * r + sway, -0.05 - u * tt.len, Math.sin(tt.a) * r + Math.cos(t + i) * 0.2 * u)
      })
      tt.curve.updateArcLengths()
      tt.tube.update(tt.curve, (u) => 0.035 * (1 - u) + 0.006)
    })
  })
  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    previewMood(mood)
    document.body.style.cursor = 'pointer'
  }
  const leave = () => {
    previewMood(null)
    document.body.style.cursor = ''
  }
  return (
    <group ref={group}>
      <mesh material={bell} scale={[1, 0.8, 1]} onPointerOver={enter} onPointerOut={leave} onPointerDown={enter}>
        <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh ref={core} material={glow} position={[0, 0.25, 0]}>
        <icosahedronGeometry args={[1, 2]} />
      </mesh>
      {tentacles.map((tt, i) => (
        <mesh key={i} geometry={tt.tube.geometry} material={tentMat} frustumCulled={false} />
      ))}
    </group>
  )
}

// Glowing reef stalks swaying across the floor, tinted by the mood on show.
function Stalks({ count = 150 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA },
        vertexShader: /* glsl */ `
          uniform float uTime;
          varying float vH;
          void main(){
            vec3 p = position;
            vH = position.y + 0.5;
            vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec4 w = instanceMatrix * vec4(p, 1.0);
            w.x += sin(uTime * 0.9 + base.x * 0.7 + base.z) * 0.25 * vH * vH;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uMood;
          varying float vH;
          void main(){
            float tip = smoothstep(0.8, 1.0, vH);
            gl_FragColor = vec4(uMood * (0.25 + tip * 2.2), 0.25 + tip * 0.6);
          }`,
      }),
    [],
  )
  const geo = useMemo(() => new THREE.CylinderGeometry(0.015, 0.035, 1, 5, 6), [])
  const placed = useRef(false)
  useFrame(() => {
    const m = ref.current
    if (!m || placed.current) return
    placed.current = true
    const o = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      const a = i * 2.399
      const r = 2.2 + Math.sqrt(i / count) * 9
      const h = 0.6 + ((i * 37) % 11) / 11 * 1.8
      o.position.set(Math.cos(a) * r, -2.95 + h / 2, Math.sin(a) * r - 2)
      o.scale.set(1, h, 1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}
