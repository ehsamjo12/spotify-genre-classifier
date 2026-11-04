import { GENRE_COLORS } from '../features.js'

// One bar per genre with the model's probability, and a black line at that genre's threshold.
// A bar is coloured only if the probability reaches the threshold.
export default function ProbabilityBars({ probabilities, thresholds, prediction }) {
  return (
    <div className="prob-bars">
      {Object.keys(probabilities).map((genre) => {
        const probability = probabilities[genre]
        const threshold = thresholds[genre]
        const passed = probability >= threshold

        return (
          <div key={genre} className={genre === prediction ? 'prob-row predicted' : 'prob-row'}>
            <span className="prob-label">{genre}</span>
            <div className="prob-track">
              <div
                className="prob-fill"
                style={{ width: `${probability * 100}%`, background: passed ? GENRE_COLORS[genre] : '#c4c9d1' }}
              />
              <div
                className="prob-threshold"
                style={{ left: `${threshold * 100}%` }}
                title={`Threshold: ${threshold}`}
              />
            </div>
            <span className="prob-value">
              {(probability * 100).toFixed(1)}%
              <small> (needs {Math.round(threshold * 100)}%)</small>
            </span>
          </div>
        )
      })}
    </div>
  )
}
