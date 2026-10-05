import * as THREE from 'three'

// The camera route through the whole scroll story.
// `s` is the story float from story.js (chapter index + progress).
// pos = where the camera is, look = what it points at, fov = zoom
// (smaller = more telephoto).
const K = (s, pos, look, fov = 35) => ({ s, pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov })

// Membership: a sweeping orbit around the whole club.
const orbit = (s, angle, radius, height, fov = 34) =>
  K(s, [Math.sin(angle) * radius, height, Math.cos(angle) * radius], [0, 1.2, 0], fov)

export const KEYS = [
  // 0 · Intro: high aerial over the lit club (a slow orbit is added on top).
  K(0.0, [30, 15, 37], [0, 0.6, -3], 30),
  K(0.5, [24, 9.5, 28], [0, 1.0, -2], 32),
  // 1 · Descend to player height and glide along the glass.
  K(1.0, [11.5, 2.6, 17], [0, 1.3, 3], 36),
  K(1.35, [7.2, 1.55, 12.6], [0, 1.25, 5], 38),
  K(1.7, [-2.2, 1.45, 11.7], [0.6, 1.2, 4], 38),
  // 2 · The rally. Camera parks behind the back glass at player height.
  K(2.0, [0.35, 1.3, 11.1], [0, 1.05, 0], 38),
  K(2.14, [0.4, 1.22, 10.8], [0, 1.0, 0], 36),
  K(2.4, [0.48, 1.18, 10.58], [0.3, 1.1, 4], 31),
  K(2.52, [0.5, 1.18, 10.5], [0.45, 1.15, 6], 27), // impact, in slow motion
  K(2.64, [0.55, 1.28, 10.7], [0.2, 1.05, 1], 33),
  K(2.82, [0.1, 1.7, 11.0], [-0.6, 0.8, -3], 36),
  K(2.97, [-0.1, 2.6, 11.8], [-1.2, 0.4, -5], 38),
  // 3 · Coaching: low and courtside, skimming the turf.
  K(3.2, [4.3, 0.46, 5.8], [-0.8, 0.95, -2.5], 34),
  K(3.82, [4.15, 0.4, -0.6], [-1.2, 1.05, -6], 33),
  // Lift over the 3 m side fence before sweeping out.
  K(4.0, [4.4, 3.9, -1.2], [-2, 0.8, -6], 36),
  // 4 · Membership: sweep around the club.
  orbit(4.15, 1.6, 20, 4.2),
  orbit(4.4, 1.0, 22, 5.5),
  orbit(4.65, 0.4, 24, 7),
  orbit(4.9, -0.25, 26, 8.5),
  // 5 · Final: pull back to the whole club, sunset glow behind it.
  K(5.25, [-9, 12, 36], [0, 0.5, -3], 32),
  K(5.6, [-6, 21, 50], [0, 0, -4], 30),
  K(6.0, [-4, 27, 60], [0, 0, -5], 28),
]

// Catmull-Rom: a smooth curve that passes through every keyframe.
const cr = (p0, p1, p2, p3, t, out) => {
  const t2 = t * t
  const t3 = t2 * t
  return out.set(0, 0, 0)
    .addScaledVector(p0, -0.5 * t3 + t2 - 0.5 * t)
    .addScaledVector(p1, 1.5 * t3 - 2.5 * t2 + 1)
    .addScaledVector(p2, -1.5 * t3 + 2 * t2 + 0.5 * t)
    .addScaledVector(p3, 0.5 * t3 - 0.5 * t2)
}

export function sampleCamera(s, outPos, outLook) {
  const n = KEYS.length
  let i = 0
  while (i < n - 2 && s >= KEYS[i + 1].s) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = THREE.MathUtils.clamp((s - a.s) / (b.s - a.s), 0, 1)
  const k0 = KEYS[Math.max(0, i - 1)]
  const k3 = KEYS[Math.min(n - 1, i + 2)]
  cr(k0.pos, a.pos, b.pos, k3.pos, t, outPos)
  cr(k0.look, a.look, b.look, k3.look, t, outLook)
  // Ease the zoom so it never pops.
  const e = t * t * (3 - 2 * t)
  return THREE.MathUtils.lerp(a.fov, b.fov, e)
}
