import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GROUND } from './textures'

// A square steel beam from point a to point b.
export function beam(a, b, size = 0.06) {
  const A = new THREE.Vector3(...a)
  const B = new THREE.Vector3(...b)
  const len = A.distanceTo(B)
  const g = new THREE.BoxGeometry(size, len, size)
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    B.clone().sub(A).normalize(),
  )
  g.applyQuaternion(q)
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2)
  return g
}

// Flat panel through 4 corners (bottom-left, bottom-right, top-right,
// top-left). UVs are in metres so tiling textures keep a real-world scale.
export function quad(p0, p1, p2, p3, tile = 1) {
  const g = new THREE.BufferGeometry()
  const pos = [p0, p1, p2, p0, p2, p3].flat()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const along = new THREE.Vector3(...p1).sub(new THREE.Vector3(...p0))
  along.normalize()
  const uv = [p0, p1, p2, p0, p2, p3].flatMap((p) => {
    const v = new THREE.Vector3(...p).sub(new THREE.Vector3(...p0))
    return [v.dot(along) / tile, p[1] / tile]
  })
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

// Glass pane with real thickness. `heights` = [left, right] top heights so
// the stepped corner panes on the side walls can slope.
export function pane(width, hLeft, hRight, thickness = 0.012) {
  const s = new THREE.Shape()
  s.moveTo(-width / 2, 0)
  s.lineTo(width / 2, 0)
  s.lineTo(width / 2, hRight)
  s.lineTo(-width / 2, hLeft)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false })
  g.translate(0, 0, -thickness / 2)
  return g
}

// Second UV set that maps world x/z onto the baked ground light map.
export function addWorldUV1(geometry) {
  const p = geometry.attributes.position
  const uv1 = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    uv1[i * 2] = p.getX(i) / GROUND.w + 0.5
    uv1[i * 2 + 1] = p.getZ(i) / GROUND.d + 0.5
  }
  geometry.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2))
  return geometry
}

// Merging many small meshes into one keeps the number of draw calls low,
// which is one of the biggest wins for phone performance.
export const merge = (list) => {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    for (const k of Object.keys(n.attributes)) {
      if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k)
    }
    if (!n.attributes.uv) {
      n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
    }
    return n
  })
  return mergeGeometries(clean, false)
}
