import { useState } from 'react'
import { predictFeatures, predictSong, searchSongs } from '../api.js'
import { FEATURES, GENRE_COLORS, PRESETS } from '../features.js'
import PredictionResult from '../components/PredictionResult.jsx'

export default function PredictPage() {
  // The search
  const [searchText, setSearchText] = useState('')
  const [songs, setSongs] = useState([])
  const [searched, setSearched] = useState(false)

  // The "describe a song yourself" form, starting from a typical jazz song
  const [values, setValues] = useState(PRESETS.jazz)

  // The answer from the backend
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch(event) {
    event.preventDefault()   // stops the browser from reloading the page when the form is sent
    if (searchText.trim().length < 2) {
      setError('Type at least 2 letters to search.')
      return
    }
    setError('')
    try {
      const data = await searchSongs(searchText.trim())
      setSongs(data.songs)
      setSearched(true)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handlePickSong(songId) {
    setError('')
    setLoading(true)
    try {
      setResult(await predictSong(songId))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handlePredictValues(event) {
    event.preventDefault()
    const missing = FEATURES.filter((feature) => !Number.isFinite(values[feature.name]))
    if (missing.length > 0) {
      setError('Fill in: ' + missing.map((feature) => feature.label).join(', '))
      return
    }
    setError('')
    setLoading(true)
    try {
      setResult(await predictFeatures(values))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function changeValue(name, value) {
    setValues({ ...values, [name]: value })
  }

  return (
    <div className="predict-layout">
      <div>
        <section className="card">
          <h2>1. Search for a song</h2>
          <p className="muted">Search the 4,650 songs in the dataset by song name or artist, then click a song.</p>
          <form onSubmit={handleSearch} className="search-row">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="For example: mozart, metallica or eminem"
              aria-label="Search for a song or artist"
            />
            <button type="submit">Search</button>
          </form>

          {searched && songs.length === 0 && <p className="muted">No songs found.</p>}
          <ul className="song-list">
            {songs.map((song) => (
              <li key={song.song_id}>
                <button className="song-button" onClick={() => handlePickSong(song.song_id)}>
                  <span>
                    <strong>{song.track_name}</strong>
                    <br />
                    <span className="muted small">{song.artists.replaceAll(';', ', ')}</span>
                  </span>
                  <span className="song-tags">
                    <span className="genre-dot" style={{ background: GENRE_COLORS[song.genre] }} />
                    {song.genre}
                    <span className={song.set === 'test' ? 'tag test' : 'tag train'}>{song.set}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {songs.length === 20 && <p className="muted small">Showing the first 20 matches. Type more to narrow it down.</p>}
        </section>

        <section className="card">
          <h2>2. Or describe a song yourself</h2>
          <p className="muted">
            Start from a typical song of a genre (the median of its training songs), then change the values
            and see how the prediction changes.
          </p>
          <div className="preset-row">
            {Object.keys(PRESETS).map((genre) => (
              <button
                key={genre}
                type="button"
                className="preset"
                style={{ borderColor: GENRE_COLORS[genre], color: GENRE_COLORS[genre] }}
                onClick={() => setValues(PRESETS[genre])}
              >
                typical {genre}
              </button>
            ))}
          </div>

          <form onSubmit={handlePredictValues} className="feature-form">
            {FEATURES.map((feature) => (
              <FeatureInput key={feature.name} feature={feature} value={values[feature.name]} onChange={changeValue} />
            ))}
            <button type="submit" className="wide">Predict this song</button>
          </form>
        </section>
      </div>

      <div className="sticky">
        {error && <p className="error">{error}</p>}
        {loading && <p className="muted">Asking the model…</p>}
        {result ? (
          <PredictionResult result={result} />
        ) : (
          <div className="card empty">
            Pick a song from the search, or describe a song yourself, to see what the model thinks.
          </div>
        )}
      </div>
    </div>
  )
}

// One field in the form. What it looks like depends on the feature's type in features.js.
function FeatureInput({ feature, value, onChange }) {
  const { name, label, type, help } = feature
  const shown = Number.isFinite(value) ? value : ''   // an empty box instead of "NaN"
  const toNumber = (text) => (text === '' ? NaN : Number(text))

  if (type === 'slider') {
    return (
      <label className="field">
        <span className="field-label">{label} <b>{value.toFixed(2)}</b></span>
        <input type="range" min={feature.min} max={feature.max} step={feature.step} value={value}
          onChange={(e) => onChange(name, Number(e.target.value))} />
        <small className="muted">{help}</small>
      </label>
    )
  }

  if (type === 'seconds') {
    // The model wants milliseconds, but seconds are easier to type
    return (
      <label className="field">
        <span className="field-label">{label}</span>
        <input type="number" min={feature.min} max={feature.max} step={feature.step}
          value={Number.isFinite(value) ? Math.round(value / 1000) : ''}
          onChange={(e) => onChange(name, toNumber(e.target.value) * 1000)} />
        <small className="muted">{help}</small>
      </label>
    )
  }

  if (type === 'select') {
    return (
      <label className="field">
        <span className="field-label">{label}</span>
        <select value={value} onChange={(e) => onChange(name, Number(e.target.value))}>
          {feature.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    )
  }

  if (type === 'checkbox') {
    return (
      <label className="field checkbox-field">
        <input type="checkbox" checked={value === 1} onChange={(e) => onChange(name, e.target.checked ? 1 : 0)} />
        <span className="field-label">{label}</span>
      </label>
    )
  }

  // type === 'number'
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="number" min={feature.min} max={feature.max} step={feature.step} value={shown}
        onChange={(e) => onChange(name, toNumber(e.target.value))} />
      <small className="muted">{help}</small>
    </label>
  )
}
