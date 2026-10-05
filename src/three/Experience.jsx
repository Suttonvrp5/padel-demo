import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Sky from './Sky'
import Courts from './Court'
import Surroundings from './Surroundings'
import Floodlights from './Floodlights'
import Lighting from './Lighting'
import CameraRig from './CameraRig'
import Rally from './Rally'
import Players from './Players'

export default function Experience({ quality = 'high' }) {
  return (
    <Canvas
      className="webgl"
      dpr={quality === 'high' ? [1, 2] : [1, 1.5]}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      camera={{ fov: 35, near: 0.1, far: 1500, position: [30, 22, 34] }}
      onCreated={({ gl, scene, camera }) => {
        if (import.meta.env.DEV) Object.assign(window, { __scene: scene, __camera: camera })
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
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
      </Suspense>
    </Canvas>
  )
}
