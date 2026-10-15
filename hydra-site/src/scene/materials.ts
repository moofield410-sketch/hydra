import * as THREE from 'three'
import { NOISE } from './glsl'
import { PALETTE, SEA } from '../theme'

// Translucent glass flesh with bioluminescent spots. `wobble` turns on the
// breathing displacement used by the body.
export function glassFlesh(wobble: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...SEA,
      uWobble: { value: wobble },
      uOrchid: { value: new THREE.Color(PALETTE.orchid) },
      uBreath: { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uWobble, uBreath, uFear;
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
      void main(){
        vUv = uv;
        vec3 p = position;
        if (uWobble > 0.0) {
          float n = snoise(p * 1.3 + vec3(0.0, uTime * 0.35, 0.0));
          p += normal * (n * 0.09 + uBreath * 0.05 + uFear * 0.03 * sin(uTime * 14.0 + p.y * 6.0)) * uWobble;
        }
        vP = p;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uThink, uSleep, uHunger, uHype, uFear, uFlash;
      uniform vec3 uMood, uOrchid;
      varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
      void main(){
        float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.2);
        float spots = smoothstep(0.62, 0.78, snoise(vP * 4.2 + vec3(0.0, 0.0, uTime * 0.04)));
        float spotPulse = 0.6 + 0.4 * sin(uTime * 2.0 + vP.y * 3.0);
        vec3 body = mix(vec3(0.06, 0.03, 0.10), uMood * 0.12, 0.5);
        vec3 col = body + uMood * f * 0.85 + uMood * spots * spotPulse * 0.9;
        col += uOrchid * uThink * (0.25 + 0.55 * pow(0.5 + 0.5 * sin(uTime * 7.0 + vP.y * 9.0), 4.0));
        col += vec3(1.0, 0.8, 0.3) * uHype * f * 0.4;
        col += uMood * uFlash * 0.5;
        float grey = dot(col, vec3(0.33));
        col = mix(col, vec3(grey) * 0.8, uHunger * 0.6);
        col *= mix(1.0, 0.45, uSleep);
        float a = clamp(0.14 + f * 0.62 + spots * 0.25, 0.0, 0.85);
        gl_FragColor = vec4(col, a);
      }`,
  })
}

export function glowBasic(color: string, intensity = 2) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false })
  return m
}
