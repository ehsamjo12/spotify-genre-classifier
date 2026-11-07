import { useEffect, useRef, useState } from 'react'
import { getCover, predictSong, predictValues, searchSongs } from './api.js'
import { SLIDERS, START_VALUES } from './features.js'
import { Record, SpotifyPlayer } from './NowPlaying.jsx'
import DjDeck from './DjDeck.jsx'
import MusicVideo from './MusicVideo.jsx'

// The "Predict" view: search for a song (or describe one), and see what the model thinks.
// pickedSong is a song picked in the Spotlight search (⌘K), and onCover tells the page which cover to glow with.
export default function PredictSection({ pickedSong, onCover }) {
  const [searchText, setSearchText] = useState('')
  const [songs, setSongs] = useState([])                   // the search results
  const [showSliders, setShowSliders] = useState(false)    // is "describe a song yourself" open?
  const [values, setValues] = useState(START_VALUES)       // the values of the sliders
  const [result, setResult] = useState(null)               // the answer from the backend
  const [answerNumber, setAnswerNumber] = useState(0)      // counts the answers, so every new one animates in
  const [error, setError] = useState('')
  const resultBox = useRef(null)

  // Scroll down to the answer when a new one arrives
  useEffect(() => {
    if (result) resultBox.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [result])

  // A song picked in the Spotlight search: predict it, like a song clicked in the list
  useEffect(() => {
    if (pickedSong) predict(() => predictSong(pickedSong.song_id))
  }, [pickedSong])

  async function search(event) {
    event.preventDefault()   // stops the browser from reloading the page when the form is sent
    try {
      const data = await searchSongs(searchText)
      setSongs(data.songs)
      setError(data.songs.length === 0 ? 'No songs found.' : '')
    } catch (e) {
      setError(e.message)
    }
  }

  async function predict(askBackend) {
    try {
      setResult(await askBackend())
      setAnswerNumber((number) => number + 1)
      setSongs([])            // hide the list, so only the answer is left
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <section className="card tilt" data-tilt="2">
      <form onSubmit={search} className="search">
        <input value={searchText} onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search a song or artist, like Mozart or Eminem" />
        <button type="submit">Search</button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="song-list">
        {songs.map((song) => (
          <button key={song.song_id} className="song" onClick={() => predict(() => predictSong(song.song_id))}>
            <Cover trackId={song.track_id} className="cover-small" />
            <span className="song-text">
              <strong>{song.track_name}</strong>
              <span className="muted small">{song.artists.replaceAll(';', ', ')}</span>
            </span>
          </button>
        ))}
      </div>

      <button className="light" onClick={() => setShowSliders(!showSliders)}>
        {showSliders ? 'Hide the sliders' : 'Or describe a song yourself'}
      </button>

      {showSliders && (
        <div className="sliders-box">
          {SLIDERS.map((slider) => (
            <label key={slider.name} className="slider">
              <span>{slider.label}</span>
              <input type="range" min={slider.min} max={slider.max} step={slider.step} value={values[slider.name]}
                onChange={(e) => setValues({ ...values, [slider.name]: Number(e.target.value) })} />
              <span className="value">{showValue(slider, values[slider.name])}</span>
            </label>
          ))}
          <label className="slider">
            <span>Mode</span>
            <select value={values.mode} onChange={(e) => setValues({ ...values, mode: Number(e.target.value) })}>
              <option value={1}>Major</option>
              <option value={0}>Minor</option>
            </select>
          </label>
          <button className="wide" onClick={() => predict(() => predictValues(values))}>Predict</button>
          <button className="light" onClick={() => setValues(START_VALUES)}>Reset the sliders</button>
        </div>
      )}

      {/* key: a new answer is a new Result, so its bars grow in again */}
      <div ref={resultBox}>{result && <Result key={answerNumber} result={result} onCover={onCover} />}</div>
    </section>
  )
}

// The model's answer: the predicted genre (next to the true genre for songs from the dataset),
// and one bar per genre
function Result({ result, onCover }) {
  const { prediction, probabilities, thresholds, song, warning } = result
  const cover = useCover(song ? song.track_id : null)
  const [spotifyPlaying, setSpotifyPlaying] = useState(false)   // is the song playing in Spotify's player?
  const [showDj, setShowDj] = useState(false)                   // is DJ mode open?
  const [dj, setDj] = useState({ playing: false, speed: 1 })    // is DJ mode playing, and how fast?
  const spotify = useRef(null)                                  // Spotify's player, so DJ mode can pause it
  const speed = dj.playing ? dj.speed : 1                       // the record and the dancer follow DJ mode's speed

  // Let the whole page glow with the cover. Songs you describe yourself have no cover, so the glow goes away.
  useEffect(() => {
    if (cover || !song) onCover(cover)
  }, [cover])

  // The genre with the highest probability, even if it didn't reach its threshold
  const [mostLikely, highest] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="result">
      {/* The song's cover, very blurred, as the background of the answer (like Apple Music) */}
      {cover && <div className="result-theme" style={{ backgroundImage: `url(${cover})` }} />}

      {song && (
        <div className="song-header">
          <Record cover={cover} playing={spotifyPlaying || dj.playing} speed={speed} />
          <div>
            <p className="song-name">{song.track_name}</p>
            <p className="muted small">{song.artists.replaceAll(';', ', ')}</p>
            <button className="light dj-toggle" onClick={() => setShowDj(!showDj)}>
              {showDj ? 'Close DJ mode' : 'DJ mode'}
            </button>
          </div>
        </div>
      )}
      {song && <SpotifyPlayer trackId={song.track_id} controller={spotify} onPlayingChange={setSpotifyPlaying} />}
      {song && showDj && (
        <DjDeck song={song} otherPlaying={spotifyPlaying} onStart={() => spotify.current?.pause()} onChange={setDj} />
      )}

      <div className="answers">
        <div className="answer tilt" data-tilt="10">
          <span className="muted small">Predicted</span>
          <span className="genre">{prediction}</span>
        </div>
        {/* Only songs from the dataset have a true genre to compare with */}
        {song && (
          <div className="answer tilt" data-tilt="10">
            <span className="muted small">True genre</span>
            <span className="genre">{song.true_genre}</span>
          </div>
        )}
      </div>

      {/* One short line that explains the answer */}
      {prediction === 'not sure' && (
        <p className="verdict">Not sure: {mostLikely} is most likely ({Math.round(highest * 100)}%), but below its threshold.</p>
      )}
      {song && prediction !== 'not sure' && (
        <p className="verdict">{prediction === song.true_genre ? '✓ Right' : '✗ Wrong'}</p>
      )}
      {warning && <p className="warning small">This song was used for training, so it is not a fair test.</p>}

      {/* The song's music video (only songs from the dataset have one) */}
      {song && <MusicVideo song={song} speed={speed} onSound={() => spotify.current?.pause()} />}

      {Object.entries(probabilities).map(([genre, probability], i) => (
        <div key={genre} className="bar-row">
          <span>{genre}</span>
          <div className="bar">
            {/* white only if the probability reaches the genre's threshold (the line), grey otherwise.
                The bars grow in one after another, like a race. */}
            <div className={probability >= thresholds[genre] ? 'fill passed' : 'fill'}
              style={{ width: `${probability * 100}%`, animationDelay: `${i * 80}ms` }} />
            <div className="line" style={{ left: `${thresholds[genre] * 100}%` }} />
          </div>
          <span className="value">{Math.round(probability * 100)}%</span>
        </div>
      ))}
      <p className="muted small">The line is the genre's threshold. A bar turns white when it passes it.</p>
    </div>
  )
}

// Gets the address of a song's album cover from Spotify (null while loading, or if there is none)
function useCover(trackId) {
  const [cover, setCover] = useState(null)

  useEffect(() => {
    setCover(null)
    if (!trackId) return
    let stillNeeded = true                     // false if another song is shown before Spotify answers
    getCover(trackId).then((address) => { if (stillNeeded) setCover(address) })
    return () => { stillNeeded = false }
  }, [trackId])

  return cover
}

// A small album cover, or an empty grey square while it loads (or if Spotify has none).
// Also used by the Spotlight search.
export function Cover({ trackId, className }) {
  const cover = useCover(trackId)
  return cover ? <img className={className} src={cover} alt="" /> : <span className={className + ' empty'} />
}

// How a slider value is shown, for example "128 BPM" or "3:17" for the duration
function showValue(slider, value) {
  if (slider.name === 'duration_ms') {
    const seconds = Math.round(value / 1000)
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  }
  if (slider.unit) return `${Math.round(value)} ${slider.unit}`
  return value.toFixed(2)
}
