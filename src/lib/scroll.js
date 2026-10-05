import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CHAPTERS, story } from './story'

gsap.registerPlugin(ScrollTrigger)

let lenis = null
let bounds = [] // scrollY at which each chapter starts, plus the max scroll

function measure() {
  bounds = CHAPTERS.map(({ id }) => {
    const el = document.getElementById(id)
    return el ? el.offsetTop : 0
  })
  bounds.push(Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
}

// Convert the page scroll position into the story float (see story.js).
function update(y) {
  const n = CHAPTERS.length
  if (y >= bounds[n]) return (story.s = n)
  for (let i = 0; i < n; i++) {
    const a = bounds[i]
    const b = bounds[i + 1]
    if (y < b) {
      story.s = i + Math.min(1, Math.max(0, (y - a) / Math.max(1, b - a)))
      return
    }
  }
}

export function initScroll({ reducedMotion }) {
  // Phones resize the viewport when the address bar hides. We lock the
  // "viewport height" unit to the first measured height so sections don't jump.
  const setVh = () =>
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
  setVh()
  let lastW = window.innerWidth
  window.addEventListener('resize', () => {
    if (window.innerWidth !== lastW) {
      lastW = window.innerWidth
      setVh()
    }
    measure()
    ScrollTrigger.refresh()
  })

  if (!reducedMotion) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 })
    lenis.on('scroll', (e) => {
      story.velocity = e.velocity
      ScrollTrigger.update()
    })
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  measure()
  gsap.ticker.add(() => update(window.scrollY))
  ScrollTrigger.addEventListener('refresh', measure)
  return lenis
}

export const getLenis = () => lenis

// Jump straight to a story position (used by the ?s= debug URL param).
export function jumpToStory(target) {
  measure()
  const i = Math.min(CHAPTERS.length - 1, Math.floor(target))
  const y = bounds[i] + (target - i) * (bounds[i + 1] - bounds[i])
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo(0, y)
  update(y)
  story.snap = true // camera jumps instead of easing there
}

export function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 2.4 })
  else el.scrollIntoView()
}

export function lockScroll(locked) {
  if (lenis) locked ? lenis.stop() : lenis.start()
  document.documentElement.classList.toggle('is-locked', locked)
}
