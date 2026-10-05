import { Suspense, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { story } from '../lib/story'
import Player, { CAST, lerpPath } from './Player'
import Racket from './Racket'
import { COURT_XS, HERO } from './layout'

// Optional Mixamo character. Drop a compressed file at
// public/models/player.glb (see README → "Add the Mixamo player") and it
// replaces the built-in mannequin automatically.
const MODEL_URL = '/models/player.glb'
// Where in the animation clip the racket meets the ball (0..1). Adjust if
// your Mixamo swing makes contact earlier or later.
const CONTACT_FRACTION = 0.48
const SWING_SECONDS = 1.8

function useModelAvailable() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    fetch(MODEL_URL, { method: 'HEAD' })
      .then((r) => setOk(r.ok && !(r.headers.get('content-type') || '').includes('text/html')))
      .catch(() => setOk(false))
  }, [])
  return ok
}

function MixamoPlayer({ id, courtX }) {
  const gltf = useGLTF(MODEL_URL, '/draco/', true)
  const cast = CAST[id]
  const { root, mixer, action, hand } = useMemo(() => {
    const root = cloneSkinned(gltf.scene)
    // Normalise to 1.8 m tall regardless of the export units.
    const box = new THREE.Box3().setFromObject(root)
    const h = box.max.y - box.min.y || 1
    root.scale.multiplyScalar(1.8 / h)
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
      }
    })
    let hand = null
    root.traverse((o) => {
      if (!hand && o.isBone && /right_?hand$/i.test(o.name.replace(/^mixamorig:?/i, ''))) hand = o
    })
    const mixer = new THREE.AnimationMixer(root)
    const clip = gltf.animations[0]
    const action = clip ? mixer.clipAction(clip) : null
    if (action) action.play()
    return { root, mixer, action, hand }
  }, [gltf])

  useFrame(() => {
    const t = story.rallyT
    root.visible = story.s > 1.55 && story.s < 4.2
    lerpPath(cast.path, t, root.position)
    root.position.x += courtX
    root.rotation.y = cast.facing
    if (action) {
      const dur = action.getClip().duration
      let local = 0
      if (cast.swings.length) {
        const dt = t - cast.swings[0]
        local = THREE.MathUtils.clamp(CONTACT_FRACTION + dt / SWING_SECONDS, 0, 1)
      }
      mixer.setTime(local * dur)
    }
  })

  return (
    <group>
      <primitive object={root} />
      {hand && <HandRacket hand={hand} />}
    </group>
  )
}

// Parent the racket to the model's hand bone.
function HandRacket({ hand }) {
  const [group] = useState(() => new THREE.Group())
  useEffect(() => {
    // Bones live in the model's (scaled) space, so undo that scale.
    const s = new THREE.Vector3()
    hand.getWorldScale(s)
    group.scale.setScalar(1 / (s.x || 1))
    hand.add(group)
    return () => hand.remove(group)
  }, [hand, group])
  return (
    <primitive object={group}>
      <Racket position={[0, 0.08, 0.02]} rotation={[0, 0, 0]} />
    </primitive>
  )
}

export default function Players({ quality = 'high' }) {
  const hasModel = useModelAvailable()
  const courtX = COURT_XS[HERO]
  // On weak devices only the two players in the rally are drawn.
  const ids = quality === 'low' ? ['A', 'B'] : ['A', 'B', 'C', 'D']
  const kits = { A: '#c4562f', C: '#c4562f', B: '#efeee9', D: '#efeee9' }
  return (
    <group>
      {ids.map((id) =>
        hasModel ? (
          <Suspense key={id} fallback={<Player id={id} kit={kits[id]} courtX={courtX} />}>
            <MixamoPlayer id={id} courtX={courtX} />
          </Suspense>
        ) : (
          <Player key={id} id={id} kit={kits[id]} courtX={courtX} />
        ),
      )}
    </group>
  )
}
