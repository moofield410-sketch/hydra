import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SEA } from '../theme'

// A small fish pointing down +Z: a rounded body, a flat forked tail and two side fins.
export function fishGeometry() {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.32, 0.42, 1)
  const tail = new THREE.ConeGeometry(0.5, 0.7, 4).scale(0.18, 1, 1).rotateX(Math.PI / 2).translate(0, 0, -1.15)
  const finL = new THREE.ConeGeometry(0.22, 0.5, 3).scale(1, 0.2, 1).rotateZ(Math.PI / 2).rotateY(0.5).translate(0.42, -0.08, 0.1)
  const finR = finL.clone().scale(-1, 1, 1)
  const parts = [body, tail, finL, finR].map((g) => g.toNonIndexed())
  parts.forEach((g) => g.deleteAttribute('uv'))
  const geo = mergeGeometries(parts)!
  geo.computeVertexNormals()
  return geo
}

// Instanced fish skin: glowing glass with a bright nose, the tail wagging behind.
export function fishMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...SEA, uWag: { value: 1 } },
    vertexShader: /* glsl */ `
      uniform float uTime, uWag;
      varying vec3 vColor; varying float vEdge; varying float vZ;
      void main(){
        vec3 p = position;
        float id = float(gl_InstanceID);
        float behind = clamp(-p.z, 0.0, 1.6);
        p.x += sin(uTime * 9.0 + id * 1.7 - p.z * 2.5) * 0.22 * behind * uWag;
        vZ = position.z;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vEdge = 1.0 - abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vEdge; varying float vZ;
      void main(){
        float nose = smoothstep(0.2, 0.95, vZ);
        float a = 0.18 + vEdge * 0.55 + nose * 0.6;
        gl_FragColor = vec4(vColor * (0.6 + nose * 1.4 + vEdge * 0.6), a);
      }`,
  })
}
