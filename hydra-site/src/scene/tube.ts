import * as THREE from 'three'

// A tube whose spine is rewritten every frame (necks, tail, predators).
// Normals use parallel transport so the skin never twists as the spine moves.
export class LiveTube {
  readonly geometry = new THREE.BufferGeometry()
  private pos: Float32Array
  private nor: Float32Array
  private T = new THREE.Vector3()
  private N = new THREE.Vector3()
  private B = new THREE.Vector3()
  private v = new THREE.Vector3()

  constructor(
    readonly samples: number,
    readonly radial: number,
  ) {
    const count = (samples + 1) * (radial + 1)
    this.pos = new Float32Array(count * 3)
    this.nor = new Float32Array(count * 3)
    const uv = new Float32Array(count * 2)
    const idx: number[] = []
    for (let i = 0; i <= samples; i++) {
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j
        uv[k * 2] = j / radial
        uv[k * 2 + 1] = i / samples
        if (i < samples && j < radial) {
          const a = k
          const b = k + radial + 1
          idx.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }
    this.geometry.setIndex(idx)
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage))
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }

  update(curve: THREE.Curve<THREE.Vector3>, radius: (u: number) => number) {
    const { samples, radial, T, N, B, v } = this
    const p = new THREE.Vector3()
    for (let i = 0; i <= samples; i++) {
      const u = i / samples
      curve.getPointAt(u, p)
      curve.getTangentAt(u, T).normalize()
      if (i === 0) {
        v.set(0, 1, 0)
        if (Math.abs(T.dot(v)) > 0.9) v.set(1, 0, 0)
        N.crossVectors(T, v).normalize()
      } else {
        N.addScaledVector(T, -N.dot(T)).normalize()
      }
      B.crossVectors(T, N)
      const r = radius(u)
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2
        const c = Math.cos(a)
        const s = Math.sin(a)
        const k = (i * (radial + 1) + j) * 3
        const nx = c * N.x + s * B.x
        const ny = c * N.y + s * B.y
        const nz = c * N.z + s * B.z
        this.nor[k] = nx
        this.nor[k + 1] = ny
        this.nor[k + 2] = nz
        this.pos[k] = p.x + nx * r
        this.pos[k + 1] = p.y + ny * r
        this.pos[k + 2] = p.z + nz * r
      }
    }
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.normal.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }
}
