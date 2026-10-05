import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { story } from '../lib/story'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import Racket from './Racket'

// A stylised athletic figure (think premium sportswear ad mannequin),
// rigged with simple joints and animated with code. Every pose is driven by
// the rally clock (story.rallyT), so the swing is perfectly in sync with
// the ball however fast or slow you scroll.
//
// Conventions: the player faces +z, their right hand is on the -x side.

// Joint angles (radians) for each key pose of a forehand drive.
const POSES = {
  ready: { twist: 0, lean: 0.18, crouch: 0.55, rShX: -0.55, rShZ: -0.25, rElb: -1.35, rWr: -0.9, lShX: -0.6, lShZ: 0.3, lElb: -1.3, head: 0 },
  back: { twist: -1.15, lean: 0.12, crouch: 0.7, rShX: 0.35, rShZ: -0.95, rElb: -1.0, rWr: -1.25, lShX: -1.25, lShZ: 0.15, lElb: -0.4, head: 1.0 },
  contact: { twist: 0.15, lean: 0.22, crouch: 0.75, rShX: -0.55, rShZ: -1.15, rElb: -0.25, rWr: -0.25, lShX: -0.5, lShZ: 0.55, lElb: -1.1, head: 0.2 },
  follow: { twist: 1.05, lean: 0.12, crouch: 0.55, rShX: -1.7, rShZ: 0.45, rElb: -1.25, rWr: -0.55, lShX: -0.3, lShZ: 0.4, lElb: -1.6, head: -0.4 },
  reach: { twist: -0.5, lean: 0.45, crouch: 1.0, rShX: -0.2, rShZ: -1.45, rElb: -0.1, rWr: -0.2, lShX: -0.8, lShZ: 0.9, lElb: -0.6, head: 0.6 },
}
const KEYS = Object.keys(POSES.ready)

// Swing timeline relative to the moment of contact (seconds).
const SWING = [
  [-1.0, 'ready'],
  [-0.5, 'back'],
  [-0.18, 'back'],
  [0.0, 'contact'],
  [0.22, 'follow'],
  [0.85, 'ready'],
]

const smooth = (x) => x * x * (3 - 2 * x)
function blendPose(a, b, k, out) {
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k
  return out
}
function swingPose(dt, out) {
  if (dt <= SWING[0][0]) return blendPose(POSES.ready, POSES.ready, 0, out)
  for (let i = 1; i < SWING.length; i++) {
    if (dt <= SWING[i][0]) {
      const [t0, p0] = SWING[i - 1]
      const [t1, p1] = SWING[i]
      return blendPose(POSES[p0], POSES[p1], smooth((dt - t0) / (t1 - t0)), out)
    }
  }
  return blendPose(POSES.ready, POSES.ready, 0, out)
}

// Where each player stands over the rally: [t, x, z].
export const lerpPath = (path, t, out) => {
  if (t <= path[0][0]) return out.set(path[0][1], 0, path[0][2])
  for (let i = 1; i < path.length; i++) {
    if (t <= path[i][0]) {
      const k = smooth((t - path[i - 1][0]) / (path[i][0] - path[i - 1][0]))
      return out.set(
        path[i - 1][1] + (path[i][1] - path[i - 1][1]) * k,
        0,
        path[i - 1][2] + (path[i][2] - path[i - 1][2]) * k,
      )
    }
  }
  const l = path[path.length - 1]
  return out.set(l[1], 0, l[2])
}

// Script for each of the four players (padel is doubles).
export const CAST = {
  // Far side, drives the ball at t = 0, later lunges for the winner and misses.
  A: {
    facing: 0,
    path: [[-1, 1.55, -8.8], [0.0, 1.55, -8.7], [1.2, 0.6, -7.6], [2.3, 0.7, -7.6], [2.9, 2.05, -8.3]],
    swings: [0.0],
    reach: [2.6, 3.0],
  },
  // Near side, takes the ball off the back glass at t = 1.62.
  B: {
    facing: Math.PI,
    path: [[-1, -1.2, 7.0], [0.5, -1.2, 7.0], [1.4, -1.95, 8.05], [1.65, -1.95, 8.05], [2.6, -1.0, 6.4]],
    swings: [1.62],
  },
  // Partners, holding the net.
  // In the coaching chapter C becomes the student, D the coach.
  C: { facing: 0, path: [[-1, -2.3, -3.6], [1.0, -2.0, -3.4], [2.6, -0.8, -3.2]], swings: [], idle: true, coaching: { at: [-1.3, 2.6], facing: Math.PI / 2 + 0.5, loop: 2.6 } },
  D: { facing: Math.PI, path: [[-1, 2.4, 3.4], [1.0, 2.2, 3.2], [2.0, 1.4, 2.6]], swings: [], idle: true, coaching: { at: [0.5, 4.4], facing: -2.3 } },
}

