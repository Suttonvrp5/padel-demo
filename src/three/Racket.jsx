import { useMemo } from 'react'
import * as THREE from 'three'

// A padel racket built in code, to real specs: 45.5 cm long, 26 cm wide,
// 38 mm thick, solid perforated face (padel rackets have no strings).
// The origin is the butt of the handle; the racket points along +y.
const LEN = 0.455
const HEAD_W = 0.26
const HEAD_H = 0.29
const THICK = 0.038
const HANDLE = 0.135

function buildRacket() {
  const cx = 0
  const cy = LEN - HEAD_H / 2
  const rx = HEAD_W / 2
  const ry = HEAD_H / 2

  // Outline: rounded head flowing into a narrow neck.
  const s = new THREE.Shape()
  s.moveTo(-0.022, HANDLE)
  s.bezierCurveTo(-0.03, HANDLE + 0.04, -rx * 0.98, cy - ry * 0.75, -rx, cy)
  s.absellipse(cx, cy, rx, ry, Math.PI, 0, true)
  s.bezierCurveTo(rx * 0.98, cy - ry * 0.75, 0.03, HANDLE + 0.04, 0.022, HANDLE)
  s.lineTo(-0.022, HANDLE)

  // Open throat (the triangular gap most padel rackets have).
  const throat = new THREE.Path()
  throat.moveTo(0, HANDLE + 0.035)
  throat.lineTo(-0.034, cy - ry + 0.012)
  throat.quadraticCurveTo(0, cy - ry - 0.008, 0.034, cy - ry + 0.012)
  throat.lineTo(0, HANDLE + 0.035)
  s.holes.push(throat)

  // Drilled holes in a staggered grid inside the hitting area.
  const hr = 0.0062
  for (let row = -6; row <= 6; row++) {
    for (let col = -5; col <= 5; col++) {
      const x = col * 0.021 + (row % 2 ? 0.0105 : 0)
      const y = cy + row * 0.019
      const nx = x / (rx - 0.028)
      const ny = (y - cy) / (ry - 0.028)
      if (nx * nx + ny * ny > 1) continue
      const h = new THREE.Path()
      h.absarc(x, y, hr, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
  }

  const face = new THREE.ExtrudeGeometry(s, {
    depth: THICK - 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 18,
  })
  face.translate(0, 0, -(THICK - 0.008) / 2)

  const grip = new THREE.CylinderGeometry(0.0175, 0.0165, HANDLE, 16)
  grip.translate(0, HANDLE / 2, 0)
  const cap = new THREE.CylinderGeometry(0.021, 0.021, 0.012, 16)
  cap.translate(0, 0.006, 0)
  return { face, grip, cap }
}

let shared = null
export default function Racket(props) {
  const g = useMemo(() => (shared ??= buildRacket()), [])
  const mats = useMemo(
    () => ({
      // Group 0 = flat faces, group 1 = the frame edge.
      face: [
        new THREE.MeshPhysicalMaterial({ color: '#0f1013', roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }),
        new THREE.MeshStandardMaterial({ color: '#e9ecef', roughness: 0.4, metalness: 0.1 }),
      ],
      grip: new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.9 }),
      cap: new THREE.MeshStandardMaterial({ color: '#1d4fd8', roughness: 0.4, metalness: 0.3 }),
    }),
    [],
  )
  return (
    <group {...props}>
      <mesh geometry={g.face} material={mats.face} castShadow />
      <mesh geometry={g.grip} material={mats.grip} castShadow />
      <mesh geometry={g.cap} material={mats.cap} />
    </group>
  )
}
