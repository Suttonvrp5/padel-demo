// Decide how much visual richness this device can handle *before* we draw
// anything, then let the live frame-rate monitor fine-tune it.
//   high   desktop / laptop GPUs: everything on
//   medium modern phones & tablets: lower resolution, no depth of field
//   low    older or low-memory devices: no shadows, minimal effects
//   none   WebGL unavailable: static poster fallback
export function detectQuality() {
  const params = new URLSearchParams(location.search)
  const forced = params.get('quality')
  if (['high', 'medium', 'low', 'none'].includes(forced)) return forced

  let gl = null
  try {
    const c = document.createElement('canvas')
    gl = c.getContext('webgl2') || c.getContext('webgl')
  } catch {
    gl = null
  }
  if (!gl) return 'none'

  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase() : ''
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4 // GB (Chrome only; others report undefined)
  const touch = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(screen.width, screen.height) < 820

  // Software renderers and known weak mobile GPUs.
  const weakGpu = /swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [345]\d\d|powervr sgx/.test(gpu)
  if (weakGpu || memory <= 2 || cores <= 2) return 'low'
  if (touch || small) return 'medium'
  return 'high'
}

export const lower = (q) => (q === 'high' ? 'medium' : 'low')
