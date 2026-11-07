import { useEffect, useState } from 'react'
import { searchSongs } from './api.js'
import { Cover } from './PredictSection.jsx'

// ⌘K on a Mac, Ctrl K on Windows
const SHORTCUT = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl K'

// Search from anywhere, like Spotlight on a Mac: press ⌘K, type, and pick a song with the arrow keys and Enter.
// onPick tells the app which song was picked, and the app shows the model's answer for it.
export default function Spotlight({ onPick }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [songs, setSongs] = useState([])
  const [selected, setSelected] = useState(0)     // the song the arrow keys are on

  function close() {
    setOpen(false)
    setText('')
    setSongs([])
  }

  // ⌘K (or Ctrl K) opens and closes it from anywhere on the page, and Esc closes it
  useEffect(() => {
    function pressKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()                    // stops what the browser itself does on ⌘K
        setOpen((isOpen) => !isOpen)
      }
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', pressKey)
    return () => window.removeEventListener('keydown', pressKey)
  }, [])

  // Search while you type. The backend is only asked when you have stopped typing for 200 ms.
  useEffect(() => {
    if (!text.trim()) {
      setSongs([])
      return
    }
    let stillNeeded = true                        // false if you typed more before the backend answered
    const timer = setTimeout(() => {
      searchSongs(text)
        .then((data) => {
          if (!stillNeeded) return
          setSongs(data.songs.slice(0, 8))
          setSelected(0)
        })
        .catch(() => setSongs([]))
    }, 200)
    return () => {
      stillNeeded = false
      clearTimeout(timer)
    }
  }, [text])

  function pick(song) {
    onPick(song)
    close()
  }

  // The arrow keys move between the songs, and Enter picks one
  function pressKeyInField(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()                      // stops the cursor from jumping in the text
      setSelected(Math.min(selected + 1, songs.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected(Math.max(selected - 1, 0))
    }
    if (event.key === 'Enter' && songs[selected]) pick(songs[selected])
  }

  return (
    <>
      {/* A small button in the corner, for when you don't use the keyboard */}
      <button className="light spotlight-button" onClick={() => setOpen(true)} aria-label="Search songs">
        <SearchIcon /> <span className="keycap">{SHORTCUT}</span>
      </button>

      {open && (
        // Clicking next to the search window closes it
        <div className="spotlight-backdrop" onClick={close}>
          <div className="spotlight" role="dialog" aria-label="Search songs" onClick={(e) => e.stopPropagation()}>
            <div className="spotlight-field">
              <SearchIcon />
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={pressKeyInField}
                placeholder="Search a song or artist" aria-label="Search a song or artist" />
            </div>

            {songs.map((song, i) => (
              <button key={song.song_id} className={i === selected ? 'spotlight-song selected' : 'spotlight-song'}
                onMouseEnter={() => setSelected(i)} onClick={() => pick(song)}>
                <Cover trackId={song.track_id} className="cover-small" />
                <span className="song-text">
                  <strong>{song.track_name}</strong>
                  <span className="small">{song.artists.replaceAll(';', ', ')}</span>
                </span>
              </button>
            ))}

            <p className="spotlight-help small">↑ ↓ to move · Enter to pick · Esc to close</p>
          </div>
        </div>
      )}
    </>
  )
}

// A magnifying glass, drawn with a circle and a line
function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  )
}
