import { story } from './story'
import { EVENTS, POINT_WON_T } from '../three/rally'

// All sounds are synthesised live with the Web Audio API: nothing to
// download, instant to load. Sound is OFF until the visitor turns it on
// (browsers also require a click before any audio may play).
//
// To use recorded sounds instead, drop files into public/audio/ named
// hit.mp3, glass.mp3, bounce.mp3, ambience.mp3, applause.mp3 — any file
// that exists replaces its synthesised version automatically.

let ctx = null
let master = null
let reverb = null
let ambience = null
let enabled = false
const samples = {}

function noiseBuffer(seconds, color = 'white') {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (color === 'pink') {
      b0 = 0.99765 * b0 + w * 0.099
      b1 = 0.963 * b1 + w * 0.2965
      b2 = 0.57 * b2 + w * 1.0527
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2
    } else d[i] = w
  }
  return buf
}

// A short decaying-noise impulse = the sound of an open-air court.
function makeReverb() {
  const c = ctx.createConvolver()
  const len = Math.floor(ctx.sampleRate * 1.6)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  c.buffer = buf
  const wet = ctx.createGain()
  wet.gain.value = 0.32
  c.connect(wet).connect(master)
  return c
}

function out(node, dry = 1, wet = 0.6) {
  const g = ctx.createGain()
  g.gain.value = dry
  node.connect(g).connect(master)
  const w = ctx.createGain()
  w.gain.value = wet
  node.connect(w).connect(reverb)
}

function env(gainNode, t, attack, decay, peak) {
  gainNode.gain.setValueAtTime(0.0001, t)
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function noiseHit({ freq, q = 1, decay = 0.08, peak = 0.6, type = 'bandpass', when = 0, vol = 1 }) {
  const t = ctx.currentTime + when
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(decay + 0.05)
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  env(g, t, 0.002, decay, peak * vol)
  src.connect(f).connect(g)
  out(g)
  src.start(t)
}

function tone({ freq, decay = 0.2, peak = 0.4, type = 'sine', glideTo, when = 0, vol = 1 }) {
  const t = ctx.currentTime + when
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay)
  const g = ctx.createGain()
  env(g, t, 0.003, decay, peak * vol)
  o.connect(g)
  out(g)
  o.start(t)
  o.stop(t + decay + 0.05)
}

function playSample(name, vol = 1) {
  const buf = samples[name]
  if (!buf) return false
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.value = vol
  src.connect(g)
  out(g, 1, 0.3)
  src.start()
  return true
}

const SFX = {
  // Racket strike: a hollow "pock" (padel rackets are foam-cored).
  hit(vol = 1) {
    if (playSample('hit', vol)) return
    noiseHit({ freq: 1900, q: 2.2, decay: 0.05, peak: 0.9, vol })
    tone({ freq: 420, glideTo: 180, decay: 0.07, peak: 0.55, vol })
  },
  bounce(vol = 1) {
    if (playSample('bounce', vol)) return
    noiseHit({ freq: 700, q: 0.8, decay: 0.05, peak: 0.45, type: 'lowpass', vol })
    tone({ freq: 160, glideTo: 90, decay: 0.06, peak: 0.35, vol })
  },
  // The glass impact, slowed down: deep thud + the pane ringing.
  glass(vol = 1) {
    if (playSample('glass', vol)) return
    tone({ freq: 95, glideTo: 48, decay: 0.9, peak: 0.9, vol })
    noiseHit({ freq: 380, q: 0.7, decay: 0.35, peak: 0.55, vol })
    for (const [f, d] of [[880, 1.4], [1430, 1.1], [2310, 0.8], [3720, 0.6]]) {
      tone({ freq: f, decay: d, peak: 0.07, type: 'triangle', vol })
    }
  },
  applause(vol = 1) {
    if (playSample('applause', vol)) return
    for (let i = 0; i < 70; i++) {
      const when = Math.random() * 2.4 * Math.random()
      noiseHit({ freq: 1600 + Math.random() * 2200, q: 1.4, decay: 0.03, peak: 0.12, when, vol: vol * (1 - when / 2.6) })
    }
  },
}

