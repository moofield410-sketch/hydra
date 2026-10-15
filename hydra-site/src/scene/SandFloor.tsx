import { useMemo } from 'react'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { SEA } from '../theme'

// A layer's sea bed: dark dunes with sparkling glints and a glow pooling under its centre.
export function SandFloor({ y = -2.95, tint, glow = 0.35, radius = 15 }: { y?: number; tint: string; glow?: number; radius?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { ...SEA, uTint: { value: new THREE.Color(tint) }, uGlow: { value: glow }, uR: { value: radius } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uGlow, uR; uniform vec3 uMood, uTint;
          varying vec2 vP;
          void main(){
            float r = length(vP);
            float dunes = fbm(vec3(vP * 0.35, 0.0)) * 0.5 + 0.5;
            float glint = pow(max(0.0, snoise(vec3(vP * 9.0, uTime * 0.6))), 14.0) * 3.0;
            float under = smoothstep(5.5, 0.0, r);
            vec3 col = vec3(0.09, 0.05, 0.12) * (0.6 + dunes * 0.8);
            col += mix(uTint, uMood, 0.35) * under * uGlow;
            col += vec3(1.0, 0.92, 0.75) * glint;
            gl_FragColor = vec4(col, smoothstep(uR, uR * 0.2, r));
          }`,
      }),
    [tint, glow, radius],
  )
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat} renderOrder={-1}>
      <circleGeometry args={[radius, 96]} />
    </mesh>
  )
}
