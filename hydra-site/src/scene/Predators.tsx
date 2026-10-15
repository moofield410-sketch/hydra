import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LiveTube } from './tube'
import { NOISE } from './glsl'
import { PALETTE, RIG, SEA } from '../theme'
import { useSea } from '../state/store'
import { now } from '../state/fx'

const COUNT = 4

// The red shapes that circle when fear rises. They close in while the Hydra is
// hunted and shatter the moment the buyback fires.
export function Predators() {
  const presence = useRef(0)
  const huntStart = useRef(-1)
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { ...SEA, uPresence: { value: 0 }, uEmber: { value: new THREE.Color(PALETTE.ember) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying float vEdge;
          void main(){
            vUv = uv;
            vec3 n = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          ${NOISE}
          uniform float uTime, uPresence;
          uniform vec3 uEmber;
          varying vec2 vUv; varying float vEdge;
          void main(){
            float stripes = 0.5 + 0.5 * sin(vUv.y * 60.0 - uTime * 9.0);
            float flick = 0.6 + 0.4 * snoise(vec3(vUv.y * 8.0, uTime * 3.0, 0.0));
            float a = (0.25 + vEdge * 0.9) * flick * (0.6 + stripes * 0.4) * uPresence;
            a *= smoothstep(1.0, 0.85, vUv.y);
            gl_FragColor = vec4(uEmber * (1.6 + stripes), a);
          }`,
      }),
    [],
  )
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFD2D6').multiplyScalar(3), toneMapped: false, transparent: true }), [])
  const eels = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        tube: new LiveTube(48, 8),
        curve: new THREE.CatmullRomCurve3(Array.from({ length: 8 }, () => new THREE.Vector3()), false, 'centripetal'),
        phase: (i / COUNT) * Math.PI * 2,
        speed: 0.45 + (i % 2) * 0.18,
        height: -0.6 + i * 0.75,
        dir: i % 2 ? 1 : -1,
      })),
    [],
  )
  const eyes = useRef<(THREE.Mesh | null)[]>([])
  const group = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
    const { activity } = useSea.getState()
    const t = now()
    const hunting = activity === 'hunted'
    if (hunting && huntStart.current < 0) huntStart.current = t
    if (!hunting) huntStart.current = -1
    // Rise slowly while hunted; vanish fast the moment the Hydra strikes.
    const k = hunting ? 1.2 : 7
    presence.current += ((hunting ? 1 : 0) - presence.current) * (1 - Math.exp(-k * dt))
    mat.uniforms.uPresence.value = presence.current
    eyeMat.opacity = presence.current
    if (group.current) group.current.visible = presence.current > 0.01

    const closing = hunting ? THREE.MathUtils.clamp((t - huntStart.current) / 6.5, 0, 1) : 1
    const radius = 9 - closing * 4.6
    const present = presence.current > 0.05
    if (!present) RIG.predators.length = 0

    eels.forEach((e, i) => {
      const pts = e.curve.points
      for (let j = 0; j < pts.length; j++) {
        const lag = j * 0.16
        const ang = e.phase + e.dir * (t * e.speed - lag)
        const wig = Math.sin(t * 5 - j * 0.9 + i) * 0.22 * (j / pts.length + 0.3)
        const r = radius + wig
        pts[j].set(Math.cos(ang) * r + RIG.body.x, e.height + Math.sin(t * 1.3 + j * 0.5 + i) * 0.3 + RIG.body.y + 1.2, Math.sin(ang) * r * 0.7 + RIG.body.z)
      }
      e.curve.updateArcLengths()
      e.tube.update(e.curve, (u) => 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.05)) + 0.02)
      const headPos = pts[0]
      if (present) (RIG.predators[i] ??= new THREE.Vector3()).copy(headPos)
      const eye = eyes.current[i]
      if (eye) eye.position.copy(headPos)
    })
  })

  return (
    <group ref={group}>
      {eels.map((e, i) => (
        <group key={i}>
          <mesh geometry={e.tube.geometry} material={mat} />
          <mesh ref={(m) => (eyes.current[i] = m)} material={eyeMat}>
            <sphereGeometry args={[0.07, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
