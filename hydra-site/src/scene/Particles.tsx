import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE, RIG, SEA } from '../theme'
import { fxQueue, now, pulses, type FxKind } from '../state/fx'
import { useSea } from '../state/store'

const POOL = 1800

const pointShader = {
  vertexShader: /* glsl */ `
    attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
    uniform float uPixel;
    varying vec3 vColor; varying float vAlpha;
    void main(){
      vColor = aColor; vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uPixel * (320.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      a = a * a * vAlpha;
      if (a < 0.003) discard;
      gl_FragColor = vec4(vColor * (1.0 + a), a);
    }`,
}

const COLORS: Record<FxKind, THREE.Color[]> = {
  plankton: [new THREE.Color(PALETTE.jade), new THREE.Color(PALETTE.pearl)],
  digest: [new THREE.Color(PALETTE.jade), new THREE.Color(PALETTE.gold)],
  ash: [new THREE.Color('#B8862E'), new THREE.Color('#5A3A1A'), new THREE.Color(PALETTE.gold)],
  spark: [new THREE.Color(PALETTE.ember), new THREE.Color(PALETTE.gold)],
  bubble: [new THREE.Color(PALETTE.orchid), new THREE.Color(PALETTE.pearl)],
  glyph: [new THREE.Color(PALETTE.gold), new THREE.Color(PALETTE.pearl)],
  inflow: [new THREE.Color(PALETTE.jade), new THREE.Color(PALETTE.pearl), new THREE.Color(PALETTE.gold)],
  drain: [new THREE.Color(PALETTE.gold), new THREE.Color('#FFE6A8')],
}

type P = {
  kind: FxKind | null
  pos: THREE.Vector3
  vel: THREE.Vector3
  life: number
  max: number
  delay: number
  size: number
  color: THREE.Color
  stage: number
}

