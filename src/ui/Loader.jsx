import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { lockScroll } from '../lib/scroll'
import { story } from '../lib/story'

// Loading screen with real progress: the number tracks actual downloads
// (HDRI, models) reported by three.js, plus web fonts. The counter eases
// toward the real value so it never jumps, and never claims 100% early.
export default function Loader({ onDone, waitForFrames = true }) {
  // Progress comes from three.js's loading manager (hooked up inside the
  // lazily loaded 3D chunk), so this screen doesn't need the 3D engine.
  const [{ progress, active }, setLoad] = useState({ progress: 0, active: true })
  useEffect(() => {
    const id = setInterval(() => setLoad({ progress: story.loadProgress, active: story.loadActive }), 100)
    return () => clearInterval(id)
  }, [])
  const [fontsReady, setFontsReady] = useState(false)
  const [shown, setShown] = useState(0)
  const [gone, setGone] = useState(false)
  const root = useRef()
  const target = useRef(0)
  const finished = useRef(false)

  useEffect(() => {
    lockScroll(true)
    document.fonts?.ready.then(() => setFontsReady(true)) ?? setFontsReady(true)
  }, [])

  // Fonts count for 10%, 3D assets for 90%.
  target.current = (fontsReady ? 10 : 0) + (waitForFrames ? progress : 100) * 0.9

  useEffect(() => {
    let raf
    let val = 0
    const tick = () => {
      val += (target.current - val) * 0.08
      if (target.current - val < 0.3) val = target.current
      setShown(Math.floor(val))
      const done = val >= 99.9 && fontsReady && (!waitForFrames || (!active && story.frames > 2))
      if (done && !finished.current) {
        finished.current = true
        exit()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const exit = () => {
      const tl = gsap.timeline({
        onComplete: () => {
          setGone(true)
          lockScroll(false)
        },
      })
      tl.to(root.current.querySelector('.loader-inner'), { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      tl.to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
      tl.add(() => {
        story.ready = true
        onDone?.()
      }, '-=0.6')
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, fontsReady, onDone, waitForFrames])

  if (gone) return null
  return (
    <div className="loader" ref={root} role="status" aria-live="polite">
      <div className="loader-inner">
        <span className="loader-brand">VIDRIO</span>
        <div className="loader-track">
          <i className="loader-ball" style={{ left: `${shown}%` }} />
          <i className="loader-fill" style={{ transform: `scaleX(${shown / 100})` }} />
        </div>
        <div className="loader-meta">
          <span>Lighting the courts</span>
          <span className="loader-num">{String(shown).padStart(3, '0')}</span>
        </div>
      </div>
    </div>
  )
}
