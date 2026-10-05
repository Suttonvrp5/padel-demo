import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Sky from './Sky'
import Courts from './Court'
import Surroundings from './Surroundings'
import Floodlights from './Floodlights'
import Lighting from './Lighting'
import CameraRig from './CameraRig'
import Rally from './Rally'
import Players from './Players'
import Effects from './Effects'
import { story } from '../lib/story'

// Report real download progress (HDRI, models, ...) to the loading screen.
const manager = THREE.DefaultLoadingManager
manager.onStart = () => (story.loadActive = true)
manager.onProgress = (_, loaded, total) => (story.loadProgress = (loaded / Math.max(1, total)) * 100)
manager.onLoad = () => {
  story.loadProgress = 100
  story.loadActive = false
}

const DPR = { high: [1, 1.75], medium: [1, 1.5], low: [0.8, 1] }

// Watches the real frame rate once the site is interactive. If the device
// can't hold ~45 fps for a few seconds, step down one quality tier.
function FrameWatchdog({ onDecline }) {
  const acc = useRef({ time: 0, frames: 0, strikes: 0, warmup: 2.5 })
  useFrame((_, dt) => {
    const a = acc.current
    if (!story.ready || dt > 0.5) return // ignore loading and tab switches
    if ((a.warmup -= dt) > 0) return
    a.time += dt
    a.frames++
    if (a.time >= 2) {
      const fps = a.frames / a.time
      a.strikes = fps < 45 ? a.strikes + 1 : 0
      if (a.strikes >= 2) {
        a.strikes = 0
        a.warmup = 3
        onDecline()
      }
      a.time = 0
      a.frames = 0
    }
  })
  return null
}

export default function Experience({ quality = 'high', onDecline }) {
  // Shadows are decided once, at start-up: toggling them later would force
  // every material to recompile (a visible hitch).
  const shadows = useRef(quality !== 'low').current
  return (
    <Canvas
      className="webgl"
      dpr={DPR[quality]}
      shadows={shadows ? { type: THREE.PCFShadowMap } : false}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 35, near: 0.1, far: 1500, position: [30, 22, 34] }}
      onCreated={({ gl, scene, camera }) => {
        if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera, __gl: gl })
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        scene.fog = new THREE.FogExp2('#18213f', 0.0105)
      }}
    >
      <Suspense fallback={null}>
        <Sky />
        <Lighting quality={quality} />
        <Courts />
        <Floodlights beams={quality !== 'low'} />
        <Surroundings quality={quality} />
        <Rally />
        <Players quality={quality} />
        <CameraRig />
        <Effects quality={quality} />
      </Suspense>
      {quality !== 'low' && <FrameWatchdog onDecline={onDecline} />}
    </Canvas>
  )
}
