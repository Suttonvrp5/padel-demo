import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { story, chapterProgress } from '../lib/story'
import { ballAt, rallyTime, squashAt, IMPACT, BALL_R, RALLY_END_T } from './rally'
import { feltTexture, glowTexture } from './textures'
import { COURT_XS, HERO } from './layout'

const BALL_YELLOW = new THREE.Color('#d7ff3a')
const TRAIL = 10

// Ripple on the glass: bright expanding rings with chromatic fringes, like
// a shock wave travelling through the pane. Rendered additively, so it only
// ever adds light (no costly refraction pass needed).
const rippleMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uAge: { value: -1 }, uStrength: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAge;
      uniform float uStrength;
      varying vec2 vUv;
      float ring(float d, float r, float w) { return exp(-pow((d - r) / w, 2.0)); }
      void main() {
        if (uAge < 0.0) discard;
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p);
        float a = clamp(uAge, 0.0, 1.0);
        float fade = (1.0 - a) * (1.0 - a);
        vec3 col = vec3(0.0);
        // Three rings at different speeds, each slightly split into R/G/B
        // so the edges shimmer like light bending in glass.
        for (int i = 0; i < 3; i++) {
          float fi = float(i);
          float r = a * (0.95 - fi * 0.22);
          float w = 0.008 + a * 0.025;
          col.r += ring(d, r * 1.012, w) * (1.0 - fi * 0.25);
          col.g += ring(d, r, w) * (1.0 - fi * 0.25);
          col.b += ring(d, r * 0.988, w) * (1.0 - fi * 0.25);
        }
        // Hot spot at the moment of contact.
        float core = exp(-d * d / (0.0008 + a * 0.008)) * (1.0 - smoothstep(0.0, 0.25, a));
        col += vec3(1.0, 0.98, 0.85) * core * 0.8;
        col *= vec3(0.95, 1.0, 1.0) * fade * uStrength;
        col *= smoothstep(1.0, 0.85, d);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

export default function Rally() {
  const ball = useRef()
  const halo = useRef()
  const shadow = useRef()
  const trail = useRef()
  const ripple = useRef()
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), m: new THREE.Matrix4(), spin: 0 }), [])
  const offsetX = COURT_XS[HERO]

  const ballMat = useMemo(() => {
    const felt = feltTexture()
    return new THREE.MeshStandardMaterial({
      color: BALL_YELLOW,
      roughness: 0.85,
      bumpMap: felt,
      bumpScale: 0.6,
      roughnessMap: felt,
      // A touch of self-glow so the ball is the one bright accent on screen.
      emissive: BALL_YELLOW,
      emissiveIntensity: 0.75,
    })
  }, [])
  const trailMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: BALL_YELLOW.clone().multiplyScalar(1.4),
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )
  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: BALL_YELLOW.clone().multiplyScalar(0.7),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  )
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: glowTexture(),
        color: '#000',
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }),
    [],
  )
  const rippleMat = useMemo(rippleMaterial, [])

  useFrame(() => {
    // Rally chapter is index 2. Before it, hold the ball in A's hand;
    // after it, leave it resting where the point ended.
    const p = chapterProgress(story.s, 2)
    const t = story.s < 2 ? -0.9 : story.s >= 3 ? RALLY_END_T : rallyTime(p)
    story.rallyT = t
    const visible = story.s > 1.6 && story.s < 3.4

    ballAt(t, tmp.p)
    tmp.p.x += offsetX
    const b = ball.current
    b.visible = visible
    b.position.copy(tmp.p)
    // Squash on impact, spin in flight.
    const sq = squashAt(t)
    const k = sq.k * 0.35
    b.scale.set(1 + k * 0.5, 1 + k * 0.5, 1 + k * 0.5)
    if (sq.axis === 'y') b.scale.y = 1 - k
    else b.scale.z = 1 - k
    const prev = story._prevRallyT ?? t
    b.rotation.x += (t - prev) * 40
    story._prevRallyT = t

    halo.current.visible = visible
    halo.current.position.copy(tmp.p)

    // Soft contact shadow on the turf, sharper and darker as the ball nears it.
    const h = tmp.p.y
    shadow.current.visible = visible
    shadow.current.position.set(tmp.p.x, 0.004, tmp.p.z)
    const ss = 0.09 + h * 0.12
    shadow.current.scale.set(ss, ss, ss)
    shadowMat.opacity = 0.65 / (1 + h * 2.2)

    // Motion trail: ghost balls a few milliseconds behind.
    const tr = trail.current
    tr.visible = visible && t > 0 && t < 3.4
    for (let i = 0; i < TRAIL; i++) {
      ballAt(t - (i + 1) * 0.007, tmp.q)
      tmp.q.x += offsetX
      const s = 0.8 * (1 - i / TRAIL) ** 1.5
      tmp.m.makeScale(s, s, s).setPosition(tmp.q)
      tr.setMatrixAt(i, tmp.m)
    }
    tr.instanceMatrix.needsUpdate = true

    // Glass ripple ages with rally time; in slow motion it spreads slowly.
    const age = (t - IMPACT.t) / 0.07
    rippleMat.uniforms.uAge.value = age >= 0 && age <= 1 ? age : -1
    rippleMat.uniforms.uStrength.value = 0.9

    // Camera shake right at contact (read by CameraRig).
    story.shake = age >= 0 && age < 0.35 ? (1 - age / 0.35) * 0.012 : 0
  })

  return (
    <group>
      <mesh ref={ball} material={ballMat} castShadow>
        <sphereGeometry args={[BALL_R, 32, 24]} />
      </mesh>
      <sprite ref={halo} material={haloMat} scale={0.16} renderOrder={8} />
      <instancedMesh ref={trail} args={[null, null, TRAIL]} material={trailMat} renderOrder={7} frustumCulled={false}>
        <sphereGeometry args={[BALL_R * 0.9, 12, 8]} />
      </instancedMesh>
      <mesh ref={shadow} material={shadowMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Ripple sits on the outside face of the back glass, facing the camera. */}
      <mesh
        ref={ripple}
        material={rippleMat}
        position={[IMPACT.p[0] + offsetX, IMPACT.p[1], 10.014]}
        renderOrder={9}
      >
        <planeGeometry args={[1.8, 1.8]} />
      </mesh>
    </group>
  )
}
