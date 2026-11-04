import ProbabilityBars from './ProbabilityBars.jsx'
import { GENRE_COLORS } from '../features.js'

// Shows the answer from /predict or /predict/song
export default function PredictionResult({ result }) {
  const { prediction, probabilities, thresholds, song, warning } = result
  const notSure = prediction === 'not sure'

  return (
    <div className="card result">
      {song && (
        <p className="song-title">
          {song.track_name}
          <span className="muted"> by {song.artists.replaceAll(';', ', ')}</span>
        </p>
      )}

      <p className="small muted">The model says:</p>
      <div className="prediction" style={{ color: notSure ? '#6b7280' : GENRE_COLORS[prediction] }}>
        {notSure ? 'Not sure' : prediction}
      </div>
      <p className="muted">
        {notSure
          ? 'No genre reached its threshold, so the model answers "not sure" instead of guessing.'
          : 'This is the most likely genre of the ones that reached their threshold.'}
      </p>

      {song && (
        <p>
          Genre in the dataset: <strong>{song.true_genre}</strong>{' '}
          {!notSure && (song.true_genre === prediction ? '✅ correct' : '❌ wrong')}{' '}
          <span className={song.set === 'test' ? 'tag test' : 'tag train'}>
            {song.set === 'test' ? 'test song' : 'training song'}
          </span>
        </p>
      )}
      {warning && <p className="warning">⚠️ {warning}</p>}

      <h3>Probability per genre</h3>
      <ProbabilityBars probabilities={probabilities} thresholds={thresholds} prediction={prediction} />
      <p className="hint">
        The black line on each bar is that genre's threshold. A genre can only be chosen when its bar reaches
        the line. You can change the thresholds on the "Thresholds &amp; test results" page.
      </p>
    </div>
  )
}
