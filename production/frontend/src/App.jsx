import { useEffect, useState } from 'react'
import { API_URL, getStatus } from './api.js'
import PredictPage from './pages/PredictPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import ImportancePage from './pages/ImportancePage.jsx'
import AboutPage from './pages/AboutPage.jsx'

const PAGES = [
  { id: 'predict', label: 'Predict a song' },
  { id: 'results', label: 'Thresholds & test results' },
  { id: 'importance', label: 'Feature importance' },
  { id: 'about', label: 'About the model' },
]

export default function App() {
  const [page, setPage] = useState('predict')
  const [status, setStatus] = useState(null)
  const [statusError, setStatusError] = useState('')

  function checkBackend() {
    getStatus()
      .then((data) => {
        setStatus(data)
        setStatusError('')
      })
      .catch((e) => setStatusError(e.message))
  }

  // Check that the backend is running when the page opens
  useEffect(() => {
    checkBackend()
  }, [])

  // While the backend is offline, check again every 3 seconds, so the message goes away by itself
  useEffect(() => {
    if (!statusError) return
    const timer = setInterval(checkBackend, 3000)
    return () => clearInterval(timer)
  }, [statusError])

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>🎵 Spotify Genre Classifier</h1>
          <p className="muted">Guesses the genre of a song from its Spotify audio features, with an XGBoost model.</p>
        </div>
        <span className={statusError ? 'status bad' : 'status good'}>
          {statusError ? 'Backend offline' : status ? `Backend connected · ${status.songs.toLocaleString('en')} songs` : 'Connecting…'}
        </span>
      </header>

      {statusError && (
        <p className="error">
          {statusError} Start it from the project folder with: <code>.venv/bin/python production/backend/app.py</code>
        </p>
      )}

      <nav className="tabs">
        {PAGES.map((p) => (
          <button key={p.id} className={page === p.id ? 'tab active' : 'tab'} onClick={() => setPage(p.id)}>
            {p.label}
          </button>
        ))}
      </nav>

      <main>
        {/* The predict page is only hidden, not removed, so the search and the answer stay when you switch pages */}
        <div hidden={page !== 'predict'}><PredictPage /></div>
        {page === 'results' && <ResultsPage />}
        {page === 'importance' && <ImportancePage />}
        {page === 'about' && <AboutPage />}
      </main>

      <footer className="footer muted small">
        Model and results: production/train_model.ipynb · Backend: {API_URL}
      </footer>
    </div>
  )
}
