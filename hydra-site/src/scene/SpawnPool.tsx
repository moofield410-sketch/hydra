import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TIERS } from '@spawn-art'
import { LayerGroup, useActive } from './LayerGroup'
import { SandFloor } from './SandFloor'
import { Shafts } from './Water'
import { SEA } from '../theme'
import { useSea } from '../state/store'
import { now } from '../state/fx'
import { SUPPLY, poolFx, useSpawn } from '../state/spawn'

// −600 fathoms. HYDRA's nursery. A clutch of glowing eggs on the floor, and above it the young
// Spawn rising in the colours of their rarity. The pool fills as the mint does: every minted
// share adds jellies and empties more eggs, and each hatch sends a new jelly up from the clutch.
export function SpawnPool() {
  return (
    <LayerGroup id="spawn">
      <SandFloor tint="#ff7ad9" glow={0.3} />
      <Shafts y={0} count={5} />
      <pointLight position={[0, -2, 0.5]} intensity={5} distance={12} color="#ff7ad9" />
      <Clutch />
      <Nursery />
      <Newborn />
    </LayerGroup>
  )
}

// Tier colours weighted by how many of each exist, so the shoal looks like the collection.
function tierColor(i: number) {
  const x = ((i * 0.6180339) % 1) * SUPPLY
  let acc = 0
  for (const [, , n, c] of TIERS) if ((acc += n) > x) return new THREE.Color(c)
  return new THREE.Color(TIERS[0][3])
}

const BELL = /* glsl */ `
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float rim = smoothstep(0.14, 0.0, vH) * 0.9;
`

function Nursery() {
  const active = useActive()
  const quality = useSea((s) => s.quality)
  const max = quality === 'high' ? 110 : quality === 'mid' ? 70 : 40
  const { bell, tail, mat, tailMat } = useMemo(() => {
    const color = new Float32Array(max * 3)
    const seed = new Float32Array(max * 4)
    for (let i = 0; i < max; i++) {
      tierColor(i).toArray(color, i * 3)
      // phase, rise speed, orbit radius, orbit angle
      seed.set([Math.random(), 0.6 + Math.random() * 0.8, 1.2 + Math.random() * 5.5, Math.random() * Math.PI * 2], i * 4)
    }
    const make = (src: THREE.BufferGeometry) => {
      const g = new THREE.InstancedBufferGeometry().copy(src as THREE.InstancedBufferGeometry)
      g.setAttribute('aColor', new THREE.InstancedBufferAttribute(color, 3))
      g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4))
      g.instanceCount = 0
      return g
    }
    const tailSrc = new THREE.CylinderGeometry(0.05, 0.008, 1, 5, 8).translate(0, -0.5, 0)
    // Shared by bells and tails: where each young jelly is in its slow rise through the pool.
    const place = /* glsl */ `
      attribute vec3 aColor; attribute vec4 aSeed;
      uniform float uTime;
      varying vec3 vColor; varying float vA;
      vec3 centre(out float beat, out float size){
        float t = uTime * aSeed.y + aSeed.x * 40.0;
        beat = pow(max(0.0, sin(t * 1.8)), 3.0);
        float life = fract(aSeed.x + uTime * aSeed.y * 0.018);
        vA = smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.82, life);
        size = 0.14 + fract(aSeed.x * 7.3) * 0.16;
        float a = aSeed.w + uTime * 0.03 * (fract(aSeed.x * 3.1) - 0.5);
        return vec3(cos(a) * aSeed.z + sin(uTime * 0.3 + aSeed.x * 6.0) * 0.3, -2.3 + life * 5.6 + beat * 0.05, sin(a) * aSeed.z * 0.6 - 1.6);
      }`
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { ...SEA },
      vertexShader: /* glsl */ `
        ${place}
        varying vec3 vN; varying vec3 vV; varying float vH;
        void main(){
          float beat, size;
          vec3 c = centre(beat, size);
          vec3 p = position;
          p.xz *= 1.0 - beat * 0.18 * (1.0 - p.y);
          p.y *= 0.8 + beat * 0.08;
          vH = position.y; vColor = aColor;
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(c + p * size, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying vec3 vN; varying vec3 vV; varying float vH; varying float vA;
        void main(){
          ${BELL}
          vec3 col = vColor * (0.12 + f * 1.1 + rim);
          gl_FragColor = vec4(col, 0.7 * vA);
        }`,
    })
    const tailMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...SEA },
      vertexShader: /* glsl */ `
        ${place}
        varying float vU;
        void main(){
          float beat, size;
          vec3 c = centre(beat, size);
          vec3 p = position;
          vU = -p.y;
          p.x += sin(uTime * 1.6 + aSeed.x * 20.0 - vU * 4.0) * 0.35 * vU;
          p.z += cos(uTime * 1.2 + aSeed.x * 11.0) * 0.15 * vU;
          vColor = aColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(c + vec3(p.x * size * 2.6, p.y * size * 3.2, p.z * size * 2.6), 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying float vA; varying float vU;
        void main(){ gl_FragColor = vec4(vColor * 0.9, 0.35 * vA * (1.0 - vU)); }`,
    })
    return { bell: make(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), tail: make(tailSrc), mat, tailMat }
  }, [max])
  useFrame(() => {
    if (!active.current) return
    // A few always swim here; the rest arrive with the mint.
    const sp = useSpawn.getState()
    const n = Math.max(6, Math.round((max * sp.minted) / sp.supply))
    bell.instanceCount = n
    tail.instanceCount = n
  })
  return (
    <>
      <mesh geometry={bell} material={mat} frustumCulled={false} />
      <mesh geometry={tail} material={tailMat} frustumCulled={false} />
    </>
  )
}

