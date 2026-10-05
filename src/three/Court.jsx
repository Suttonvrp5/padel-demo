import { useMemo } from 'react'
import * as THREE from 'three'
import { COURT, COURT_XS } from './layout'
import { beam, quad, pane, addWorldUV1, merge } from './geo'
import {
  glassMaterial,
  glassEdgeMaterial,
  steelMaterial,
  fenceMaterial,
  netMaterial,
  turfMaterial,
  lineMaterial,
} from './materials'

const HL = COURT.length / 2 // 10
const HW = COURT.width / 2 // 5

// Height of the top of the side fence at distance |z| from the net.
// Back corners are 4 m, stepping down to 3 m over the first 2 m.
const fenceTop = (az) => (az > 8 ? 3 + (az - 8) / 2 : COURT.sideMeshHeight)
// Height of the side glass at |z|: 3 m stepping to 2 m over the first 2 m,
// then 2 m for the next 2 m, then none (mesh only).
const glassTop = (az) => (az > 8 ? 2 + (az - 8) / 2 : az > 6 ? 2 : 0)
// (glassTop(10) = 3, glassTop(8.001) ~ 2, glassTop(6.001) = 2)

// Net top follows a gentle sag: 0.92 m at the posts, 0.88 m at the centre.
export const netHeight = (x) =>
  COURT.netCentre + (COURT.netPost - COURT.netCentre) * (x / HW) ** 2

