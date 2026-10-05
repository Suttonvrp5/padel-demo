import { useEffect, useRef, useState } from 'react'
import { story } from '../lib/story'
import { POINT_WON_T } from '../three/rally'

// Small courtside scoreboard during the rally. It polls the shared story
// state each frame but only re-renders React when something changes.
export default function Scoreboard() {
  const [state, setState] = useState({ visible: false, won: false })
  const last = useRef(state)
  useEffect(() => {
    let raf
    const tick = () => {
      const visible = story.s > 2.02 && story.s < 3.0
      const won = story.rallyT >= POINT_WON_T
      if (visible !== last.current.visible || won !== last.current.won) {
        last.current = { visible, won }
        setState(last.current)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`scoreboard ${state.visible ? 'is-visible' : ''} ${state.won ? 'is-won' : ''}`} aria-live="polite">
      <div className="sb-head">
        <span>Court 2</span>
        <span className="sb-live"><i /> Live</span>
      </div>
      <div className="sb-row">
        <span className="sb-team"><i className="sb-serve" /> Vidrio</span>
        <span className="sb-games">3</span>
        <span className="sb-pts">
          <span className="flip"><span>0</span><span>15</span></span>
        </span>
      </div>
      <div className="sb-row">
        <span className="sb-team">Visitors</span>
        <span className="sb-games">2</span>
        <span className="sb-pts">0</span>
      </div>
    </div>
  )
}
