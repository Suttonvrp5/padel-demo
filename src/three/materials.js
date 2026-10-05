import * as THREE from 'three'
import { meshAlpha, netAlpha, turfTextures, groundLightMap } from './textures'

const cache = new Map()
const memo = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn())
  return cache.get(key)
}

// Tempered glass. Real glass mostly lets light through and *adds* a
// reflection on top. Standard transparency can't do that (it fades the
// reflection along with everything else), so we switch the material to
// "premultiplied alpha": the reflection is added at full strength while
// only a faint tint darkens what's behind. Far cheaper than true
// refraction, which matters on phones.
export const glassMaterial = () =>
  memo('glass', () => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#0a1412',
      roughness: 0.035,
      metalness: 0,
      ior: 1.52,
      specularIntensity: 1,
      envMapIntensity: 1.6,
      transparent: true,
      premultipliedAlpha: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <opaque_fragment>',
          /* glsl */ `
          // Fresnel: glass reflects more at grazing angles, like a real pane.
          float fres = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 4.0);
          float tint = mix(diffuseColor.a, 0.4, fres);
          gl_FragColor = vec4(outgoingLight * (1.0 + fres * 0.5) + vec3(0.02, 0.05, 0.045) * tint, tint);
          `,
        )
        .replace('#include <premultiplied_alpha_fragment>', '')
    }
    return m
  })

// Thin bright edge so every pane reads as a separate sheet of glass.
export const glassEdgeMaterial = () =>
  memo('glassEdge', () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7fb8a8').multiplyScalar(0.55),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  )

export const steelMaterial = () =>
  memo('steel', () =>
    new THREE.MeshStandardMaterial({ color: '#0d0e11', metalness: 0.65, roughness: 0.42, envMapIntensity: 1.2 }),
  )

export const fenceMaterial = () =>
  memo('fence', () => {
    const a = meshAlpha().clone()
    a.repeat.set(4, 4)
    a.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      color: '#070809',
      metalness: 0.5,
      roughness: 0.5,
      alphaMap: a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  })

export const netMaterial = () =>
  memo('net', () => {
    const a = netAlpha().clone()
    a.repeat.set(1 / 0.045, 1 / 0.045)
    a.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      color: '#0a0a0a',
      roughness: 0.8,
      alphaMap: a,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  })

const lightMapFor = () => {
  const lm = groundLightMap().clone()
  lm.channel = 1
  lm.needsUpdate = true
  return lm
}

// Cobalt artificial turf.
export const turfMaterial = () =>
  memo('turf', () => {
    const { map, normalMap } = turfTextures()
    return new THREE.MeshStandardMaterial({
      color: '#1745c8',
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.92,
      metalness: 0,
      lightMap: lightMapFor(),
      lightMapIntensity: 2.6,
      envMapIntensity: 0.35,
    })
  })

export const lineMaterial = () =>
  memo('line', () =>
    new THREE.MeshStandardMaterial({
      color: '#f4f6f8',
      roughness: 0.75,
      lightMap: lightMapFor(),
      lightMapIntensity: 1.6,
      envMapIntensity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  )

// Dark paving around the courts.
export const groundMaterial = () =>
  memo('ground', () => {
    const { map, normalMap } = turfTextures()
    const m = map.clone()
    m.repeat.set(10, 10)
    m.needsUpdate = true
    const n = normalMap.clone()
    n.repeat.set(10, 10)
    n.needsUpdate = true
    return new THREE.MeshStandardMaterial({
      color: '#2b2e38',
      map: m,
      normalMap: n,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.7,
      lightMap: lightMapFor(),
      lightMapIntensity: 1.6,
      envMapIntensity: 0.8,
    })
  })