function buildCourt(cx) {
  const turf = []
  const lines = []
  const glass = []
  const edges = []
  const fence = []
  const steel = []
  const net = []
  const tape = []

  // --- Turf: the 20 x 10 m playing area -------------------------------
  const t = new THREE.PlaneGeometry(COURT.width, COURT.length, 1, 1)
  t.rotateX(-Math.PI / 2)
  // Turf texture UVs: one texture tile per metre.
  const uv = t.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * COURT.width * 0.5, uv.getY(i) * COURT.length * 0.5)
  t.translate(cx, 0, 0)
  turf.push(t)

  // --- Lines: 5 cm white. Service lines 6.95 m from the net; the centre
  // service line runs between them and extends 20 cm beyond each. -------
  const lw = COURT.lineWidth
  const line = (x0, z0, x1, z1) => {
    const g = new THREE.PlaneGeometry(Math.abs(x1 - x0) || lw, Math.abs(z1 - z0) || lw)
    g.rotateX(-Math.PI / 2)
    g.translate(cx + (x0 + x1) / 2, 0.002, (z0 + z1) / 2)
    lines.push(g)
  }
  for (const s of [-1, 1]) line(-HW, s * COURT.serviceLine, HW, s * COURT.serviceLine)
  line(0, -(COURT.serviceLine + 0.2), 0, COURT.serviceLine + 0.2)

  // --- Back walls: 3 m glass in five 2 m panes + 1 m of mesh above -----
  for (const s of [-1, 1]) {
    const z = s * (HL + 0.006)
    for (let i = 0; i < 5; i++) {
      const x = cx - HW + 1 + i * 2
      const p = pane(1.98, COURT.backGlass, COURT.backGlass)
      p.translate(x, 0, z)
      glass.push(p)
      edges.push(beam([x - 0.99, 0, z], [x - 0.99, COURT.backGlass, z], 0.014))
      edges.push(beam([x - 0.99, COURT.backGlass, z], [x + 0.99, COURT.backGlass, z], 0.014))
      // Stainless clamps holding each pane to the posts.
      for (const [fx, fy] of [[-0.99, 0.3], [0.99, 0.3], [-0.99, 2.7], [0.99, 2.7]]) {
        const c = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10)
        c.rotateX(Math.PI / 2)
        c.translate(x + fx, fy, z + s * 0.03)
        steel.push(c)
      }
    }
    const zm = s * (HL + 0.03)
    fence.push(quad([cx - HW, 3, zm], [cx + HW, 3, zm], [cx + HW, 4, zm], [cx - HW, 4, zm], 1))
    // Posts every 2 m outside the glass, plus top and mid rails.
    for (let i = 0; i <= 5; i++) {
      const x = cx - HW + i * 2
      steel.push(beam([x, 0, s * (HL + 0.07)], [x, 4, s * (HL + 0.07)], 0.08))
    }
    steel.push(beam([cx - HW, 4, zm], [cx + HW, 4, zm], 0.06))
    steel.push(beam([cx - HW, 3.0, zm], [cx + HW, 3.0, zm], 0.05))
  }

  // --- Side walls -------------------------------------------------------
  for (const sx of [-1, 1]) {
    const x = cx + sx * (HW + 0.006)
    const xm = cx + sx * (HW + 0.03)
    const xp = cx + sx * (HW + 0.07)
    for (const sz of [-1, 1]) {
      // Stepped glass: 3 -> 2 m across the first 2 m, then 2 m tall for 2 m.
      for (const [z0, z1] of [[10, 8], [8, 6]]) {
        const hA = glassTop(z0) // height at the back end
        const hB = glassTop(z1 + 0.001) // height at the net end
        const p = pane(1.98, hA, hB)
        // Pane is built in the x/y plane; turn it so its tall end faces the back wall.
        p.rotateY((sz * Math.PI) / 2)
        p.translate(x, 0, (sz * (z0 + z1)) / 2)
        glass.push(p)
        // Mesh above the glass up to the fence top.
        fence.push(
          quad([xm, hA, sz * z0], [xm, hB, sz * z1], [xm, fenceTop(z1), sz * z1], [xm, fenceTop(z0), sz * z0], 1),
        )
        edges.push(beam([x, hA, sz * (z0 - 0.01)], [x, hB, sz * (z1 + 0.01)], 0.014))
        for (const [fz, fy] of [[z0 - 0.01, 0.3], [z1 + 0.01, 0.3], [z0 - 0.01, hA - 0.3], [z1 + 0.01, hB - 0.3]]) {
          const c = new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10)
          c.rotateZ(Math.PI / 2)
          c.translate(x + sx * 0.03, fy, sz * fz)
          steel.push(c)
        }
      }
      // Black mesh on the middle 12 m of each side.
      fence.push(quad([xm, 0, sz * 6], [xm, 0, 0], [xm, 3, 0], [xm, 3, sz * 6], 1))
      // Posts every 2 m.
      for (let z = 0; z <= 10; z += 2) {
        steel.push(beam([xp, 0, sz * z], [xp, fenceTop(z), sz * z], 0.08))
      }
      // Top rail follows the stepped profile, mid rail along the glass top.
      steel.push(beam([xm, 4, sz * 10], [xm, 3, sz * 8], 0.06))
      steel.push(beam([xm, 3, sz * 8], [xm, 3, 0], 0.06))
      steel.push(beam([xm, 3, sz * 10], [xm, 2, sz * 8], 0.05))
      steel.push(beam([xm, 2, sz * 8], [xm, 2, sz * 6], 0.05))
      steel.push(beam([xm, 1.0, sz * 6], [xm, 1.0, 0], 0.035))
    }
  }

  // --- Net -------------------------------------------------------------
  const segs = 24
  const ng = new THREE.PlaneGeometry(COURT.width, 1, segs, 1)
  const np = ng.attributes.position
  const nuv = ng.attributes.uv
  for (let i = 0; i < np.count; i++) {
    const x = np.getX(i)
    const top = np.getY(i) > 0
    const y = top ? netHeight(x) - 0.05 : 0.04
    np.setXYZ(i, cx + x, y, 0)
    nuv.setXY(i, (x + HW), y)
  }
  ng.computeVertexNormals()
  net.push(ng)
  // White tape along the top.
  for (let i = 0; i < segs; i++) {
    const xa = -HW + (i / segs) * COURT.width
    const xb = -HW + ((i + 1) / segs) * COURT.width
    tape.push(quad([cx + xa, netHeight(xa) - 0.055, 0], [cx + xb, netHeight(xb) - 0.055, 0], [cx + xb, netHeight(xb), 0], [cx + xa, netHeight(xa), 0]))
  }
  for (const sx of [-1, 1]) {
    steel.push(beam([cx + sx * (HW + 0.04), 0, 0], [cx + sx * (HW + 0.04), COURT.netPost + 0.02, 0], 0.07))
  }

  return { turf, lines, glass, edges, fence, steel, net, tape }
}

export function useClubGeometry() {
  return useMemo(() => {
    const parts = COURT_XS.map(buildCourt)
    const all = (k) => merge(parts.flatMap((p) => p[k]))
    const out = {
      turf: addWorldUV1(all('turf')),
      lines: addWorldUV1(all('lines')),
      glass: all('glass'),
      edges: all('edges'),
      fence: all('fence'),
      steel: all('steel'),
      net: all('net'),
      tape: all('tape'),
    }
    return out
  }, [])
}

export default function Courts() {
  const g = useClubGeometry()
  return (
    <group>
      <mesh geometry={g.turf} material={turfMaterial()} receiveShadow />
      <mesh geometry={g.lines} material={lineMaterial()} receiveShadow />
      <mesh geometry={g.steel} material={steelMaterial()} castShadow receiveShadow />
      <mesh geometry={g.net} material={netMaterial()} castShadow />
      <mesh geometry={g.tape} material={lineMaterial()} />
      <mesh geometry={g.fence} material={fenceMaterial()} renderOrder={1} />
      <mesh geometry={g.edges} material={glassEdgeMaterial()} renderOrder={2} />
      <mesh geometry={g.glass} material={glassMaterial()} renderOrder={3} />
    </group>
  )
}