// The clutch: pearly eggs on the sea bed. Eggs already hatched are left as dim, open shells.
const EGGS = 90
function Clutch() {
  const { geo, mat } = useMemo(() => {
    const at = new Float32Array(EGGS * 4)
    for (let i = 0; i < EGGS; i++) {
      const a = i * 2.399
      const r = 0.25 + Math.sqrt(i / EGGS) * 2.2
      // x, z, size, order of hatching (0..1, spread across the clutch)
      at.set([Math.cos(a) * r - 0.6, Math.sin(a) * r * 0.7 - 1.2, 0.09 + ((i * 37) % 9) / 9 * 0.08, ((i * 0.618) % 1)], i * 4)
    }
    const g = new THREE.InstancedBufferGeometry().copy(new THREE.SphereGeometry(1, 14, 10) as unknown as THREE.InstancedBufferGeometry)
    g.setAttribute('aEgg', new THREE.InstancedBufferAttribute(at, 4))
    g.instanceCount = EGGS
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...SEA, uHatched: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec4 aEgg;
        uniform float uTime, uHatched;
        varying vec3 vN; varying vec3 vV; varying float vOpen; varying float vGlow;
        void main(){
          vOpen = step(aEgg.w, uHatched);
          vGlow = 0.6 + 0.4 * sin(uTime * 1.4 + aEgg.w * 30.0);
          vec3 p = position * aEgg.z * vec3(1.0, 1.25 - vOpen * 0.55, 1.0);
          vec3 c = vec3(aEgg.x, -2.92 + aEgg.z * (1.1 - vOpen * 0.5), aEgg.y);
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(c + p, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying float vOpen; varying float vGlow;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
          vec3 shell = vec3(0.62, 1.0, 0.94);
          vec3 col = mix(shell * (0.35 + f) * vGlow + vec3(1.0, 0.55, 0.85) * 0.25, shell * 0.18 * f, vOpen);
          gl_FragColor = vec4(col, mix(0.8, 0.35, vOpen));
        }`,
    })
    return { geo: g, mat: m }
  }, [])
  useFrame(() => {
    const sp = useSpawn.getState()
    mat.uniforms.uHatched.value = sp.minted / sp.supply
  })
  return <mesh geometry={geo} material={mat} frustumCulled={false} />
}

// A fresh hatch: a bright young jelly rising out of the clutch in its rarity colour.
function Newborn() {
  const active = useActive()
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uColor: { value: new THREE.Color() }, uFade: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV; varying float vH;
          void main(){
            vH = position.y;
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uFade;
          varying vec3 vN; varying vec3 vV; varying float vH;
          void main(){
            ${BELL}
            gl_FragColor = vec4(uColor * (0.25 + f * 1.6 + rim * 1.4), 0.85 * uFade);
          }`,
      }),
    [],
  )
  useFrame(() => {
    const g = group.current
    if (!g) return
    const k = (now() - poolFx.hatchAt) / 4.5
    g.visible = active.current && k >= 0 && k < 1
    if (light.current) {
      light.current.intensity = g.visible ? 14 * Math.sin(Math.PI * Math.min(1, k * 2)) : 0
      light.current.color.set(poolFx.color)
    }
    if (!g.visible) return
    mat.uniforms.uColor.value.set(poolFx.color)
    mat.uniforms.uFade.value = Math.min(1, k * 6) * (1 - Math.max(0, k - 0.7) / 0.3)
    const beat = Math.pow(Math.max(0, Math.sin(k * 22)), 3)
    g.position.set(-0.6 + Math.sin(k * 5) * 0.2, -2.7 + k * 4.2, -1.2)
    g.scale.set(0.2 + k * 0.35 - beat * 0.04, (0.2 + k * 0.35) * 0.8 + beat * 0.03, 0.2 + k * 0.35 - beat * 0.04)
  })
  return (
    <>
      <group ref={group} visible={false}>
        <mesh material={mat}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      <pointLight ref={light} position={[-0.6, -2.2, -0.6]} intensity={0} distance={8} color="#ffffff" />
    </>
  )
}
