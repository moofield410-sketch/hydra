import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { PALETTE, SEA } from '../theme'

// The ink sea. In the Ember Sea light rises from below, so the gradient brightens
// downward, and the whole sea gets brighter the deeper the visitor dives.
// The sphere travels with the camera so every layer sits inside it.
export function Water() {
  const sky = useRef<THREE.Mesh>(null)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          ...SEA,
          uAbyss: { value: new THREE.Color(PALETTE.abyss) },
          uOrchid: { value: new THREE.Color(PALETTE.orchid) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uFear, uHype, uSleep, uFlash, uDepth, uDive;
          uniform vec3 uMood, uAbyss, uOrchid;
          varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float below = smoothstep(0.25, -0.95, d.y);
            float n = fbm(d * 2.6 + vec3(0.0, -uTime * 0.035, uTime * 0.01));
            float veins = smoothstep(0.35, 0.62, abs(fbm(d * 5.0 + vec3(uTime * 0.02))));
            vec3 col = uAbyss;
            col += uOrchid * 0.07 * (0.6 + n) * (1.0 - below);
            col += uMood * (0.10 + 0.22 * below) * (0.75 + 0.5 * n);
            col += uMood * veins * 0.05 * (0.4 + uFear * 1.4);
            col *= mix(1.0, 0.45, uSleep);
            col += uMood * uFlash * 0.35;
            col *= 1.0 + uDepth * 0.7;
            col += vec3(1.0, 0.85, 0.6) * uDepth * 0.05 * below;
            float streak = smoothstep(0.55, 1.0, abs(snoise(vec3(d.x * 18.0, d.y * 1.5 + uTime * 6.0, d.z * 18.0))));
            col += mix(uMood, vec3(1.0), 0.4) * streak * uDive * 0.35;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  useFrame(({ camera }) => sky.current?.position.copy(camera.position))
  return (
    <mesh ref={sky} material={mat} renderOrder={-10}>
      <sphereGeometry args={[80, 48, 32]} />
    </mesh>
  )
}

function makeShaft() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { ...SEA },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vEdge;
      void main(){
        vUv = uv;
        vec3 n = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        vEdge = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uSleep, uFear;
      uniform vec3 uMood;
      varying vec2 vUv;
      varying float vEdge;
      void main(){
        float rise = pow(1.0 - vUv.y, 1.6);
        float flick = 0.55 + 0.45 * snoise(vec3(vUv.x * 6.0, vUv.y * 2.0 - uTime * 0.25, uTime * 0.1));
        float a = rise * flick * pow(vEdge, 2.0) * 0.16 * mix(1.0, 0.35, uSleep);
        gl_FragColor = vec4(uMood * (1.0 + uFear * 0.4), a);
      }`,
  })
}

// Light climbing from a layer's floor. `y` is the layer's world height.
export function Shafts({ y = 0, count = 7 }: { y?: number; count?: number }) {
  const mat = useMemo(() => makeShaft(), [])
  const shafts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.4
        const r = 3.5 + (i % 3) * 2.2
        return { pos: [Math.cos(a) * r, y + 2.2, Math.sin(a) * r - 3] as const, tilt: Math.sin(i * 2.1) * 0.12, w: 0.5 + (i % 2) * 0.5 }
      }),
    [count, y],
  )
  return (
    <>
      {shafts.map((s, i) => (
        <mesh key={i} position={s.pos} rotation={[0, 0, s.tilt]} material={mat}>
          <cylinderGeometry args={[s.w * 0.25, s.w, 11, 24, 1, true]} />
        </mesh>
      ))}
    </>
  )
}
