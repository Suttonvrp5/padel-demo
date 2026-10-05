import { useMemo } from 'react'
import * as THREE from 'three'
import { groundMaterial } from './materials'
import { GROUND, rng } from './textures'
import { addWorldUV1, merge, beam } from './geo'
import { SUN_DIR } from './Sky'

// Everything around the courts: paving, clubhouse, palms, hills, town lights.

function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(GROUND.w, GROUND.d, 1, 1)
    g.rotateX(-Math.PI / 2)
    g.translate(0, -0.005, 0)
    return addWorldUV1(g)
  }, [])
  // Beyond the lit paving, a huge dark plane that disappears into the fog.
  return (
    <group>
      <mesh geometry={geo} material={groundMaterial()} receiveShadow />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[400, 48]} />
        <meshStandardMaterial color="#0b0f1c" roughness={1} envMapIntensity={0.3} />
      </mesh>
    </group>
  )
}

// A low whitewashed Mediterranean clubhouse with warm windows and a pergola.
function Clubhouse() {
  const parts = useMemo(() => {
    const wall = []
    const glow = []
    const wood = []
    const z = -16.5
    const box = (w, h, d, x, y, zz) => {
      const g = new THREE.BoxGeometry(w, h, d)
      g.translate(x, y, zz)
      return g
    }
    wall.push(box(26, 4.2, 6, 0, 2.1, z - 3))
    wall.push(box(10, 3.2, 5, 15, 1.6, z - 3.5))
    wall.push(box(26.6, 0.35, 6.6, 0, 4.35, z - 3)) // parapet
    // Windows along the front, glowing warm.
    for (let i = 0; i < 9; i++) {
      const x = -11 + i * 2.75
      // Two tall panes per bay with a dark mullion between them.
      glow.push(box(0.8, 2.1, 0.05, x - 0.45, 1.35, z + 0.02))
      glow.push(box(0.8, 2.1, 0.05, x + 0.45, 1.35, z + 0.02))
    }
    for (let i = 0; i < 3; i++) glow.push(box(2, 1.6, 0.05, 11.5 + i * 2.7, 1.3, z - 0.98))
    // Pergola beams.
    for (let i = 0; i <= 12; i++) wood.push(beam([-12 + i * 2, 3.3, z], [-12 + i * 2, 3.3, z + 3.2], 0.12))
    for (let i = 0; i <= 6; i++) wood.push(beam([-12 + i * 4, 0, z + 3.1], [-12 + i * 4, 3.3, z + 3.1], 0.14))
    wood.push(beam([-12, 3.3, z + 3.1], [12, 3.3, z + 3.1], 0.16))
    return { wall: merge(wall), glow: merge(glow), wood: merge(wood) }
  }, [])
  return (
    <group>
      <mesh geometry={parts.wall} receiveShadow>
        <meshStandardMaterial color="#8f8a86" roughness={0.9} envMapIntensity={0.7} />
      </mesh>
      <mesh geometry={parts.glow}>
        <meshBasicMaterial color={new THREE.Color('#ff9e55').multiplyScalar(1.15)} toneMapped={false} />
      </mesh>
      <mesh geometry={parts.wood}>
        <meshStandardMaterial color="#2a1d14" roughness={0.8} />
      </mesh>
    </group>
  )
}

// Palms built from a curved trunk and drooping fronds. At night they read
// mostly as silhouettes against the glowing sky, which is the point.
function buildPalm(seed) {
  const r = rng(seed)
  const height = 7 + r() * 4
  const lean = new THREE.Vector3((r() - 0.5) * 2.4, 0, (r() - 0.5) * 2.4)
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean.x * 0.2, height * 0.4, lean.z * 0.2),
    new THREE.Vector3(lean.x * 0.6, height * 0.8, lean.z * 0.6),
    new THREE.Vector3(lean.x, height, lean.z),
  ])
  const trunk = new THREE.TubeGeometry(curve, 10, 0.17, 6, false)
  const top = curve.getPoint(1)
  const fronds = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4
    const len = 3 + r() * 1.4
    const droop = 0.5 + r() * 0.9
    // A frond is a strip that arcs up then droops, narrow at both ends.
    const segs = 8
    const pos = []
    const idx = []
    for (let s = 0; s <= segs; s++) {
      const t = s / segs
      const w = Math.sin(t * Math.PI) * 0.45 + 0.04
      const out = t * len
      const y = Math.sin(t * Math.PI * 0.7) * 0.7 - t * t * droop * 2.2
      const cx = Math.cos(a)
      const cz = Math.sin(a)
      const px = -cz
      const pz = cx
      pos.push(top.x + cx * out + px * w, top.y + y, top.z + cz * out + pz * w)
      pos.push(top.x + cx * out - px * w, top.y + y - 0.08, top.z + cz * out - pz * w)
      if (s < segs) {
        const k = s * 2
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    fronds.push(g)
  }
  return { trunk, fronds: merge(fronds) }
}

