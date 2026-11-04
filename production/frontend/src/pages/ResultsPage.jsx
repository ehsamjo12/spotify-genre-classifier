import { useEffect, useRef, useState } from 'react'
import { getResults, getThresholdCurves, getThresholds, saveThresholds } from '../api.js'
import { GENRE_COLORS } from '../features.js'
import ConfusionMatrix from '../components/ConfusionMatrix.jsx'
import ThresholdCurves from '../components/ThresholdCurves.jsx'

export default function ResultsPage() {
  const [thresholds, setThresholds] = useState(null)   // what the sliders show
  const [tuned, setTuned] = useState(null)             // the tuned thresholds from the notebook
  const [results, setResults] = useState(null)
  const [curves, setCurves] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef(null)

  // When the page opens: get the thresholds, the test results and the curves from the backend
  useEffect(() => {
    async function load() {
      try {
        const answer = await getThresholds()
        setThresholds(answer.current)
        setTuned(answer.tuned)
        setResults(await getResults())
        setCurves(await getThresholdCurves())
      } catch (e) {
        setError(e.message)
      }
    }
    load()
  }, [])

  // Send new thresholds to the backend, then get the test results for them
  async function save(newThresholds) {
    clearTimeout(timer.current)
    setSaving(true)
    try {
      const answer = await saveThresholds(newThresholds)
      setThresholds(answer.current)
      setResults(await getResults())
      setError('')
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  // Moving a slider shows the new value right away, but waits until the user has stopped
  // moving it for 300 ms before asking the backend, so it isn't asked 50 times per second
  function moveSlider(genre, value) {
    const newThresholds = { ...thresholds, [genre]: value }
    setThresholds(newThresholds)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(newThresholds), 300)
  }

  function setAll(value) {
    const newThresholds = {}
    for (const genre of Object.keys(thresholds)) newThresholds[genre] = value
    save(newThresholds)
  }

  if (error && !results) return <p className="error">{error}</p>
  if (!thresholds || !results) return <p className="muted">Loading…</p>

  // Accuracy on only the songs that got a genre: the correct ones are on the diagonal of the matrix
  const answered = results.test_songs - results.not_sure
  const correct = results.confusion_matrix.values.reduce((sum, row, i) => sum + row[i], 0)

  return (
    <div>
      <section className="card">
        <h2>Thresholds</h2>
        <p className="muted">
          A genre is only chosen if its probability reaches its threshold. If no genre does, the model answers
          "not sure". The tuned values were found with cross-validation on the training data in the notebook,
          by picking the threshold with the best F1 for every genre.
        </p>
        <div className="sliders">
          {Object.keys(thresholds).map((genre) => (
            <label key={genre} className="slider-row">
              <span className="slider-name" style={{ color: GENRE_COLORS[genre] }}>{genre}</span>
              <input type="range" min="0" max="1" step="0.01" value={thresholds[genre]}
                onChange={(e) => moveSlider(genre, Number(e.target.value))} />
              <span className="slider-value">{thresholds[genre].toFixed(2)}</span>
              <span className="muted small">tuned: {tuned[genre].toFixed(2)}</span>
            </label>
          ))}
        </div>
        <div className="button-row">
          <button onClick={() => save(tuned)}>Reset to the tuned thresholds</button>
          <button className="secondary" onClick={() => setAll(0.5)}>All 0.50</button>
          <button className="secondary" onClick={() => setAll(0)}>All 0 (always guess)</button>
          {saving && <span className="muted">Updating…</span>}
        </div>
        {error && <p className="error">{error}</p>}
        <p className="hint">
          The thresholds are kept in the backend's memory. Everyone using the app shares them, and they go back to
          the tuned values when the backend restarts.
        </p>
      </section>

      <section className="card">
        <h2>Test results with these thresholds</h2>
        <p className="muted">Calculated on the {results.test_songs} test songs, which the model never saw during training.</p>
        <div className="stats">
          <Stat label="Accuracy" value={results.accuracy.toFixed(3)} note='"not sure" counts as wrong' />
          <Stat label="Macro F1" value={results.macro_f1.toFixed(3)} note="every genre counts the same" />
          <Stat label='"Not sure"' value={`${results.not_sure} of ${results.test_songs}`}
            note={`${((results.not_sure / results.test_songs) * 100).toFixed(1)}% of the test songs`} />
          <Stat label="Accuracy when it answers" value={answered > 0 ? (correct / answered).toFixed(3) : '–'}
            note={`${answered} songs got a genre`} />
        </div>

        <h3>Per genre</h3>
        <div className="table-scroll">
          <table className="per-genre">
            <thead>
              <tr><th>Genre</th><th>Precision</th><th>Recall</th><th>F1</th></tr>
            </thead>
            <tbody>
              {Object.entries(results.per_genre).map(([genre, scores]) => (
                <tr key={genre}>
                  <th style={{ color: GENRE_COLORS[genre] }}>{genre}</th>
                  <td>{scores.precision.toFixed(3)}</td>
                  <td>{scores.recall.toFixed(3)}</td>
                  <td>{scores.f1.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Precision: of the songs the model called this genre, how many really were. Recall: of the real songs of
          this genre, how many the model found ("not sure" counts as not found).
        </p>

        <h3>Confusion matrix</h3>
        <ConfusionMatrix labels={results.confusion_matrix.labels} values={results.confusion_matrix.values} />
        <p className="hint">Blue = correct, red = mixed up with another genre, grey = "not sure". Hover over a cell to see its share of the row.</p>
      </section>

      {curves && (
        <section className="card">
          <h2>F1 for every threshold</h2>
          <p className="muted">
            From the notebook: the F1 of every genre on the training data (cross-validation) for the thresholds
            0.05 to 0.95. The red dashed line is the threshold the app uses right now.
          </p>
          <ThresholdCurves curves={curves} thresholds={thresholds} />
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="muted small">{note}</span>
    </div>
  )
}
