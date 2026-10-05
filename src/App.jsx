import { useCallback, useEffect, useState } from 'react'
import Experience from './three/Experience'
import Sections from './ui/Sections'
import Nav from './ui/Nav'
import Scoreboard from './ui/Scoreboard'
import Cursor from './ui/Cursor'
import BookingDrawer from './ui/BookingDrawer'
import { initScroll, jumpToStory } from './lib/scroll'
import { story } from './lib/story'

export default function App() {
  const [booking, setBooking] = useState({ open: false, context: '' })
  const openBooking = useCallback((context = '') => setBooking({ open: true, context }), [])
  const closeBooking = useCallback(() => setBooking((b) => ({ ...b, open: false })), [])

  useEffect(() => {
    story.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    initScroll({ reducedMotion: story.reducedMotion })
    const onMove = (e) => {
      story.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      story.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove)
    // Debug: ?s=2.5 jumps to that point of the story.
    const s = parseFloat(new URLSearchParams(location.search).get('s'))
    if (!Number.isNaN(s)) requestAnimationFrame(() => jumpToStory(s))
    window.__jump = (v) => jumpToStory(parseFloat(v))
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <>
      <Experience />
      <div className="grade" aria-hidden="true" />
      <Nav onBook={openBooking} />
      <Sections onBook={openBooking} />
      <Scoreboard />
      <BookingDrawer open={booking.open} context={booking.context} onClose={closeBooking} />
      <Cursor />
    </>
  )
}