// Every one-shot effect lives in one pooled point cloud.
export function Particles() {
  const gl = useThree((s) => s.gl)
  const { geo, mat, pool, attrs } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(POOL * 3)
    const col = new Float32Array(POOL * 3)
    const size = new Float32Array(POOL)
    const alpha = new Float32Array(POOL)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100)
    const mat = new THREE.ShaderMaterial({
      ...pointShader,
      uniforms: { uPixel: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const pool: P[] = Array.from({ length: POOL }, () => ({
      kind: null,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      max: 1,
      delay: 0,
      size: 0.1,
      color: new THREE.Color(),
      stage: 0,
    }))
    return { geo, mat, pool, attrs: { pos, col, size, alpha } }
  }, [])
  const cursor = useRef(0)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  function spawn(kind: FxKind, origin: THREE.Vector3 | undefined, spread: number, i: number, n: number) {
    const p = pool[cursor.current]
    cursor.current = (cursor.current + 1) % POOL
    const pal = COLORS[kind]
    p.kind = kind
    p.color.copy(pal[Math.floor(Math.random() * pal.length)])
    p.life = 0
    p.delay = 0
    p.stage = 0
    const o = origin ?? RIG.body
    const rnd = () => (Math.random() - 0.5) * 2
    switch (kind) {
      case 'plankton': {
        const a = Math.random() * Math.PI * 2
        const r = 4 + Math.random() * 3
        p.pos.set(Math.cos(a) * r, -1.5 + Math.random() * 4.5, Math.sin(a) * r * 0.8)
        p.vel.set(rnd(), rnd(), rnd()).multiplyScalar(0.3)
        p.max = 7
        p.size = 0.06 + Math.random() * 0.07
        break
      }
      case 'digest': {
        const m = RIG.mouths[Math.floor(Math.random() * RIG.mouths.length)] ?? RIG.body
        p.pos.copy(m).add(tmp.set(rnd(), rnd(), rnd()).multiplyScalar(0.15))
        p.vel.set(0, -0.5, 0)
        p.max = 6
        p.delay = Math.random() * 1.2
        p.size = 0.08
        break
      }
      case 'ash':
        p.pos.copy(o).add(tmp.set(rnd(), rnd() * 0.3, rnd()).multiplyScalar(spread))
        p.vel.set(rnd() * 0.6, -0.4 - Math.random() * 0.9, rnd() * 0.6)
        p.max = 3 + Math.random() * 2
        p.size = 0.06 + Math.random() * 0.12
        break
      case 'spark':
        p.pos.copy(o)
        p.vel.set(rnd(), rnd(), rnd()).normalize().multiplyScalar(2 + Math.random() * 4)
        p.max = 0.8 + Math.random() * 0.8
        p.size = 0.05 + Math.random() * 0.08
        break
      case 'bubble':
        p.pos.copy(o).add(tmp.set(rnd(), rnd(), rnd()).multiplyScalar(spread))
        p.vel.set(rnd() * 0.1, 0.6 + Math.random() * 0.5, rnd() * 0.1)
        p.max = 2.6
        p.size = 0.09 + Math.random() * 0.1
        break
      case 'inflow':
        // spare CREDIT, now ORBIO, falling from the Lair into the Pearl Vault
        p.pos.copy(RIG.vaultPearl).add(tmp.set(rnd() * 0.7, 7 + Math.random() * 3, rnd() * 0.7))
        p.vel.set(0, -2.5 - Math.random() * 1.5, 0)
        p.delay = Math.random() * 2.2
        p.max = 6
        p.size = 0.07 + Math.random() * 0.07
        break
      case 'drain': {
        // buyback: the pearl's liquid leaves upward to buy $HYDRA
        const d = tmp.set(rnd(), Math.random() * 0.6 + 0.4, rnd()).normalize()
        p.pos.copy(RIG.vaultPearl).addScaledVector(d, 1.3)
        p.vel.copy(d).multiplyScalar(0.6).add(new THREE.Vector3(0, 2.4 + Math.random() * 1.8, 0))
        p.delay = Math.random() * 1.6
        p.max = 3
        p.size = 0.06 + Math.random() * 0.08
        break
      }
      case 'glyph':
        // a column of light shooting up through the Membrane
        p.pos.copy(o)
        p.vel.set(0, 10, 0)
        p.delay = (i / n) * 0.5
        p.max = 1.6
        p.size = 0.32 - (i / n) * 0.25
        break
    }
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    mat.uniforms.uPixel.value = gl.getPixelRatio()
    while (fxQueue.length) {
      const r = fxQueue.shift()!
      const n = r.kind === 'glyph' ? 40 : r.count
      for (let i = 0; i < n; i++) spawn(r.kind, r.origin, r.spread ?? 0.3, i, n)
    }
    const t = now()
    for (let i = 0; i < POOL; i++) {
      const p = pool[i]
      let alpha = 0
      if (p.kind) {
        if (p.delay > 0) {
          p.delay -= dt
        } else {
          p.life += dt
          if (p.life > p.max) p.kind = null
          else alpha = step(p, dt, t, tmp)
        }
      }
      attrs.pos[i * 3] = p.pos.x
      attrs.pos[i * 3 + 1] = p.pos.y
      attrs.pos[i * 3 + 2] = p.pos.z
      attrs.col[i * 3] = p.color.r
      attrs.col[i * 3 + 1] = p.color.g
      attrs.col[i * 3 + 2] = p.color.b
      attrs.size[i] = p.size
      attrs.alpha[i] = alpha
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aColor.needsUpdate = true
    geo.attributes.aSize.needsUpdate = true
    geo.attributes.aAlpha.needsUpdate = true
  })

  return <points geometry={geo} material={mat} frustumCulled={false} />
}

function nearestMouth(p: THREE.Vector3) {
  let best = RIG.body
  let d = Infinity
  for (const m of RIG.mouths) {
    if (!m) continue
    const dd = m.distanceToSquared(p)
    if (dd < d) {
      d = dd
      best = m
    }
  }
  return best
}

// Advances one particle and returns its alpha.
function step(p: P, dt: number, t: number, tmp: THREE.Vector3): number {
  const u = p.life / p.max
  const fadeIn = Math.min(1, p.life * 4)
  switch (p.kind) {
    case 'plankton': {
      const m = nearestMouth(p.pos)
      tmp.subVectors(m, p.pos)
      const d = tmp.length()
      if (d < 0.18) {
        p.kind = null
        return 0
      }
      p.vel.addScaledVector(tmp.normalize(), dt * (1.5 + p.life * 1.8))
      p.vel.multiplyScalar(0.97)
      p.pos.addScaledVector(p.vel, dt)
      p.pos.y += Math.sin(t * 3 + p.max * 10) * dt * 0.2
      return fadeIn * 0.9
    }
    case 'digest': {
      const target = p.stage === 0 ? RIG.body : RIG.pearl
      tmp.subVectors(target, p.pos)
      const d = tmp.length()
      if (d < 0.25) {
        if (p.stage === 0) p.stage = 1
        else {
          p.kind = null
          return 0
        }
      }
      p.vel.lerp(tmp.normalize().multiplyScalar(p.stage === 0 ? 2 : 2.8), 0.08)
      p.pos.addScaledVector(p.vel, dt)
      return fadeIn
    }
    case 'ash':
      p.vel.x += Math.sin(t * 2 + p.pos.y * 3) * dt * 0.4
      p.vel.multiplyScalar(0.99)
      p.pos.addScaledVector(p.vel, dt)
      return fadeIn * (1 - u) * 0.85
    case 'spark':
      p.vel.multiplyScalar(0.93)
      p.pos.addScaledVector(p.vel, dt)
      return (1 - u) * 1.2
    case 'bubble':
      p.pos.addScaledVector(p.vel, dt)
      p.pos.x += Math.sin(t * 4 + p.max * 7) * dt * 0.15
      return fadeIn * (1 - u)
    case 'glyph':
      p.pos.addScaledVector(p.vel, dt)
      return (1 - u) * 1.4
    case 'inflow': {
      tmp.subVectors(RIG.vaultPearl, p.pos)
      if (tmp.length() < 1.1) {
        p.kind = null
        return 0
      }
      p.vel.lerp(tmp.normalize().multiplyScalar(3.2), 0.04)
      p.pos.addScaledVector(p.vel, dt)
      return fadeIn * 0.9
    }
    case 'drain':
      p.vel.x += Math.sin(t * 3 + p.max * 9) * dt * 0.8
      p.vel.z += Math.cos(t * 3 + p.max * 9) * dt * 0.8
      p.pos.addScaledVector(p.vel, dt)
      return fadeIn * (1 - u)
  }
  return 0
}