const SKIN = '#8d6e5c'
// Body parts are built from simple shapes. Pieces that move together
// (e.g. a thigh and its shorts leg) are merged into one mesh with colours
// baked into the vertices, so each player costs ~15 draw calls instead of ~25.
const COLORS = { skin: SKIN, shorts: '#10131c', hair: '#17110d', shoe: '#f2f2ee' }

const cap = (r, len) => {
  const g = new THREE.CapsuleGeometry(r, len, 4, 10)
  g.translate(0, -len / 2 - r * 0.3, 0)
  return g
}
const SHAPES = {
  torso: () => {
    const g = new THREE.CapsuleGeometry(0.15, 0.28, 6, 14)
    g.scale(1.15, 1, 0.68)
    g.translate(0, 0.2, 0)
    return g
  },
  pelvis: () => {
    const g = new THREE.CapsuleGeometry(0.135, 0.06, 4, 12)
    g.scale(1.15, 1, 0.75)
    return g
  },
  head: () => new THREE.SphereGeometry(0.094, 20, 16),
  hair: () => {
    const g = new THREE.SphereGeometry(0.099, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)
    g.rotateX(-0.25)
    g.translate(0, 0.012, -0.008)
    return g
  },
  foot: () => {
    const g = new THREE.CapsuleGeometry(0.045, 0.17, 4, 10)
    g.rotateX(Math.PI / 2)
    g.scale(1.1, 0.85, 1)
    g.translate(0, -0.04, 0.05)
    return g
  },
}

function paint(geo, color, dy = 0) {
  const g = (geo.index ? geo.toNonIndexed() : geo).translate(0, dy, 0)
  const c = new THREE.Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  g.deleteAttribute('uv')
  return g
}
const join = (...parts) => mergeGeometries(parts)

const partsCache = new Map()
function bodyParts(kit) {
  if (!partsCache.has(kit)) {
    const { skin, shorts, hair, shoe } = COLORS
    partsCache.set(kit, {
      pelvis: paint(SHAPES.pelvis(), shorts),
      thigh: join(paint(cap(0.075, 0.36), skin), paint(cap(0.088, 0.14), shorts, 0.02)),
      shin: paint(cap(0.055, 0.36), skin),
      foot: paint(SHAPES.foot(), shoe),
      torso: join(paint(SHAPES.torso(), kit), paint(cap(0.045, 0.06), skin, 0.59)),
      head: join(paint(SHAPES.head(), skin), paint(SHAPES.hair(), hair)),
      upperArm: join(paint(cap(0.047, 0.24), skin), paint(cap(0.058, 0.07), kit, 0.02)),
      foreArm: join(paint(cap(0.04, 0.22), skin), paint(new THREE.SphereGeometry(0.045, 10, 8), skin, -0.27)),
    })
  }
  return partsCache.get(kit)
}

const bodyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0 })

// Write a pose onto the joint groups.
function applyPose(j, p, breathe = 0) {
  const c = p.crouch
  const knee = c * 1.1
  const drop = 0.82 * (1 - Math.cos(knee / 2)) * 0.9
  j.hips.position.y = 0.96 - drop
  j.hips.rotation.y = p.twist * 0.35
  j.spine.rotation.set(p.lean + breathe, p.twist * 0.65, 0, 'YXZ')
  j.head.rotation.y = -p.twist * 0.6 + p.head * 0.3
  j.rSh.rotation.set(p.rShX, 0, p.rShZ, 'XZY')
  j.rEl.rotation.x = p.rElb
  j.rWr.rotation.x = p.rWr
  j.lSh.rotation.set(p.lShX, 0, p.lShZ, 'XZY')
  j.lEl.rotation.x = p.lElb
  // Legs: athletic split stance, knees over toes.
  j.rHip.rotation.set(-knee / 2 - 0.12, 0, 0.06)
  j.lHip.rotation.set(-knee / 2 + 0.18, 0, -0.06)
  j.rKnee.rotation.x = knee
  j.lKnee.rotation.x = knee * 0.9
  j.rFoot.rotation.x = -knee / 2 + 0.12
  j.lFoot.rotation.x = -knee / 2 - 0.16
}

