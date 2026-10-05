import { useEffect, useMemo, useRef, useState } from 'react'
import { lockScroll } from '../lib/scroll'

// Demo booking flow: pick a day, a 90-minute slot and a court. Nothing is
// sent anywhere; it shows club owners how booking would feel on their site.
const SLOTS = ['17:30', '19:00', '20:30', '22:00', '23:30']
const COURTS = ['Court 1', 'Court 2 · Centre', 'Court 3']
// Pretend some slots are taken so the grid looks alive.
const TAKEN = new Set(['0-19:00', '0-20:30', '1-20:30', '2-22:00', '3-19:00', '5-20:30', '5-22:00'])

export default function BookingDrawer({ open, context, onClose }) {
  const days = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' })
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return i === 0 ? 'Tonight' : fmt.format(d)
    })
  }, [])
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState(null)
  const [court, setCourt] = useState(1)
  const [done, setDone] = useState(false)
  const panel = useRef()

  useEffect(() => {
    lockScroll(open)
    if (!open) return
    setDone(false)
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    panel.current?.querySelector('button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Book a court" ref={panel}>
        <button className="drawer-close" onClick={onClose} data-cursor aria-label="Close">
          ×
        </button>
        {done ? (
          <div className="drawer-done">
            <i className="dot dot--lg" />
            <h3>You’re on.</h3>
            <p>
              {COURTS[court]} · {days[day]} · {SLOTS[slot]}
              <br />
              We’ll hold it for 10 minutes while you confirm by email.
            </p>
            <button className="btn btn--primary" onClick={onClose} data-cursor>
              Back to the club
            </button>
          </div>
        ) : (
          <>
            <p className="eyebrow">{context || 'Book a court'}</p>
            <h3 className="drawer-title">Pick your slot</h3>
            <div className="chips" role="group" aria-label="Day">
              {days.map((d, i) => (
                <button key={d} className={`chip ${i === day ? 'is-on' : ''}`} onClick={() => (setDay(i), setSlot(null))} data-cursor>
                  {d}
                </button>
              ))}
            </div>
            <div className="slots" role="group" aria-label="Time">
              {SLOTS.map((s, i) => {
                const taken = TAKEN.has(`${day}-${s}`)
                return (
                  <button
                    key={s}
                    disabled={taken}
                    className={`slot ${slot === i ? 'is-on' : ''}`}
                    onClick={() => setSlot(i)}
                    data-cursor
                  >
                    <b>{s}</b>
                    <span>{taken ? 'Taken' : '90 min · €28'}</span>
                  </button>
                )
              })}
            </div>
            <div className="chips" role="group" aria-label="Court">
              {COURTS.map((c, i) => (
                <button key={c} className={`chip ${i === court ? 'is-on' : ''}`} onClick={() => setCourt(i)} data-cursor>
                  {c}
                </button>
              ))}
            </div>
            <button className="btn btn--primary btn--block" disabled={slot === null} onClick={() => setDone(true)} data-cursor>
              <i className="dot" /> {slot === null ? 'Choose a time' : `Book ${SLOTS[slot]} · €28`}
            </button>
            <p className="small muted">Demo booking flow by Rooster Media. No payment is taken.</p>
          </>
        )}
      </aside>
    </div>
  )
}
