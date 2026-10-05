import { useEffect, useRef } from 'react'

// Custom cursor for mouse users: a small dot that sticks to the pointer and
// a ring that trails it softly and grows over anything clickable.
// Hidden entirely on touch screens (see .cursor in styles.css).
export default function Cursor() {
  const dot = useRef()
  const ring = useRef()
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    const p = { x: innerWidth / 2, y: innerHeight / 2 }
    const r = { x: p.x, y: p.y }
    let raf
    const move = (e) => {
      p.x = e.clientX
      p.y = e.clientY
      const hot = e.target.closest?.('[data-cursor], button, a')
      ring.current.classList.toggle('is-hot', !!hot)
    }
    const down = () => ring.current.classList.add('is-down')
    const up = () => ring.current.classList.remove('is-down')
    const loop = () => {
      r.x += (p.x - r.x) * 0.18
      r.y += (p.y - r.y) * 0.18
      dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      ring.current.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    loop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])
  return (
    <div className="cursor" aria-hidden="true">
      <div className="cursor-ring" ref={ring} />
      <div className="cursor-dot" ref={dot} />
    </div>
  )
}