// Night ambience: distant crowd murmur + Mediterranean cicadas.
function startAmbience() {
  const bus = ctx.createGain()
  bus.gain.value = 0
  bus.connect(master)
  bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5)

  if (samples.ambience) {
    const src = ctx.createBufferSource()
    src.buffer = samples.ambience
    src.loop = true
    src.connect(bus)
    src.start()
    return { bus, stop: () => src.stop() }
  }

  // Murmur: pink noise, band-limited to voice range, slowly swelling.
  const crowd = ctx.createBufferSource()
  crowd.buffer = noiseBuffer(6, 'pink')
  crowd.loop = true
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 420
  bp.Q.value = 0.6
  const cg = ctx.createGain()
  cg.gain.value = 0.05
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.07
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.02
  lfo.connect(lfoGain).connect(cg.gain)
  crowd.connect(bp).connect(cg).connect(bus)
  crowd.start()
  lfo.start()

  // Cicadas: a buzzing high tone, pulsed fast and swelling in phrases.
  const cic = ctx.createOscillator()
  cic.type = 'sawtooth'
  cic.frequency.value = 4700
  const hp = ctx.createBiquadFilter()
  hp.type = 'bandpass'
  hp.frequency.value = 4900
  hp.Q.value = 8
  const pulse = ctx.createGain()
  pulse.gain.value = 0
  const am = ctx.createOscillator()
  am.type = 'square'
  am.frequency.value = 42
  const amGain = ctx.createGain()
  amGain.gain.value = 0.5
  am.connect(amGain).connect(pulse.gain)
  const phrase = ctx.createGain()
  phrase.gain.value = 0.0
  const slow = ctx.createOscillator()
  slow.frequency.value = 0.18
  const slowGain = ctx.createGain()
  slowGain.gain.value = 0.012
  slow.connect(slowGain).connect(phrase.gain)
  const pan = ctx.createStereoPanner()
  pan.pan.value = -0.4
  cic.connect(hp).connect(pulse).connect(phrase).connect(pan).connect(bus)
  cic.start()
  am.start()
  slow.start()

  // Every few seconds, a distant rally on another court.
  const distant = setInterval(() => {
    if (!enabled) return
    const vol = 0.12
    const n = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < n; i++) setTimeout(() => enabled && SFX.hit(vol), i * (700 + Math.random() * 300))
  }, 6500)

  return {
    bus,
    stop: () => {
      clearInterval(distant)
      for (const n of [crowd, lfo, cic, am, slow]) n.stop()
    },
  }
}

async function loadSamples() {
  await Promise.all(
    ['hit', 'glass', 'bounce', 'ambience', 'applause'].map(async (name) => {
      try {
        const r = await fetch(`/audio/${name}.mp3`)
        if (!r.ok || (r.headers.get('content-type') || '').includes('text/html')) return
        samples[name] = await ctx.decodeAudioData(await r.arrayBuffer())
      } catch {
        /* no sample: synthesised version is used */
      }
    }),
  )
}

// Fire rally sounds as the scroll moves the rally clock forward.
let lastT = null
function watchRally() {
  const t = story.rallyT
  if (lastT !== null && enabled && t > lastT && t - lastT < 0.6) {
    for (const e of EVENTS) {
      if (e.t > lastT && e.t <= t) {
        if (e.type === 'hitA' || e.type === 'hitB') SFX.hit()
        else if (e.type === 'bounce') SFX.bounce()
        else if (e.type === 'glass') SFX.glass(e === EVENTS[2] ? 1 : 0.5)
      }
    }
    if (POINT_WON_T > lastT && POINT_WON_T <= t) SFX.applause()
  }
  lastT = t
  requestAnimationFrame(watchRally)
}

export async function setSound(on) {
  enabled = on
  if (on && !ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.8
    master.connect(ctx.destination)
    reverb = makeReverb()
    await loadSamples()
    requestAnimationFrame(watchRally)
  }
  if (!ctx) return
  if (on) {
    await ctx.resume()
    if (!ambience) ambience = startAmbience()
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.4)
  } else {
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    setTimeout(() => !enabled && ctx.suspend(), 500)
  }
}

export const playClick = () => enabled && SFX.bounce(0.4)
