import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { story } from '../lib/story'
import { sampleCamera } from './cameraPath'

// What the camera is looking at; the depth-of-field effect focuses here.
export const focusPoint = new THREE.Vector3(0, 1, 0)

// Moves the camera along the scroll path every frame.
// Extra touches on top of the path:
//  - a slow orbit over the club while you're still at the top of the page
//  - a tiny parallax that follows the mouse on desktop
//  - damping, so the camera eases instead of snapping
export default function CameraRig() {
  const camera = useThree((s) => s.camera)
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      curLook: new THREE.Vector3(0, 1, 0),
      first: true,
      orbit: 0,
      fov: 35,
    }),
    [],
  )

  useFrame((state, dt) => {
    story.frames++
    dt = Math.min(dt, 0.05)
    const s = story.s
    tmp.fov = sampleCamera(s, tmp.pos, tmp.look)

    // Intro orbit: drifts around the club, fading out as you scroll in.
    const introWeight = 1 - THREE.MathUtils.smoothstep(s, 0.0, 0.6)
    if (!story.reducedMotion) tmp.orbit += dt * 0.035
    if (introWeight > 0) {
      const a = Math.sin(tmp.orbit) * 0.35 * introWeight
      const dx = tmp.pos.x - tmp.look.x
      const dz = tmp.pos.z - tmp.look.z
      tmp.pos.x = tmp.look.x + dx * Math.cos(a) - dz * Math.sin(a)
      tmp.pos.z = tmp.look.z + dx * Math.sin(a) + dz * Math.cos(a)
    }

    // Mouse parallax (very small; none during the precise rally framing).
    if (!story.reducedMotion) {
      const rally = s > 2 && s < 3 ? 0.25 : 1
      tmp.pos.x += story.pointer.x * 0.25 * rally
      tmp.pos.y += story.pointer.y * 0.12 * rally
    }

    // Damping: higher lambda = snappier. Lenis already smooths the scroll,
    // so this mostly hides tiny jitters.
    const lambda = tmp.first || story.snap ? 1000 : 9
    tmp.first = false
    story.snap = false
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tmp.pos.x, lambda, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, tmp.pos.y, lambda, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tmp.pos.z, lambda, dt)
    tmp.curLook.x = THREE.MathUtils.damp(tmp.curLook.x, tmp.look.x, lambda, dt)
    tmp.curLook.y = THREE.MathUtils.damp(tmp.curLook.y, tmp.look.y, lambda, dt)
    tmp.curLook.z = THREE.MathUtils.damp(tmp.curLook.z, tmp.look.z, lambda, dt)
    camera.lookAt(tmp.curLook)
    focusPoint.copy(story.s > 2.05 && story.s < 2.9 && story.ball ? story.ball : tmp.curLook)
    if (story.shake > 0 && !story.reducedMotion) {
      const k = story.shake
      camera.rotation.x += (Math.random() - 0.5) * k
      camera.rotation.y += (Math.random() - 0.5) * k
    }

    // Portrait phones see less width, so widen the lens a little there.
    const aspect = state.size.width / state.size.height
    const fov = aspect < 1 ? tmp.fov * THREE.MathUtils.lerp(1.45, 1.0, aspect) : tmp.fov
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}
