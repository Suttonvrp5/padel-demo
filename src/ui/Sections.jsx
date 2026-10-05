import { CHAPTERS } from '../lib/story'

// Placeholder sections (Pass 2). Each one is as tall as its chapter, which
// is what gives the camera path room to play out while scrolling.
export default function Sections() {
  return (
    <main className="story">
      {CHAPTERS.map((c) => (
        <section key={c.id} id={c.id} className="chapter" style={{ '--len': c.vh }}>
          <div className="sticky">
            <h2 className="debug-label">{c.id}</h2>
          </div>
        </section>
      ))}
    </main>
  )
}