// Coaching chapter: the student loops slow forehands, the coach watches.
function applyCoaching(j, cfg, time, courtX, pose) {
  j.root.position.set(courtX + cfg.at[0], 0, cfg.at[1])
  j.root.rotation.y = cfg.facing
  if (cfg.loop) swingPose(((time % cfg.loop) - cfg.loop * 0.62) * 0.8, pose)
  else blendPose(POSES.ready, POSES.ready, 0, pose)
  if (!cfg.loop) {
    pose.crouch = 0.25
    pose.twist = Math.sin(time * 0.7) * 0.15
  }
  applyPose(j, pose, Math.sin(time * 2) * 0.02)
}

const M = ({ geo, ...rest }) => <mesh geometry={geo} material={bodyMaterial} castShadow {...rest} />

export default function Player({ id, kit = '#f3f1ec', courtX = 0 }) {
  const m = bodyParts(kit)
  const cast = CAST[id]
  const r = useRef({})
  const ref = (k) => (o) => (r.current[k] = o)
  const tmp = useMemo(() => ({ pose: { ...POSES.ready }, pos: new THREE.Vector3(), prev: new THREE.Vector3(), bob: 0 }), [])

  useFrame((state) => {
    const j = r.current
    if (!j.root) return
    const t = story.rallyT
    const coaching = story.s > 3.04
    const visible = story.s > 1.55 && story.s < 4.2 && (!coaching || !!cast.coaching)
    j.root.visible = visible
    if (!visible) return
    if (coaching) return applyCoaching(j, cast.coaching, state.clock.elapsedTime, courtX, tmp.pose)

    // Position on court + a little step bounce while moving.
    tmp.prev.copy(tmp.pos)
    lerpPath(cast.path, t, tmp.pos)
    const speed = tmp.pos.distanceTo(tmp.prev)
    tmp.bob += speed * 9
    j.root.position.set(courtX + tmp.pos.x, Math.abs(Math.sin(tmp.bob)) * Math.min(1, speed * 40) * 0.04, tmp.pos.z)
    j.root.rotation.y = cast.facing

    // Pose: nearest swing, or a reach, or idle ready stance with breathing.
    const p = tmp.pose
    let nearest = null
    for (const c of cast.swings) if (nearest === null || Math.abs(t - c) < Math.abs(t - nearest)) nearest = c
    if (nearest !== null) swingPose(t - nearest, p)
    else blendPose(POSES.ready, POSES.ready, 0, p)
    if (cast.reach) {
      const [a, b] = cast.reach
      const k = t < a ? 0 : t > b + 0.4 ? 0 : t < b ? smooth((t - a) / (b - a)) : 1 - smooth((t - b) / 0.4)
      if (k > 0) blendPose({ ...p }, POSES.reach, k, p)
    }
    const breathe = Math.sin(state.clock.elapsedTime * 2.1 + courtX + cast.facing) * 0.02
    if (cast.idle) {
      // Partners track the ball with their body.
      p.twist = Math.sin(t * 1.3) * 0.25
      p.crouch += breathe * 2
    }

    applyPose(j, p, breathe)
  })

  return (
    <group ref={ref('root')}>
      <group ref={ref('hips')} position-y={0.96}>
        <M geo={m.pelvis} />
        {/* Legs */}
        {[
          ['r', -0.095, 'rHip', 'rKnee', 'rFoot'],
          ['l', 0.095, 'lHip', 'lKnee', 'lFoot'],
        ].map(([k, x, hip, knee, foot]) => (
          <group key={k} ref={ref(hip)} position={[x, -0.04, 0]}>
            <M geo={m.thigh} />
            <group ref={ref(knee)} position-y={-0.43}>
              <M geo={m.shin} />
              <group ref={ref(foot)} position-y={-0.43}>
                <M geo={m.foot} castShadow={false} />
              </group>
            </group>
          </group>
        ))}
        {/* Torso, neck and head */}
        <group ref={ref('spine')} position-y={0.06}>
          <M geo={m.torso} />
          <group ref={ref('head')} position-y={0.63}>
            <M geo={m.head} />
          </group>
          {/* Right (racket) arm */}
          <group ref={ref('rSh')} position={[-0.2, 0.43, 0]}>
            <M geo={m.upperArm} />
            <group ref={ref('rEl')} position-y={-0.3}>
              <M geo={m.foreArm} />
              <group ref={ref('rWr')} position-y={-0.27}>
                <Racket position={[0, 0.06, 0]} rotation={[Math.PI, 0, 0]} />
              </group>
            </group>
          </group>
          {/* Left arm */}
          <group ref={ref('lSh')} position={[0.2, 0.43, 0]}>
            <M geo={m.upperArm} />
            <group ref={ref('lEl')} position-y={-0.3}>
              <M geo={m.foreArm} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
