import * as THREE from 'three'
import { COURT_XS, LIGHTS } from './layout'

// All textures here are painted in code on a <canvas>, so the site has
// nothing to download for them and they stay crisp at any size.

const canvas = (w, h) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

// Small deterministic random generator so textures look the same every load.
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const cache = new Map()
const memo = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

// Artificial turf: fine fibre noise for colour, and a matching normal map so
// light catches the grain at grazing angles.
export const turfTextures = () =>
  memo('turf', () => {
    const size = 512
    const rand = rng(7)
    const [c, ctx] = canvas(size, size)
    const height = new Float32Array(size * size)
    const img = ctx.createImageData(size, size)
    // Blades: many short strokes in random directions.
    for (let i = 0; i < size * size; i++) height[i] = rand() * 0.35
    for (let k = 0; k < 26000; k++) {
      let x = rand() * size
      let y = rand() * size
      const a = rand() * Math.PI * 2
      const len = 2 + rand() * 5
      const h = 0.4 + rand() * 0.6
      for (let t = 0; t < len; t++) {
        const xi = (Math.floor(x) + size) % size
        const yi = (Math.floor(y) + size) % size
        height[yi * size + xi] = Math.max(height[yi * size + xi], h * (1 - t / len) + 0.2)
        x += Math.cos(a)
        y += Math.sin(a)
      }
    }
    for (let i = 0; i < size * size; i++) {
      const v = 0.82 + height[i] * 0.28
      img.data[i * 4 + 0] = 255 * v
      img.data[i * 4 + 1] = 255 * v
      img.data[i * 4 + 2] = 255 * v
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    const map = new THREE.CanvasTexture(c)
    map.colorSpace = THREE.SRGBColorSpace

    const [nc, nctx] = canvas(size, size)
    const nimg = nctx.createImageData(size, size)
    const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2
        const dy = (at(x, y + 1) - at(x, y - 1)) * 2.2
        const l = Math.hypot(dx, dy, 1)
        const i = (y * size + x) * 4
        nimg.data[i] = (-dx / l * 0.5 + 0.5) * 255
        nimg.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255
        nimg.data[i + 2] = (1 / l * 0.5 + 0.5) * 255
        nimg.data[i + 3] = 255
      }
    }
    nctx.putImageData(nimg, 0, 0)
    const normalMap = new THREE.CanvasTexture(nc)
    for (const t of [map, normalMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
    }
    return { map, normalMap }
  })

// Welded steel mesh used above the glass and on the side walls.
// Only an alpha mask: black wire where white, see-through where black.
export const meshAlpha = () =>
  memo('mesh', () => {
    const size = 128
    const [c, ctx] = canvas(size, size)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    const cells = 4
    for (let i = 0; i <= cells; i++) {
      const p = (i / cells) * size
      ctx.beginPath()
      ctx.moveTo(p, 0)
      ctx.lineTo(p, size)
      ctx.moveTo(0, p)
      ctx.lineTo(size, p)
      ctx.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })

// Net: finer knotted grid.
export const netAlpha = () =>
  memo('net', () => {
    const size = 64
    const [c, ctx] = canvas(size, size)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.strokeRect(0, 0, size, size)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 8
    return t
  })

// "Baked" lighting for the ground. We know exactly where every floodlight
// is, so instead of paying for dozens of real-time lights we pre-compute the
// pools of light they cast (plus soft darkening near walls) into a texture
// once, when the page loads. This is what "baking" lighting means.
export const GROUND = { w: 64, d: 44 }
export const groundLightMap = () =>
  memo('groundLight', () => {
    const W = 512
    const H = Math.round((W * GROUND.d) / GROUND.w)
    const [c, ctx] = canvas(W, H)
    const img = ctx.createImageData(W, H)
    const toWorld = (px, py) => [
      (px / W - 0.5) * GROUND.w,
      (py / H - 0.5) * GROUND.d,
    ]
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const [x, z] = toWorld(px + 0.5, py + 0.5)
        let e = 0
        for (const L of LIGHTS) {
          // Each head aims toward its court's centre line; approximate the
          // beam as an ellipse elongated along z with a soft edge.
          const dx = x - L.aim[0]
          const dz = z - L.aim[2]
          const dy = L.pos[1]
          const d2 = dx * dx + dz * dz + dy * dy
          const cos = dy / Math.sqrt(d2)
          const beam = Math.exp(-(dx * dx) / 30 - (dz * dz) / 70)
          e += (cos * cos * cos * 40) / d2 * (0.35 + beam * 1.6)
        }
        // Ambient occlusion: darken right against court walls.
        let ao = 1
        for (const cx of COURT_XS) {
          const lx = Math.abs(x - cx)
          const lz = Math.abs(z)
          if (lx < 5.6 && lz < 10.6) {
            const toSide = Math.abs(lx - 5)
            const toBack = Math.abs(lz - 10)
            const dist = Math.min(lx <= 5 && lz <= 10 ? Math.min(toSide, toBack) : Math.hypot(Math.max(0, lx - 5), Math.max(0, lz - 10)), 1)
            ao = Math.min(ao, 0.55 + 0.45 * Math.min(1, dist / 0.6))
          }
        }
        // Soft roll-off instead of a hard clip, so the pools under each
        // light stay visible instead of flattening into one white block.
        const lit = e * 0.55
        const v = (lit / (1 + lit)) * ao * 1.25
        const i = (py * W + px) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(1, v) * 255
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    return t
  })

// Soft round sprite used for light glows and lens flares.
export const glowTexture = () =>
  memo('glow', () => {
    const size = 128
    const [c, ctx] = canvas(size, size)
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.15, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.12)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(c)
  })

// Ball felt: tiny fuzz noise used as a bump/roughness map.
export const feltTexture = () =>
  memo('felt', () => {
    const size = 128
    const rand = rng(3)
    const [c, ctx] = canvas(size, size)
    const img = ctx.createImageData(size, size)
    for (let i = 0; i < size * size; i++) {
      const v = 160 + rand() * 95
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    // The seam: a curvy white line like a real ball.
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = 0; x <= size; x++) {
      const y = size / 2 + Math.sin((x / size) * Math.PI * 4) * size * 0.22
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  })
