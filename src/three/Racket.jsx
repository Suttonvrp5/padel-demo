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

  const face = new THREE.ExtrudeGeometry(s, {
    depth: THICK - 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
    curveSegments: 14,
  })
  face.translate(0, 0, -(THICK - 0.008) / 2)

  const grip = new THREE.CylinderGeometry(0.0175, 0.0165, HANDLE, 16)
  grip.translate(0, HANDLE / 2, 0)
  const cap = new THREE.CylinderGeometry(0.021, 0.021, 0.012, 16)
  cap.translate(0, 0.006, 0)
  return { face, grip, cap }
}

// The drilled holes are an alpha mask on the face instead of real cut-outs:
// identical at viewing distance, ~50x fewer triangles.
// ExtrudeGeometry gives the flat faces UVs equal to the shape's x/y in
// metres, so the texture is mapped with repeat/offset to match.
function faceTextures() {
  const W = 256
  const H = Math.round((W * LEN) / HEAD_W)
  const cy = LEN - HEAD_H / 2
  const rx = HEAD_W / 2
  const ry = HEAD_H / 2
  const toPx = (x, y) => [((x + rx) / HEAD_W) * W, (1 - y / LEN) * H]
  const make = (paint) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    paint(c.getContext('2d'))
    const t = new THREE.CanvasTexture(c)
    t.repeat.set(1 / HEAD_W, 1 / LEN)
    t.offset.set(0.5, 0)
    return t
  }
  // Colour: graphite carbon face with a slim cobalt stripe.
  const map = make((ctx) => {
    ctx.fillStyle = '#3a3e48'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#1d4fd8'
    const [, sy] = toPx(0, cy - ry * 0.72)
    ctx.fillRect(0, sy, W, H * 0.014)
  })
  map.colorSpace = THREE.SRGBColorSpace
  // Alpha: white = solid, black = drilled hole (see-through).
  const alphaMap = make((ctx) => {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#000'
    for (let row = -6; row <= 6; row++) {
      for (let col = -5; col <= 5; col++) {
        const x = col * 0.021 + (row % 2 ? 0.0105 : 0)
        const y = cy + row * 0.019
        const nx = x / (rx - 0.028)
        const ny = (y - cy) / (ry - 0.028)
        if (nx * nx + ny * ny > 1) continue
        const [px, py] = toPx(x, y)
        ctx.beginPath()
        ctx.arc(px, py, (0.0062 / HEAD_W) * W, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  return { map, alphaMap }
}

let shared = null
let sharedMats = null
export default function Racket(props) {
  const g = useMemo(() => (shared ??= buildRacket()), [])
  const mats = useMemo(
    () => (sharedMats ??= {
      // Group 0 = flat faces, group 1 = the frame edge.
      face: [
        new THREE.MeshPhysicalMaterial({ ...faceTextures(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }),
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
