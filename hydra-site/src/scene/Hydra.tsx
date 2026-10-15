import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { LiveTube } from './tube'
import { glassFlesh, glowBasic } from './materials'
import { PALETTE, RIG, SEA } from '../theme'
import { useSea } from '../state/store'
import { now, pulses } from '../state/fx'

const BODY = RIG.body
const easeOutBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2)
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const UP = new THREE.Vector3(0, 1, 0)
const X_AXIS = new THREE.Vector3(1, 0, 0)

export function Hydra() {
  const heads = useSea((s) => s.heads)
  // Only ever shrink here; each Neck fills its own slot, so growing never leaves a hole.
  if (RIG.mouths.length > heads) RIG.mouths.length = heads
  return (
    <group>
      <Body />
      <Tail />
      {Array.from({ length: heads }, (_, i) => (
        <Neck key={i} index={i} count={heads} />
      ))}
    </group>
  )
}

function heartRate() {
  const { activity, mood } = useSea.getState()
  if (activity === 'sleeping') return 0.45
  if (activity === 'hunted' || activity === 'fighting') return 2.4
  if (mood === 'hype') return 1.6
  return 1
}

function Body() {
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => glassFlesh(1), [])
  const heart = useRef<THREE.Mesh>(null)
  const glands = useRef<THREE.Group>(null)
  const heartMat = useMemo(() => glowBasic(PALETTE.jade, 2), [])
  const glandMat = useMemo(() => glowBasic(PALETTE.orchid, 1.6), [])
  const phase = useRef(0)

  useFrame((_, dt) => {
    phase.current += dt * heartRate() * Math.PI * 2
    const beat = Math.pow(Math.max(0, Math.sin(phase.current)), 6)
    mat.uniforms.uBreath.value = Math.sin(phase.current * 0.25)
    if (heart.current) heart.current.scale.setScalar(0.22 + beat * 0.08)
    heartMat.color.copy(SEA.uMood.value).multiplyScalar(1.6 + beat * 2.4)
    if (glands.current) {
      glands.current.rotation.y += dt * 0.3
      glands.current.children.forEach((c, i) => c.scale.setScalar(0.07 + 0.03 * Math.sin(now() * 2 + i * 1.7) + SEA.uThink.value * 0.04))
    }
    if (group.current) {
      const t = now()
      group.current.position.set(BODY.x, BODY.y + Math.sin(t * 0.6) * 0.08 - SEA.uSleep.value * 0.25, BODY.z)
      group.current.rotation.y = Math.sin(t * 0.2) * 0.15
    }
  })

  return (
    <group ref={group}>
      <mesh ref={heart} material={heartMat}>
        <sphereGeometry args={[1, 24, 16]} />
      </mesh>
      <group ref={glands}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 0.5, Math.sin(i * 2.3) * 0.25, Math.sin(a) * 0.4]} material={glandMat}>
              <sphereGeometry args={[1, 16, 12]} />
            </mesh>
          )
        })}
      </group>
      <mesh material={mat} scale={[1.15, 0.92, 1.0]}>
        <icosahedronGeometry args={[1.05, 6]} />
      </mesh>
    </group>
  )
}

function Tail() {
  const tube = useMemo(() => new LiveTube(36, 12), [])
  const mat = useMemo(() => glassFlesh(0), [])
  const curve = useMemo(() => new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3()), false, 'centripetal'), [])
  useFrame(() => {
    const t = now()
    const sleep = SEA.uSleep.value
    const pts = curve.points
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1)
      const sway = Math.sin(t * 1.1 - u * 3) * 0.6 * u * (1 - sleep * 0.6)
      pts[i].set(BODY.x + sway + u * u * 1.5 * sleep, BODY.y - 0.4 - u * 1.4 + sleep * u * 0.6, BODY.z - 0.6 - u * 3.2 + sleep * u * 1.5)
    }
    curve.updateArcLengths()
    tube.update(curve, (u) => 0.42 * (1 - u) + 0.03)
  })
  return <mesh geometry={tube.geometry} material={mat} />
}

type NeckProps = { index: number; count: number }

