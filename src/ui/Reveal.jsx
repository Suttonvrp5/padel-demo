// Splits a headline into words. Each word sits in a clipping mask so it
// can rise into view; the scroll animations in Sections.jsx target
// `.word > span`. Screen readers get the plain sentence via aria-label.
export default function Reveal({ text, as: Tag = 'h2', className = '' }) {
  const lines = text.split('\n')
  return (
    <Tag className={`reveal ${className}`} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, li) => (
        <span className="line" key={li} aria-hidden="true">
          {line.split(' ').map((w, wi, all) => (
            <span key={wi}>
              <span className="word">
                <span>{w}</span>
              </span>
              {wi < all.length - 1 ? ' ' : null}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  )
}
