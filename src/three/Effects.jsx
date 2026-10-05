import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField, Noise, Vignette, ToneMapping, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { story } from '../lib/story'
import { focusPoint } from './CameraRig'

// The cinematic finish, applied after the 3D scene is drawn:
//  - Bloom: anything brighter than white (floodlights, the ball, windows)
//    bleeds a soft glow, like a real lens at night.
//  - Depth of field: subtle focus falloff toward what the camera looks at.
//  - Chromatic aberration: a tiny colour split, pulsed on the glass impact.
//  - Film grain + vignette: texture and a gentle frame.
//  - ACES tone mapping: the filmic curve used in cinema pipelines; it rolls
//    bright highlights off softly instead of clipping them.
// Lower quality tiers drop the most expensive pieces.
export default function Effects({ quality = 'high' }) {
  const dof = useRef()
  const ca = useRef()
  const caOffset = useMemo(() => new THREE.Vector2(0.00012, 0.0001), [])

  useFrame(() => {
    if (dof.current?.target) dof.current.target.copy(focusPoint)
    const k = story.shake * 0.25
    caOffset.set(0.00012 + k, 0.0001 + k * 0.6)
  })

  const high = quality === 'high'
  return (
    <EffectComposer multisampling={high ? 4 : 0} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={high ? 0.95 : 0.7} radius={0.72} />
      {high ? <DepthOfField ref={dof} target={[0, 1, 0]} focalLength={0.06} bokehScale={2.2} worldFocusRange={9} /> : <></>}
      {quality !== 'low' ? <ChromaticAberration ref={ca} offset={caOffset} radialModulation modulationOffset={0.35} /> : <></>}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.42} />
      <Vignette offset={0.28} darkness={0.62} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