// "Rain falls up": the endless rising light field of the Ember Sea.
export function RisingLight({ count }: { count: number }) {
  const gl = useThree((s) => s.gl)
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = Math.random() * 16 - 5
      pos[i * 3 + 2] = -14 + Math.random() * 20
      seed[i] = Math.random()
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...SEA, uPixel: { value: 1 }, uRush: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uPixel, uSleep, uHype, uFear, uDive, uRush;
        varying float vSeed; varying float vY;
        void main(){
          vec3 p = position;
          float speed = (0.15 + aSeed * 0.35) * mix(1.0, 0.35, uSleep) * (1.0 + uHype * 1.2 + uFear * 0.6);
          // diving: the light rushes past upward
          p.y = mod(p.y + 5.0 + uTime * speed + uRush * (0.6 + aSeed), 16.0) - 5.0;
          p.x += sin(uTime * 0.4 + aSeed * 30.0) * 0.4;
          vSeed = aSeed; vY = p.y;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (0.4 + aSeed * 1.6) * (1.0 + uDive * 1.5) * uPixel * (40.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uMood; uniform float uTime;
        varying float vSeed; varying float vY;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          float tw = 0.5 + 0.5 * sin(uTime * (1.0 + vSeed * 3.0) + vSeed * 50.0);
          float edge = smoothstep(-5.0, -3.5, vY) * smoothstep(11.0, 7.0, vY);
          vec3 col = mix(vec3(0.96, 0.93, 1.0), uMood, 0.55 + vSeed * 0.4);
          gl_FragColor = vec4(col, a * a * (0.25 + tw * 0.5) * edge);
        }`,
    })
    return { geo, mat }
  }, [count])
  useFrame((_, dt) => {
    mat.uniforms.uPixel.value = gl.getPixelRatio()
    mat.uniforms.uRush.value += Math.min(dt, 0.05) * SEA.uDive.value * 14
  })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

// Sonar rings that ripple out of each head while it listens.
export function Sonar() {
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const lastPing = useRef(-10)
  const origins = useMemo(() => Array.from({ length: 12 }, () => new THREE.Vector3()), [])
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.orchid).multiplyScalar(2), transparent: true, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    [],
  )
  useFrame(({ camera }) => {
    if (pulses.sonarAt !== lastPing.current) {
      lastPing.current = pulses.sonarAt
      RIG.mouths.forEach((m, i) => origins[i]?.copy(m))
    }
    const age = now() - pulses.sonarAt
    const fear = useSea.getState().mood === 'fear'
    mat.color.set(fear ? PALETTE.ember : PALETTE.orchid).multiplyScalar(2)
    mat.opacity = Math.max(0, 1 - age / 1.6) * 0.55
    rings.current.forEach((r, i) => {
      if (!r) return
      r.visible = age < 1.6 && i < RIG.mouths.length
      r.position.copy(origins[i])
      r.scale.setScalar(0.12 + age * 0.75)
      r.quaternion.copy(camera.quaternion)
    })
  })
  return (
    <group>
      {origins.map((_, i) => (
        <mesh key={i} ref={(m) => (rings.current[i] = m)} material={mat} visible={false}>
          <ringGeometry args={[0.95, 1, 48]} />
        </mesh>
      ))}
    </group>
  )
}
