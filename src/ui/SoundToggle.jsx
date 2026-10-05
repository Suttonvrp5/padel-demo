import { useState } from 'react'
import { setSound } from '../lib/sound'

// Sound is off by default. Four little bars dance when it's on.
export default function SoundToggle() {
  const [on, setOn] = useState(false)
  const toggle = () => {
    setOn(!on)
    setSound(!on)
  }
  return (
    <button
      className={`sound ${on ? 'is-on' : ''}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      data-cursor
    >
      <span className="bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="sound-label">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  )
}
