import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { layerY, type LayerId } from '../state/layers'

// `active` is true only while the camera is near the layer. Per-frame work checks it,
// so the seven layers you are not looking at cost almost nothing.
const Active = createContext<{ current: boolean }>({ current: true })
export const useActive = () => useContext(Active)

export function LayerGroup({ id, children }: { id: LayerId; children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const active = useRef(false)
  const y = layerY(id)
  useFrame(({ camera }) => {
    active.current = Math.abs(camera.position.y - (y + 1.6)) < 26
    if (group.current) group.current.visible = active.current
  }, -1)
  return (
    <Active.Provider value={active}>
      <group ref={group} position={[0, y, 0]}>
        {children}
      </group>
    </Active.Provider>
  )
}
