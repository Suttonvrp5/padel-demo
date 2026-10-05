import { useEffect, useMemo } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { LIGHTS, COURT_XS, HERO } from './layout'
import { LED_COLOR } from './Floodlights'

// Lighting has three layers:
// 1. The HDRI (a 360° photo of a real night sky from Poly Haven) gives soft
//    ambient light and something for glass and steel to reflect.
// 2. Glowing "lightformer" panels are painted into that same reflection map
//    at every floodlight position, so the floodlights appear in the glass.
// 3. A few real-time lights on the hero court give crisp highlights and
//    soft shadows under the players and the ball.
export default function Lighting({ quality = 'high' }) {
  const heroX = COURT_XS[HERO]
  const heroLights = useMemo(() => LIGHTS.filter((l) => l.court === heroX), [heroX])

  const key = useMemo(() => {
    const l = new THREE.DirectionalLight(LED_COLOR, 0.55)
    l.position.set(heroX + 7, 16, 5)
    l.target.position.set(heroX, 0, 0)
    l.castShadow = true
    const s = quality === 'high' ? 2048 : 1024
    l.shadow.mapSize.set(s, s)
    const cam = l.shadow.camera
    cam.left = -9
    cam.right = 9
    cam.top = 13
    cam.bottom = -13
    cam.near = 4
    cam.far = 40
    l.shadow.bias = -0.0004
    l.shadow.normalBias = 0.02
    l.shadow.radius = 5
    l.shadow.blurSamples = 12
    return l
  }, [heroX, quality])

  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.add(key.target)
    return () => scene.remove(key.target)
  }, [scene, key])

  return (
    <>
      <Environment
        files="/hdri/moonless_golf_1k.hdr"
        background={false}
        environmentIntensity={1.0}
        resolution={256}
        frames={1}
      >
        {/* Floodlight heads as bright panels in the reflection map */}
        {LIGHTS.map((L, i) => (
          <Lightformer
            key={i}
            form="rect"
            intensity={18}
            color={LED_COLOR}
            position={L.pos}
            scale={[0.8, 0.5, 1]}
            target={L.aim}
          />
        ))}
        {/* Warm horizon glow and the clubhouse windows */}
        <Lightformer form="ring" intensity={1.2} color="#ff9a6a" position={[-60, 4, -160]} scale={80} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.35} color="#ffb36b" position={[0, 1.5, -16.5]} scale={[24, 2, 1]} target={[0, 1.5, 0]} />
        {/* Cool sky fill from above */}
        <Lightformer form="rect" intensity={0.35} color="#3b5bb0" position={[0, 60, 0]} scale={[120, 120, 1]} target={[0, 0, 0]} />
      </Environment>

      <hemisphereLight args={['#4b63b8', '#0d1020', 0.12]} />
      <primitive object={key} />
      {/* Floodlights on the hero court as real spotlights (no shadows: cheap) */}
      {quality !== 'low' &&
        heroLights.map((L, i) => (
          <spotLight
            key={i}
            position={L.pos}
            color={LED_COLOR}
            intensity={55}
            distance={26}
            angle={0.8}
            penumbra={0.9}
            decay={2}
            target-position={L.aim}
            ref={(s) => s && s.target.updateMatrixWorld()}
          />
        ))}
    </>
  )
}
