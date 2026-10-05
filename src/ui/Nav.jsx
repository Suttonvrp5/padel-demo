import { scrollToId } from '../lib/scroll'

export default function Nav({ onBook, soundSlot }) {
  const go = (id) => (e) => {
    e.preventDefault()
    scrollToId(id)
  }
  return (
    <header className="nav">
      <a href="#intro" className="brand" onClick={go('intro')} data-cursor aria-label="Vidrio Padel Club, back to top">
        <span className="brand-word">VIDRIO</span>
        <span className="brand-sub">Padel Club</span>
      </a>
      <nav className="nav-links" aria-label="Sections">
        <a href="#glass" onClick={go('glass')} data-cursor>Courts</a>
        <a href="#coaching" onClick={go('coaching')} data-cursor>Coaching</a>
        <a href="#membership" onClick={go('membership')} data-cursor>Membership</a>
      </nav>
      <div className="nav-actions">
        {soundSlot}
        <button className="btn btn--primary" onClick={() => onBook()} data-cursor>
          <i className="dot" /> Book a court
        </button>
      </div>
    </header>
  )
}
