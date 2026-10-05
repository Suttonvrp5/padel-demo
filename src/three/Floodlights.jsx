import { useMemo } from 'react'
import * as THREE from 'three'
import { LIGHTS, POLES, POLE_HEIGHT } from './layout'
import { beam, merge } from './geo'
import { glowTexture } from './textures'
import { steelMaterial } from './materials'

export const LED_COLOR = new THREE.Color('#fff1dc')

// Faint visible beams, like light catching humid Mediterranean night air.
// The shader fades the cone along its length and at its edges.
const beamMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uColor: { value: LED_COLOR.clone().multiplyScalar(0.05) } },
    vertexShader: /* glsl */ `
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vT = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vT;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 2.0);
        float along = pow(vT, 1.6);
        gl_FragColor = vec4(uColor * edge * along, 1.0);
      }
    `,
  })

export default function Floodlights({ beams = true }) {
  const { poles, housings, faces, cones } = useMemo(() => {
    const poleGeo = []
    for (const [x, z] of POLES) {
      const g = new THREE.CylinderGeometry(0.07, 0.11, POLE_HEIGHT + 0.2, 8)
      g.translate(x, (POLE_HEIGHT + 0.2) / 2, z)
      poleGeo.push(g)
      poleGeo.push(beam([x - 0.55, POLE_HEIGHT + 0.12, z], [x + 0.55, POLE_HEIGHT + 0.12, z], 0.06))
    }
    const housingGeo = []
    const faceGeo = []
    const coneGeo = []
    const up = new THREE.Vector3(0, 1, 0)
    for (const L of LIGHTS) {
      const pos = new THREE.Vector3(...L.pos)
      const aim = new THREE.Vector3(...L.aim)
      const dir = aim.clone().sub(pos).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      // Flat LED panel: dark housing + bright face slightly in front.
      const h = new THREE.BoxGeometry(0.62, 0.42, 0.1)
      h.applyQuaternion(q)
      h.translate(pos.x, pos.y, pos.z)
      housingGeo.push(h)
      const f = new THREE.PlaneGeometry(0.54, 0.34)
      f.applyQuaternion(q)
      f.translate(...pos.clone().addScaledVector(dir, 0.055).toArray())
      faceGeo.push(f)
      // Beam cone from the head toward the ground.
      const len = pos.distanceTo(aim) * 0.92
      const c = new THREE.CylinderGeometry(0.3, 2.6, len, 20, 1, true)
      // uv.y = 1 at the top (head), 0 at the bottom.
      c.translate(0, -len / 2, 0)
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up.clone().negate(), dir))
      c.translate(pos.x, pos.y, pos.z)
      coneGeo.push(c)
    }
    return {
      poles: merge(poleGeo),
      housings: merge(housingGeo),
      faces: merge(faceGeo),
      cones: merge(coneGeo),
    }
  }, [])

  const faceMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: LED_COLOR.clone().multiplyScalar(12), toneMapped: false }),
    [],
  )
  const cone = useMemo(beamMaterial, [])
  const glow = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: LED_COLOR.clone().multiplyScalar(1.6),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )

  return (
    <group>
      <mesh geometry={poles} material={steelMaterial()} castShadow />
      <mesh geometry={housings} material={steelMaterial()} />
      <mesh geometry={faces} material={faceMat} />
      {beams && <mesh geometry={cones} material={cone} renderOrder={5} />}
      {LIGHTS.map((L, i) => (
        <sprite key={i} material={glow} position={L.pos} scale={2.4} renderOrder={6} />
      ))}
    </group>
  )
}
