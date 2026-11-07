import { useEffect, useState } from 'react'
import { getStatus } from './api.js'
import ArtistBackground from './ArtistBackground.jsx'
import MusicFacts from './MusicFacts.jsx'
import Spotlight from './Spotlight.jsx'
import PredictSection from './PredictSection.jsx'
import ThresholdSection from './ThresholdSection.jsx'
import ImportanceSection from './ImportanceSection.jsx'

// The three views you can switch between at the top
const VIEWS = [
  { id: 'predict', label: 'Predict' },
  { id: 'thresholds', label: 'Thresholds' },
  { id: 'features', label: 'Features' },
]

export default function App() {
  const [view, setView] = useState('predict')
  const [backendOk, setBackendOk] = useState(null)     // null = still checking
  const [glowCover, setGlowCover] = useState(null)     // the cover of the song you picked, for the glow behind the page
  const [pickedSong, setPickedSong] = useState(null)   // a song picked in the Spotlight search (⌘K)

  useEffect(() => {
    function moveMouse(event) {
      // A soft light follows the mouse over the glass boxes: tell every box where the mouse is,
      // and the CSS draws the light at that spot
      for (const glass of document.querySelectorAll('.card, .answer, .number')) {
        const box = glass.getBoundingClientRect()
        glass.style.setProperty('--mouse-x', `${event.clientX - box.left}px`)
        glass.style.setProperty('--mouse-y', `${event.clientY - box.top}px`)
      }

      // Apple TV tilt: the glass under the mouse (and the glass around it) turns a little towards the mouse.
      // data-tilt says how many degrees at most, so the big cards only move a little.
      let glass = event.target.closest?.('.tilt')
      while (glass) {
        const box = glass.getBoundingClientRect()
        const x = (event.clientX - box.left) / box.width - 0.5    // from -0.5 (left edge) to 0.5 (right edge)
        const y = (event.clientY - box.top) / box.height - 0.5    // from -0.5 (top) to 0.5 (bottom)
        const degrees = Number(glass.dataset.tilt)
        glass.style.setProperty('--turn-x', `${-y * degrees}deg`)
        glass.style.setProperty('--turn-y', `${x * degrees}deg`)
        glass = glass.parentElement.closest('.tilt')
      }
    }
    window.addEventListener('mousemove', moveMouse)
    return () => window.removeEventListener('mousemove', moveMouse)
  }, [])

  // Check that the backend is running. While it is offline, check again every 3 seconds.
  useEffect(() => {
    function check() {
      getStatus().then(() => setBackendOk(true)).catch(() => setBackendOk(false))
    }
    check()
    if (backendOk) return                  // it works, so no need to keep checking
    const timer = setInterval(check, 3000)
    return () => clearInterval(timer)
  }, [backendOk])

  // A song picked in the Spotlight search: show the Predict view with the answer for it.
  // { ...song } makes a new object, so picking the same song twice still counts as a new pick.
  function pickSong(song) {
    setPickedSong({ ...song })
    setView('predict')
  }

  return (
    <>
      {/* Like Apple Music: the whole page glows with the cover of the song you picked, very blurred */}
      <div className={glowCover ? 'page-glow on' : 'page-glow'}
        style={glowCover ? { backgroundImage: `url(${glowCover})` } : undefined} />
      <ArtistBackground />
      <MusicFacts />

      <div className="page">
        <header className="header">
          <h1>Genre Classifier</h1>
          <p className="muted">Which genre does a song sound like?</p>
        </header>

        {backendOk === false && (
          <p className="error">
            The backend is not running. Start it with <code>.venv/bin/python production/backend/app.py</code>
          </p>
        )}

        {backendOk && (
          <>
            <Spotlight onPick={pickSong} />

            {/* Apple-style switch between the three views */}
            <nav className="switch">
              {VIEWS.map((v) => (
                <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
                  {v.label}
                </button>
              ))}
            </nav>

            {/* The views are hidden, not removed, so what you did in one stays when you switch */}
            <div hidden={view !== 'predict'}><PredictSection pickedSong={pickedSong} onCover={setGlowCover} /></div>
            <div hidden={view !== 'thresholds'}><ThresholdSection /></div>
            <div hidden={view !== 'features'}><ImportanceSection /></div>

            <details className="about">
              <summary>Good to know</summary>
              <ul>
                <li>The model only uses how a song sounds. Popularity is left out on purpose.</li>
                <li>It only knows six genres: classical, country, heavy-metal, hip-hop, jazz and techno.</li>
                <li>"Train songs" were used to train the model, so it has seen them before.</li>
                <li>The true genre comes from Spotify playlists and can be wrong.</li>
              </ul>
            </details>
          </>
        )}
      </div>
    </>
  )
}
