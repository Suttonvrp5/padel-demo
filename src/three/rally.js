import * as THREE from 'three'

// The signature rally, choreographed as real physics.
// Between each event (hit, bounce, glass) the ball flies a true gravity arc:
// we only choose where/when it starts and lands, and solve for the launch
// velocity. Rally time `t` is in real seconds of the point.
//
// Camera sits behind the near back glass (z = +10). Player A (far side)
// drives, the ball bounces, smashes into the glass in front of the lens,
// player B (near side) takes it off the glass and sends it back over the
// net for a winner.
export const BALL_R = 0.0335
const G = 9.81

export const EVENTS = [
  { t: 0.0, p: [1.0, 1.0, -8.6], type: 'hitA' },
  { t: 0.85, p: [-0.2, BALL_R, 7.0], type: 'bounce' },
  { t: 1.07, p: [-0.45, 1.15, 10 - 0.006 - BALL_R], type: 'glass', normal: [0, 0, -1] },
  { t: 1.62, p: [-1.4, 0.95, 7.9], type: 'hitB' },
  { t: 2.57, p: [2.4, BALL_R, -6.2], type: 'bounce' },
  { t: 2.87, p: [3.1, 0.9, -10 + 0.006 + BALL_R], type: 'glass', normal: [0, 0, 1] },
  { t: 3.37, p: [2.8, BALL_R, -8.9], type: 'bounce' },
]
export const IMPACT = EVENTS[2]
export const POINT_WON_T = 2.95
export const RALLY_END_T = 3.6

// Pre-solve launch velocities for each arc.
const ARCS = EVENTS.slice(0, -1).map((a, i) => {
  const b = EVENTS[i + 1]
  const T = b.t - a.t
  const v = [
    (b.p[0] - a.p[0]) / T,
    (b.p[1] - a.p[1] + 0.5 * G * T * T) / T,
    (b.p[2] - a.p[2]) / T,
  ]
  return { a, b, v }
})

export function ballAt(t, out = new THREE.Vector3()) {
  if (t <= EVENTS[0].t) return out.set(...EVENTS[0].p)
  for (const arc of ARCS) {
    if (t <= arc.b.t) {
      const dt = t - arc.a.t
      return out.set(
        arc.a.p[0] + arc.v[0] * dt,
        arc.a.p[1] + arc.v[1] * dt - 0.5 * G * dt * dt,
        arc.a.p[2] + arc.v[2] * dt,
      )
    }
  }
  // After the last bounce: a small dying hop then rest.
  const last = EVENTS[EVENTS.length - 1]
  const dt = t - last.t
  const hop = Math.max(0, 1.6 * dt - 0.5 * G * dt * dt)
  return out.set(last.p[0] + dt * 0.5, BALL_R + hop, last.p[2] - dt * 0.3)
}

// Scroll -> rally time. Piecewise-linear so we can spend lots of scroll on
// a few milliseconds around the glass impact (slow motion), and move quickly
// through the rest. p = progress through the rally chapter (0..1).
const TIME_MAP = [
  [0.0, -0.9], // players set, A winds up
  [0.1, 0.0], // contact
  [0.28, 0.85], // bounce
  [0.36, 1.0], // ...slowing down
  [0.58, 1.13], // slow motion through the glass impact (t = 1.07)
  [0.68, 1.62], // B takes it off the glass
  [0.84, 2.57], // bounces deep on the far side
  [0.9, 2.95], // winner
  [1.0, RALLY_END_T],
]

export function rallyTime(p) {
  if (p <= 0) return TIME_MAP[0][1]
  for (let i = 1; i < TIME_MAP.length; i++) {
    const [p1, t1] = TIME_MAP[i]
    if (p <= p1) {
      const [p0, t0] = TIME_MAP[i - 1]
      return t0 + ((p - p0) / (p1 - p0)) * (t1 - t0)
    }
  }
  return RALLY_END_T
}

// Captions shown during the rally (p ranges).
export const CAPTIONS = [
  { text: 'Drive.', from: 0.03, to: 0.3 },
  { text: 'Off the glass.', from: 0.36, to: 0.61 },
  { text: 'Still in play.', from: 0.65, to: 0.89 },
]

// How strongly to squash the ball at time t (0..1) and along which axis.
export function squashAt(t) {
  for (const e of EVENTS) {
    if (e.type !== 'bounce' && e.type !== 'glass') continue
    const d = Math.abs(t - e.t)
    if (d < 0.025) return { k: 1 - d / 0.025, axis: e.type === 'glass' ? 'z' : 'y' }
  }
  return { k: 0, axis: 'y' }
}
