import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CHAPTERS, story } from '../lib/story'
import { CAPTIONS } from '../three/rally'
import Reveal from './Reveal'

gsap.registerPlugin(ScrollTrigger)

const len = (id) => CHAPTERS.find((c) => c.id === id).vh

const TIERS = [
  { name: 'Social', price: 39, perks: ['4 off-peak hours a month', 'Members’ bar & terrace', 'Open play nights'] },
  { name: 'Club', price: 79, perks: ['Unlimited off-peak play', 'Book 14 days ahead', '2 guest passes a month'], featured: true },
  { name: 'Pro', price: 129, perks: ['Unlimited play, any hour', 'Weekly squad coaching', 'Video match analysis'] },
]

const PROGRAMS = [
  ['First Serve', 'Beginners · 4 weeks', 'Mon & Wed 19:00'],
  ['The Walls', 'Glass play clinic', 'Tue 20:30'],
  ['Match Lab', 'Tactics & doubles', 'Thu 21:00'],
  ['Academy', 'Juniors 8–16', 'Sat 10:00'],
]

export default function Sections({ onBook }) {
  const root = useRef()

  useLayoutEffect(() => {
    const reduced = story.reducedMotion
    const ctx = gsap.context(() => {
      // Each chapter's sticky panel gets one scrubbed timeline that spans
      // the chapter's whole scroll distance: words rise in, hold, then
      // drift out before the next chapter takes over.
      const panel = (id, build) => {
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: `#${id}`, start: 'top top', end: 'bottom bottom', scrub: reduced ? true : 0.6 },
        })
        build(tl, `#${id}`)
        tl.set({}, {}, 1) // normalise: timeline position 1 = end of the chapter
        return tl
      }
      const wordsIn = (tl, sel, at, dur = 0.22) =>
        tl.fromTo(
          `${sel} .word > span`,
          reduced ? { opacity: 0 } : { yPercent: 115, rotate: 6, opacity: 0 },
          { yPercent: 0, rotate: 0, opacity: 1, stagger: { amount: dur * 0.6 }, duration: dur * 0.5 },
          at,
        )
      const fadeIn = (tl, sel, at, dur = 0.12) =>
        tl.fromTo(sel, { opacity: 0, y: reduced ? 0 : 30 }, { opacity: 1, y: 0, duration: dur, stagger: 0.02 }, at)
      const out = (tl, sel, at, dur = 0.12) => tl.to(sel, { opacity: 0, y: reduced ? 0 : -40, duration: dur }, at)

      // 1 · Intro — the giant wordmark is visible on load and lifts away.
      panel('intro', (tl, s) => {
        tl.to(`${s} .hero-word .char`, { yPercent: reduced ? 0 : -60, opacity: 0, stagger: 0.02, duration: 0.3 }, 0.45)
        tl.to(`${s} .hero-meta`, { opacity: 0, duration: 0.2 }, 0.4)
      })

      // 2 · Glass
      panel('glass', (tl, s) => {
        wordsIn(tl, `${s} .headline`, 0.05)
        fadeIn(tl, `${s} .eyebrow`, 0.0, 0.08)
        fadeIn(tl, `${s} .body, ${s} .stats li`, 0.28)
        out(tl, `${s} .content`, 0.86)
      })

      // 3 · Rally — captions appear at the same moments the ball does
      // (both use CAPTIONS from rally.js).
      panel('rally', (tl, s) => {
        CAPTIONS.forEach((c, i) => {
          const sel = `${s} .caption-${i}`
          wordsIn(tl, sel, c.from, 0.07)
          tl.to(sel, { opacity: 0, y: reduced ? 0 : -24, duration: 0.03 }, c.to - 0.03)
        })
      })

      // 4 · Coaching
      panel('coaching', (tl, s) => {
        wordsIn(tl, `${s} .headline`, 0.05)
        fadeIn(tl, `${s} .eyebrow`, 0.0, 0.08)
        fadeIn(tl, `${s} .body, ${s} .program`, 0.25)
        out(tl, `${s} .content`, 0.88)
      })

      // 5 · Membership
      panel('membership', (tl, s) => {
        wordsIn(tl, `${s} .headline`, 0.03)
        fadeIn(tl, `${s} .eyebrow`, 0.0, 0.08)
        fadeIn(tl, `${s} .tier`, 0.2, 0.18)
        out(tl, `${s} .content`, 0.9)
      })

      // 6 · Final
      panel('final', (tl, s) => {
        wordsIn(tl, `${s} .headline`, 0.15, 0.3)
        fadeIn(tl, `${s} .cta-row, ${s} footer`, 0.45, 0.2)
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <main className="story" ref={root}>
      {/* 1 · INTRO */}
      <section id="intro" className="chapter" style={{ '--len': len('intro') }}>
        <div className="sticky">
          <div className="hero-meta">
            <p className="eyebrow">Padel Club · Costa Brava</p>
            <p className="lede">Three panoramic glass courts under the Mediterranean night. Open until 1 a.m.</p>
          </div>
          <h1 className="hero-word" aria-label="Vidrio">
            {'VIDRIO'.split('').map((c, i) => (
              <span className="char-mask" key={i} aria-hidden="true">
                <span className="char">{c}</span>
              </span>
            ))}
          </h1>
          <div className="scroll-cue hero-meta" aria-hidden="true">
            <span>Scroll</span>
            <i />
          </div>
        </div>
      </section>

      {/* 2 · GLASS */}
      <section id="glass" className="chapter" style={{ '--len': len('glass') }}>
        <div className="sticky">
          <div className="content content--left">
            <p className="eyebrow">01 — The courts</p>
            <Reveal className="headline" text={'Glass on\nevery side'} />
            <p className="body">
              Twelve-millimetre tempered panoramic glass, built to competition spec.
              The ball comes off every wall true, so the walls become part of your game.
            </p>
            <ul className="stats">
              <li><b>3</b><span>Panoramic courts</span></li>
              <li><b>20×10</b><span>Metres, to FIP spec</span></li>
              <li><b>750</b><span>Lux LED floodlights</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3 · RALLY */}
      <section id="rally" className="chapter" style={{ '--len': len('rally') }}>
        <div className="sticky">
          {CAPTIONS.map((c, i) => (
            <Reveal key={i} as="p" className={`caption caption-${i}`} text={c.text} />
          ))}
        </div>
      </section>

      {/* 4 · COACHING */}
      <section id="coaching" className="chapter" style={{ '--len': len('coaching') }}>
        <div className="sticky">
          <div className="content content--right">
            <p className="eyebrow">02 — Coaching</p>
            <Reveal className="headline" text={'Learn to\nplay the walls'} />
            <p className="body">
              Our coaches come from the Spanish circuit. Small groups, floodlit sessions,
              and a game plan built around the glass.
            </p>
            <ul className="programs">
              {PROGRAMS.map(([name, what, when]) => (
                <li className="program" key={name}>
                  <b>{name}</b>
                  <span>{what}</span>
                  <em>{when}</em>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 5 · MEMBERSHIP */}
      <section id="membership" className="chapter" style={{ '--len': len('membership') }}>
        <div className="sticky">
          <div className="content content--wide">
            <p className="eyebrow">03 — Membership</p>
            <Reveal className="headline" text="Make it your club" />
            <div className="tiers">
              {TIERS.map((t) => (
                <article className={`tier ${t.featured ? 'is-featured' : ''}`} key={t.name}>
                  <header>
                    <h3>{t.name}</h3>
                    {t.featured && <span className="tag">Most loved</span>}
                  </header>
                  <p className="price">
                    <b>€{t.price}</b>
                    <span>/ month</span>
                  </p>
                  <ul>
                    {t.perks.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <button className="btn btn--ghost" data-cursor onClick={() => onBook(`Membership · ${t.name}`)}>
                    Join {t.name}
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 · FINAL */}
      <section id="final" className="chapter" style={{ '--len': len('final') }}>
        <div className="sticky">
          <div className="content content--center">
            <Reveal as="h2" className="headline headline--xl" text={'Your court\nis waiting'} />
            <div className="cta-row">
              <button className="btn btn--primary btn--lg" data-cursor onClick={() => onBook()}>
                <i className="dot" /> Book a court
              </button>
              <p className="small">Tonight from 19:00 · Courts from €28 / 90 min</p>
            </div>
          </div>
          <footer className="footer">
            <span>Vidrio Padel Club · Carrer del Vidre 12, Costa Brava</span>
            <span>Daily 08:00 – 01:00</span>
            <span className="credit">
              Site by <a href="https://roostermedia.example" data-cursor>Rooster Media</a>
            </span>
          </footer>
        </div>
      </section>
    </main>
  )
}
