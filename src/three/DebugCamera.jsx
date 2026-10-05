import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// Development helper: open the page with ?view=aerial (etc.) to jump the
// camera to a fixed spot. Used for screenshots while building.
const VIEWS = {
  aerial: { pos: [30, 22, 34], look: [0, 0, 0] },
  intro: { pos: [24, 7, 32], look: [-2, 3, -6] },
  court: { pos: [4.2, 1.6, 13.5], look: [0, 1.0, 0] },
  glass: { pos: [0.6, 1.25, 10.8], look: [0, 1.0, 0] },
  side: { pos: [8.8, 2.1, 9], look: [0, 1.2, 4] },
  low: { pos: [5.8, 0.5, 4], look: [-1, 0.8, -5] },
  top: { pos: [0, 70, 0.01], look: [0, 0, 0] },
}

export default function DebugCamera() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const v = VIEWS[new URLSearchParams(location.search).get('view')]
    if (!v) return
    camera.position.set(...v.pos)
    camera.lookAt(...v.look)
  }, [camera])
  return null
}
