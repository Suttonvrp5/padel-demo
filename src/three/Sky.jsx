import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// A painted sky dome: deep night blue overhead melting into a warm peach
// glow on the horizon (the last light of blue hour), with faint stars.
// Done in a shader so it's one draw call and perfectly smooth (no banding
// from a low-res photo).
export const SUN_DIR = new THREE.Vector3(-0.35, 0, -1).normalize()

export default function Sky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uSun: { value: SUN_DIR },
          uZenith: { value: new THREE.Color('#03081c') },
          uHigh: { value: new THREE.Color('#0a1a4a') },
          uMid: { value: new THREE.Color('#1c3170') },
          uPale: { value: new THREE.Color('#5d76a8') },
          uHorizon: { value: new THREE.Color('#f0a585') },
          uGlow: { value: new THREE.Color('#ffb98a') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * p;
            gl_Position.z = gl_Position.w; // always at the far plane
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSun, uZenith, uHigh, uMid, uPale, uHorizon, uGlow;
          varying vec3 vDir;
          float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            // Base vertical gradient.
            vec3 col = mix(uMid, uHigh, smoothstep(0.02, 0.28, h));
            col = mix(col, uZenith, smoothstep(0.25, 0.9, h));
            // Warm band hugging the horizon, strongest toward the sunset.
            float az = max(dot(normalize(vec3(d.x, 0.0, d.z)), uSun), 0.0);
            float hp = max(h, 0.0);
            // Real dusk goes blue -> pale steel blue -> peach (a straight
            // blue-to-peach blend would pass through purple).
            float pale = exp(-hp * mix(14.0, 8.0, az)) * (0.35 + 0.4 * az);
            col = mix(col, uPale, clamp(pale, 0.0, 1.0));
            float band = exp(-hp * mix(42.0, 20.0, az)) * (0.15 + 0.85 * pow(az, 2.0));
            col = mix(col, uHorizon, clamp(band, 0.0, 1.0));
            col += uGlow * pow(az, 12.0) * exp(-max(h, 0.0) * 22.0) * 0.6;
            // Below the horizon: dark land haze.
            col = mix(col, uMid * 0.35 + uHorizon * 0.08, smoothstep(0.0, -0.06, h));
            // Stars, fading out toward the bright horizon.
            vec3 sp = floor(d * 420.0);
            float s = hash(sp);
            float star = step(0.9965, s) * smoothstep(0.12, 0.5, h);
            star *= 0.55 + 0.45 * sin(uTime * (1.0 + s * 3.0) + s * 40.0);
            col += vec3(0.85, 0.9, 1.0) * star * 0.9;
            // Gentle dither to kill gradient banding.
            col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  )
  useFrame((_, dt) => (material.uniforms.uTime.value += dt))
  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 24]} />
    </mesh>
  )
}