function Neck({ index, count }: NeckProps) {
  const tube = useMemo(() => new LiveTube(40, 12), [])
  const mat = useMemo(() => glassFlesh(0), [])
  const curve = useMemo(() => new THREE.CatmullRomCurve3([0, 1, 2, 3].map(() => new THREE.Vector3()), false, 'centripetal'), [])
  const headRef = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const jaw = useRef<THREE.Group>(null)
  const state = useRef({
    head: new THREE.Vector3(),
    look: new THREE.Vector3(0, 0.5, 4),
    init: false,
    poke: -10,
    blinkAt: now() + 2 + Math.random() * 4,
    blinkStart: -10,
    born: pulses.newHeadAt > 0 && index === count - 1 ? pulses.newHeadAt : -1,
  })

  const headMat = useMemo(() => glassFlesh(0), [])
  const eyeMat = useMemo(() => glowBasic(PALETTE.pearl, 1.8), [])
  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#07030A' }), [])
  const crestMat = useMemo(() => glowBasic(PALETTE.orchid, 1.6), [])
  const snoutMat = useMemo(() => glowBasic(PALETTE.jade, 2.5), [])

  const tmp = useMemo(
    () => ({ base: new THREE.Vector3(), target: new THREE.Vector3(), fwd: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4() }),
    [],
  )

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = state.current
    const t = now()
    const { activity, mood } = useSea.getState()
    const sleep = SEA.uSleep.value
    const hype = mood === 'hype'
    const tt = t * (hype ? 1.8 : 1)

    // Rest pose: heads fan out in front of the body, alternating heights.
    const spread = count === 1 ? 0 : Math.min(0.38 * (count - 1), 1.5)
    const a = count === 1 ? 0 : -spread + (2 * spread * index) / (count - 1)
    const tier = index % 3
    tmp.base.set(BODY.x + Math.sin(a) * 0.5, BODY.y + 0.5, BODY.z + Math.cos(a) * 0.25)

    const R = 1.5 + (index % 2) * 0.25
    const H = 1.75 + tier * 0.32
    const target = tmp.target.set(BODY.x + Math.sin(a) * R, BODY.y + H, BODY.z + Math.cos(a) * R * 0.6 + 0.5)
    target.x += Math.sin(tt * 0.6 + index * 1.3) * 0.18
    target.y += Math.sin(tt * 0.9 + index) * 0.14
    target.z += Math.cos(tt * 0.5 + index * 0.7) * 0.12

    if (activity === 'listening' || activity === 'thinking') target.y += 0.35
    if (activity === 'hunted') target.addScaledVector(target.clone().sub(tmp.base).setY(0).normalize(), -0.25)
    target.y -= SEA.uHunger.value * 0.35
    // Sleeping: necks fold down and curl toward the body.
    if (sleep > 0.01) {
      const curl = tmp.fwd.set(BODY.x + Math.sin(a) * 1.1, BODY.y + 0.15, BODY.z + Math.cos(a) * 1.0 + 0.3)
      target.lerp(curl, sleep)
    }

    // Who it looks at: the visitor, or the nearest predator when hunted.
    let look = RIG.pointer
    if ((activity === 'hunted' || activity === 'fighting') && RIG.predators.length) {
      look = RIG.predators[index % RIG.predators.length]
    }
    if (activity === 'fighting' && RIG.predators.length) {
      target.lerp(look, 0.35 + 0.1 * Math.sin(t * 20 + index))
    }
    if (activity === 'feeding') target.y += Math.sin(t * 6 + index) * 0.06

    // Poke recoil
    const sincePoke = t - s.poke
    if (sincePoke < 1.2) {
      const k = Math.exp(-sincePoke * 4) * Math.sin(sincePoke * 14)
      if (mood === 'fear') target.lerp(new THREE.Vector3(0, 0.6, 6), Math.max(0, k) * 0.5)
      else target.z -= k * 0.4
    }

    if (!s.init) {
      s.head.copy(target)
      s.init = true
    }
    const speed = activity === 'fighting' ? 9 : sincePoke < 1.2 ? 10 : 2.6
    s.head.lerp(target, damp(speed, dt))
    s.look.lerp(look, damp(3, dt))

    // Growth of a freshly sprouted head
    let g = 1
    if (s.born > 0) g = THREE.MathUtils.clamp((t - s.born) / 2.4, 0, 1)
    const gh = easeOutBack(g)
    const headPos = tmp.fwd.copy(tmp.base).lerp(s.head, gh)

    // Neck spine
    const p = curve.points
    p[0].copy(tmp.base)
    p[1].copy(tmp.base).add(new THREE.Vector3(Math.sin(a) * 0.25, 0.65 * gh, Math.cos(a) * 0.15))
    p[2].copy(tmp.base).lerp(headPos, 0.65)
    p[2].y += 0.35 * gh
    p[2].x += Math.sin(tt * 1.3 + index) * 0.1
    const back = new THREE.Vector3().subVectors(s.look, headPos).normalize()
    p[3].copy(headPos).addScaledVector(back, -0.22 * gh)
    curve.updateArcLengths()
    tube.update(curve, (u) => (0.21 - u * 0.09) * (0.25 + 0.75 * g))

    const head = headRef.current
    if (head) {
      head.position.copy(headPos)
      // Matrix4.lookAt(target, eye) aims +Z, the snout, at the target.
      tmp.m.lookAt(s.look, headPos, UP)
      tmp.q.setFromRotationMatrix(tmp.m)
      if (sleep > 0.01) tmp.q.multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, sleep * 0.6))
      head.quaternion.slerp(tmp.q, damp(6, dt))
      head.scale.setScalar(0.25 + 0.75 * g)
    }

    // Mouth position for effects
    const mouth = (RIG.mouths[index] ??= new THREE.Vector3())
    mouth.set(0, -0.05, 0.42)
    if (head) head.localToWorld(mouth)

    // Blinks, closed eyes while asleep
    if (t > s.blinkAt) {
      s.blinkStart = t
      s.blinkAt = t + 2.5 + Math.random() * 5
    }
    const sinceBlink = t - s.blinkStart
    const blink = sinceBlink < 0.16 ? Math.sin((sinceBlink / 0.16) * Math.PI) : 0
    const open = Math.max(0.06, (1 - blink) * (1 - sleep * 0.95) * (sincePoke < 0.25 ? 0.1 : 1))
    if (eyes.current) eyes.current.scale.set(1, open, 1)

    // Jaw: snaps while fighting, chews while feeding
    if (jaw.current) {
      let o = 0.05
      if (activity === 'fighting') o = 0.35 + 0.3 * Math.sin(t * 22 + index)
      else if (activity === 'feeding') o = 0.15 + 0.15 * Math.sin(t * 7 + index * 2)
      else if (mood === 'fear') o = 0.12
      jaw.current.rotation.x = THREE.MathUtils.lerp(jaw.current.rotation.x, o, damp(10, dt))
    }
    snoutMat.color.copy(SEA.uMood.value).multiplyScalar(2.6)
    eyeMat.color.set(mood === 'fear' ? PALETTE.ember : PALETTE.gold).multiplyScalar(1.8)
  })

  const poke = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    state.current.poke = now()
  }

  return (
    <group>
      <mesh geometry={tube.geometry} material={mat} />
      <group
        ref={headRef}
        onPointerDown={poke}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <mesh material={headMat} scale={[0.25, 0.19, 0.48]}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
        <group ref={jaw} position={[0, -0.1, 0.02]}>
          <mesh material={headMat} scale={[0.19, 0.06, 0.38]} position={[0, 0, 0.14]}>
            <sphereGeometry args={[1, 24, 16]} />
          </mesh>
        </group>
        <mesh position={[0, -0.01, 0.47]} material={snoutMat}>
          <sphereGeometry args={[0.035, 12, 8]} />
        </mesh>
        <group ref={eyes} position={[0, 0.07, 0.2]}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.15, 0, 0]}>
              <mesh material={eyeMat}>
                <sphereGeometry args={[0.048, 16, 12]} />
              </mesh>
              <mesh material={pupilMat} position={[0, 0, 0.034]} scale={[0.3, 1.1, 0.5]}>
                <sphereGeometry args={[0.036, 12, 8]} />
              </mesh>
            </group>
          ))}
        </group>
        {[0, 1, 2].map((i) => (
          <mesh key={i} material={crestMat} position={[0, 0.2 - i * 0.02, 0.05 - i * 0.16]} rotation={[-0.5, 0, 0]}>
            <coneGeometry args={[0.025, 0.15 - i * 0.03, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