const PALMS = [
  [-23, -12], [-21, 3], [-24, 14], [23, -11], [22, 5], [24.5, 15],
  [-8, -24], [9, -25], [-17, -22], [19, -21], [-3, 19], [5, 21], [-15, 19], [15, 20],
]

function Palms() {
  const geo = useMemo(() => {
    const trunks = []
    const leaves = []
    PALMS.forEach(([x, z], i) => {
      const p = buildPalm(i * 31 + 5)
      p.trunk.translate(x, 0, z)
      p.fronds.translate(x, 0, z)
      trunks.push(p.trunk)
      leaves.push(p.fronds)
    })
    return { trunks: merge(trunks), leaves: merge(leaves) }
  }, [])
  return (
    <group>
      <mesh geometry={geo.trunks} castShadow>
        <meshStandardMaterial color="#3a3029" roughness={0.95} />
      </mesh>
      <mesh geometry={geo.leaves}>
        <meshStandardMaterial color="#1c2a1f" roughness={0.85} side={THREE.DoubleSide} envMapIntensity={0.6} />
      </mesh>
    </group>
  )
}

// A ring of low hills on the horizon, plus the scattered lights of a
// hillside town, so the club feels like it sits on a real coastline.
function Horizon() {
  const { hills, lights } = useMemo(() => {
    const r = rng(11)
    const seg = 160
    const R = 300
    const pos = []
    const idx = []
    const lightPos = []
    const lightCol = []
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2
      const dx = Math.cos(a)
      const dz = Math.sin(a)
      // Lower hills toward the sunset so the glow stays visible.
      const toward = Math.max(0, dx * SUN_DIR.x + dz * SUN_DIR.z)
      const h =
        (14 + Math.sin(a * 3.1) * 8 + Math.sin(a * 7.3 + 1) * 5 + Math.sin(a * 17.0) * 2) *
        (1 - toward * 0.75)
      pos.push(dx * R, -2, dz * R, dx * R, Math.max(2, h), dz * R)
      if (i < seg) {
        const k = i * 2
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
      }
      // Town lights cluster in a few places along the hills.
      const cluster = Math.max(0, Math.sin(a * 2.0 + 0.6)) * Math.max(0, Math.sin(a * 5.0))
      const count = Math.floor(cluster * 14)
      for (let k = 0; k < count; k++) {
        const aa = a + (r() - 0.5) * 0.04
        const rr = R - 4 - r() * 6
        const hh = 1 + r() * Math.max(2, h * 0.55)
        lightPos.push(Math.cos(aa) * rr, hh, Math.sin(aa) * rr)
        const warm = r()
        lightCol.push(1, 0.62 + warm * 0.25, 0.32 + warm * 0.3)
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lightPos, 3))
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lightCol, 3))
    return { hills: g, lights: lg }
  }, [])
  return (
    <group>
      <mesh geometry={hills} renderOrder={-5}>
        <meshBasicMaterial color="#0b1430" fog={false} side={THREE.DoubleSide} />
      </mesh>
      <points geometry={lights} renderOrder={-4}>
        <pointsMaterial size={1.6} sizeAttenuation vertexColors fog={false} transparent opacity={0.9} toneMapped={false} />
      </points>
    </group>
  )
}

// Low perimeter wall with small path lights.
function Perimeter() {
  const geo = useMemo(() => {
    const walls = []
    const lamps = []
    const W = 29
    const D = 19.5
    for (const [a, b] of [
      // The clubhouse closes off the far side, so only three walls.
      [[-W, D], [W, D]],
      [[-W, -15], [-W, D]],
      [[W, -15], [W, D]],
    ]) {
      const g = new THREE.BoxGeometry(Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.3, 0.6, 0.3)
      if (a[0] === b[0]) g.rotateY(Math.PI / 2)
      g.translate((a[0] + b[0]) / 2, 0.3, (a[1] + b[1]) / 2)
      walls.push(g)
    }
    for (let x = -26; x <= 26; x += 4.5) {
      for (const z of [D - 0.9]) {
        const l = new THREE.BoxGeometry(0.14, 0.12, 0.14)
        l.translate(x, 0.75, z)
        lamps.push(l)
      }
    }
    return { walls: merge(walls), lamps: merge(lamps) }
  }, [])
  return (
    <group>
      <mesh geometry={geo.walls} receiveShadow>
        <meshStandardMaterial color="#bdb6ad" roughness={0.9} envMapIntensity={0.7} />
      </mesh>
      <mesh geometry={geo.lamps}>
        <meshBasicMaterial color={new THREE.Color('#ffc58a').multiplyScalar(4)} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function Surroundings({ quality = 'high' }) {
  return (
    <group>
      <Ground />
      <Clubhouse />
      <Palms />
      <Perimeter />
      {quality !== 'low' && <Horizon />}
    </group>
  )
}
