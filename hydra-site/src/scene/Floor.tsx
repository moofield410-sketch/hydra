import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { PALETTE, RIG, SEA } from '../theme'
import { useSea } from '../state/store'

const FLOOR_Y = -3

import { HOUR_COLOR } from '../palette'
export { HOUR_COLOR }

export function Floor() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { ...SEA },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uSleep, uFear, uFlash;
          uniform vec3 uMood;
          varying vec2 vP;
          void main(){
            float r = length(vP);
            float ang = atan(vP.y, vP.x);
            // data currents flowing inward toward the Hydra
            float flow = snoise(vec3(cos(ang) * 1.6, sin(ang) * 1.6, r * 0.9 + uTime * 0.35));
            float veins = smoothstep(0.55, 0.95, 1.0 - abs(flow)) * smoothstep(0.6, 2.4, r);
            float n = fbm(vec3(vP * 0.6, uTime * 0.03));
            float fade = smoothstep(14.0, 2.0, r);
            vec3 col = uMood * (veins * 0.55 + 0.12 + n * 0.08) ;
            col += vec3(0.78, 0.42, 1.0) * 0.06 * (0.5 + n);
            float core = smoothstep(2.6, 0.0, r) * 0.25;
            col += uMood * core;
            float a = fade * (0.55 + veins * 0.45) * mix(1.0, 0.45, uSleep) + uFlash * fade * 0.3;
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} material={mat}>
        <circleGeometry args={[14, 96]} />
      </mesh>
      <DayRing />
      <Pearl />
    </group>
  )
}

// The 24h clock on the Lair floor: one arc per UTC hour, coloured by what the Hydra did.
function DayRing() {
  const hours = useSea((s) => s.hours)
  const current = useRef<THREE.MeshBasicMaterial>(null)
  const hand = useRef<THREE.Mesh>(null)
  const nowHour = new Date().getUTCHours()

  useFrame(() => {
    const t = performance.now() / 1000
    if (current.current) current.current.opacity = 0.55 + 0.45 * Math.sin(t * 3)
    if (hand.current) {
      const d = new Date()
      const frac = (d.getUTCHours() + d.getUTCMinutes() / 60) / 24
      hand.current.rotation.z = Math.PI / 2 - frac * Math.PI * 2
    }
  })

  const seg = (Math.PI * 2) / 24
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.02, 0]}>
      {hours.map((a, h) => {
        // hour 0 at the top (12 o'clock), running clockwise when seen from above
        const start = Math.PI / 2 - (h + 1) * seg + 0.012
        const isNow = h === nowHour
        return (
          <mesh key={h}>
            <ringGeometry args={[2.2, isNow ? 2.52 : 2.42, 6, 1, start, seg - 0.024]} />
            <meshBasicMaterial
              ref={isNow ? current : undefined}
              color={a ? HOUR_COLOR[a] : '#2A1E38'}
              transparent
              opacity={a ? 0.85 : 0.35}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}
      <mesh ref={hand}>
        <planeGeometry args={[0.45, 0.025]} />
        <meshBasicMaterial color={PALETTE.pearl} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

// A glimpse of the Pearl Vault from the Lair: it swells as the defense fund grows.
function Pearl() {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...SEA },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main(){
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uMood;
          varying vec3 vN; varying vec3 vV;
          void main(){
            float f = 1.0 - max(dot(vN, vV), 0.0);
            vec3 irid = 0.5 + 0.5 * cos(6.2831 * (f * 1.2 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));
            vec3 col = mix(vec3(1.0, 0.96, 1.0), irid, 0.45) * (0.9 + f * 1.6);
            col = mix(col, uMood, 0.25);
            gl_FragColor = vec4(col * 1.05, 1.0);
          }`,
      }),
    [],
  )
  useFrame(() => {
    const fund = useSea.getState().fund
    const s = 0.22 + Math.min(fund / 60000, 1) * 0.16
    const m = ref.current
    if (!m) return
    m.scale.lerp(new THREE.Vector3(s, s, s), 0.05)
    m.position.y = RIG.pearl.y + 0.05 * Math.sin(performance.now() / 900)
  })
  return (
    <group>
      <mesh ref={ref} position={RIG.pearl} material={mat}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      <mesh position={[RIG.pearl.x, FLOOR_Y + 0.12, RIG.pearl.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.42, 0.09, 16, 48]} />
        <meshStandardMaterial color="#3A2550" emissive={PALETTE.orchid} emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  )
}
