import { useEffect, useRef, useState } from 'react'
import { getResults, getThresholds, saveThresholds } from './api.js'

// The "Thresholds" view: change how sure the model must be, and see the test results for it
export default function ThresholdSection() {
  const [thresholds, setThresholds] = useState(null)   // what the sliders show
  const [tuned, setTuned] = useState(null)             // the tuned thresholds from the notebook
  const [results, setResults] = useState(null)         // the test results from the backend
  const [error, setError] = useState('')
  const timer = useRef(null)

  // When the page opens: get the thresholds and the test results from the backend
  useEffect(() => {
    getThresholds()
      .then((data) => {
        setThresholds(data.current)
        setTuned(data.tuned)
        return getResults()
      })
      .then(setResults)
      .catch((e) => setError(e.message))
  }, [])

  // Send the thresholds to the backend, then get the new test results
  async function save(newThresholds) {
    try {
      await saveThresholds(newThresholds)
      setResults(await getResults())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  // The slider moves right away, but the backend is only asked when the slider has been
  // still for 300 ms, so it isn't asked many times per second while you drag
  function moveSlider(genre, value) {
    const newThresholds = { ...thresholds, [genre]: value }
    setThresholds(newThresholds)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => save(newThresholds), 300)
  }

  function reset() {
    setThresholds(tuned)
    save(tuned)
  }

  if (error) return <section className="card"><p className="error">{error}</p></section>
  if (!thresholds || !results) return <section className="card"><p className="muted">Loading…</p></section>

  const labels = results.confusion_matrix.labels   // the six genres + "not sure"

  return (
    <section className="card tilt" data-tilt="2">
      <p className="muted">How sure must the model be before it picks a genre? Below that, it says "not sure".</p>

      <div className="numbers">
        <Stat label="Accuracy" value={results.accuracy.toFixed(3)} />
        <Stat label="Macro F1" value={results.macro_f1.toFixed(3)} />
        <Stat label="Not sure" value={`${results.not_sure} / ${results.test_songs}`} />
      </div>

      {Object.keys(thresholds).map((genre) => (
        <label key={genre} className="slider">
          <span>{genre}</span>
          <input type="range" min="0" max="1" step="0.05" value={thresholds[genre]}
            onChange={(e) => moveSlider(genre, Number(e.target.value))} />
          <span className="value">{Math.round(thresholds[genre] * 100)}%</span>
        </label>
      ))}
      <button className="light" onClick={reset}>Reset</button>

      {/* The details are hidden until you click on them */}
      <details>
        <summary>Details per genre</summary>
        <p className="muted small">
          On the {results.test_songs} test songs. The "→" columns show what the model answered for each real genre.
        </p>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>real genre</th><th>precision</th><th>recall</th><th>F1</th>
                {labels.map((label) => <th key={label} className="small">→ {label}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.confusion_matrix.values.map((row, i) => {
                const genre = labels[i]
                const scores = results.per_genre[genre]
                return (
                  <tr key={genre}>
                    <th>{genre}</th>
                    <td>{scores.precision.toFixed(2)}</td>
                    <td>{scores.recall.toFixed(2)}</td>
                    <td>{scores.f1.toFixed(2)}</td>
                    {row.map((count, j) => <td key={j} className={i === j ? 'correct' : ''}>{count}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="number tilt" data-tilt="10">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
