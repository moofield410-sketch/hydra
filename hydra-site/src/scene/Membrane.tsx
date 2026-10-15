import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NOISE } from './glsl'
import { LayerGroup, useActive } from './LayerGroup'
import { Shafts } from './Water'
import { PALETTE, RIG, SEA } from '../theme'
import { useSea } from '../state/store'
import { now } from '../state/fx'
import { layerY } from '../state/layers'

// 0 fathoms. The underside of a liquid-mercury surface, lit from below, and far
// beneath it one enormous eye that opens as the visitor arrives.
export function Membrane() {
  return (
    <LayerGroup id="membrane">
      <Mercury />
      <Eye />
      <Shafts y={-3} count={5} />
      <pointLight position={[0, -1, 2]} intensity={5} distance={14} color={PALETTE.orchid} />
    </LayerGroup>
  )
}

function Mercury() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { ...SEA, uOrchid: { value: new THREE.Color(PALETTE.orchid) } },
        vertexShader: /* glsl */ `
          varying vec2 vP; varying vec3 vW;
          void main(){
            vP = position.xy;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uFear; uniform vec3 uMood, uOrchid;
          varying vec2 vP; varying vec3 vW;
          float h(vec2 p){
            float r = length(p);
            float ring = sin(r * 2.2 - uTime * 1.6) * exp(-r * 0.09) * 0.25;
            return fbm(vec3(p * 0.18, uTime * 0.07)) * 1.4 + ring;
          }
          void main(){
            float e = 0.15;
            vec2 g = vec2(h(vP + vec2(e, 0.0)) - h(vP - vec2(e, 0.0)), h(vP + vec2(0.0, e)) - h(vP - vec2(0.0, e))) / (2.0 * e);
            vec3 n = normalize(vec3(-g.x, -1.0, -g.y));
            vec3 v = normalize(vW - cameraPosition);
            vec3 r = reflect(v, n);
            float down = clamp(-r.y, 0.0, 1.0);
            float fres = pow(1.0 - abs(dot(n, -v)), 3.0);
            vec3 chrome = vec3(0.05, 0.04, 0.08) + vec3(0.75, 0.72, 0.85) * pow(1.0 - down, 6.0) * 0.5;
            chrome += mix(uMood, uOrchid, 0.4) * pow(down, 3.0) * 0.55;
            float spec = pow(max(dot(r, normalize(vec3(0.2, -1.0, 0.4))), 0.0), 40.0);
            vec3 col = chrome + vec3(1.0, 0.95, 1.0) * spec * 0.8 + uMood * fres * 0.3;
            float a = smoothstep(42.0, 14.0, length(vP));
            gl_FragColor = vec4(col, a);
          }`,
      }),
    [],
  )
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.2, -6]} material={mat} renderOrder={-5}>
      <planeGeometry args={[90, 90, 1, 1]} />
    </mesh>
  )
}

const EYE_POS = new THREE.Vector3(0.2, -2.6, -9)

function Eye() {
  const active = useActive()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          ...SEA,
          uOpen: { value: 0 },
          uLook: { value: new THREE.Vector2() },
          uGold: { value: new THREE.Color(PALETTE.gold) },
          uEmber: { value: new THREE.Color(PALETTE.ember) },
        },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uOpen, uFear, uSleep; uniform vec2 uLook; uniform vec3 uMood, uGold, uEmber;
          varying vec2 vUv;
          void main(){
            vec2 p = vUv * vec2(1.0, 1.9);
            // almond aperture, opening vertically
            float lid = (1.0 - p.x * p.x) * uOpen * (1.0 - uSleep * 0.7);
            float inside = smoothstep(0.0, 0.04, lid - abs(p.y));
            vec2 q = vUv - uLook * 0.18;
            float r = length(q * vec2(1.0, 1.0));
            float ang = atan(q.y, q.x);
            float streaks = 0.6 + 0.4 * fbm(vec3(ang * 3.0, r * 6.0, uTime * 0.1));
            vec3 iris = mix(uGold, uEmber, uFear) * streaks * smoothstep(0.62, 0.15, r) * 1.6;
            iris += mix(uGold, vec3(1.0), 0.5) * smoothstep(0.66, 0.6, r) * smoothstep(0.52, 0.6, r) * 1.2;
            // a vertical slit pupil that narrows with fear
            float slit = smoothstep(0.035 + 0.06 * (1.0 - uFear), 0.0, abs(q.x) * (1.0 + q.y * q.y * 3.0)) * step(r, 0.5);
            iris *= 1.0 - slit * 0.95;
            vec3 col = iris * inside;
            // the glow that leaks around the lids, even when shut
            float halo = exp(-length(vUv * vec2(0.9, 2.4)) * 2.6) * (0.25 + uOpen * 0.5);
            col += mix(uMood, uGold, 0.5) * halo * 0.6;
            col += mix(uGold, vec3(1.0), 0.3) * smoothstep(0.035, 0.0, abs(lid - abs(p.y))) * step(abs(p.x), 1.0) * uOpen * 0.9;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    [],
  )
  const arrived = useMemo(() => ({ at: -1, blinkAt: 6 }), [])
  useFrame((_, rawDt) => {
    if (!active.current) {
      arrived.at = -1
      return
    }
    const dt = Math.min(rawDt, 0.05)
    const t = now()
    if (arrived.at < 0) arrived.at = t
    // Opens slowly over the first seconds, then blinks every few seconds.
    const since = t - arrived.at
    let open = THREE.MathUtils.smoothstep(since, 0.6, 4.2)
    if (since > arrived.blinkAt) {
      const b = since - arrived.blinkAt
      open *= b < 0.32 ? Math.abs(Math.cos((b / 0.32) * Math.PI)) : 1
      if (b > 0.32) arrived.blinkAt = since + 4 + Math.random() * 5
    }
    if (useSea.getState().activity === 'hunted') open = Math.max(open, 1.15)
    const u = mat.uniforms
    u.uOpen.value += (open - u.uOpen.value) * Math.min(1, dt * 12)
    // The pupil follows the visitor.
    const look = u.uLook.value as THREE.Vector2
    look.x += (THREE.MathUtils.clamp(RIG.pointer.x / 6, -1, 1) - look.x) * dt * 3
    look.y += (THREE.MathUtils.clamp((RIG.pointer.y - layerY('membrane')) / 4, -1, 1) - look.y) * dt * 3
  })
  return (
    <mesh position={EYE_POS} material={mat}>
      <planeGeometry args={[9, 9]} />
    </mesh>
  )
}
