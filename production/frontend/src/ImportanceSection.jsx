import { useEffect, useState } from 'react'
import { getFeatureImportance } from './api.js'

// The "Features" view: which features the model relies on, as simple bars
export default function ImportanceSection() {
  const [features, setFeatures] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getFeatureImportance()
      .then((data) => setFeatures(data.features))
      .catch((e) => setError(e.message))
  }, [])

  // The longest bar of each method fills the whole width; the others are compared to it
  const maxPermutation = Math.max(...features.map((f) => f.permutation), 0.001)
  const maxGain = Math.max(...features.map((f) => f.total_gain), 0.001)

  return (
    <section className="card tilt" data-tilt="2">
      <p className="muted">Which features does the model listen to most?</p>
      <p className="legend small">
        <span className="key solid" /> on the test set (permutation)
        <span className="key faded" /> during training (total gain)
      </p>
      {error && <p className="error">{error}</p>}

      {features.map((feature) => (
        <div key={feature.feature} className="importance-row">
          <span>{feature.feature.replace('_ms', '')}</span>
          <div>
            <div className="bar-thin solid" style={{ width: `${(feature.permutation / maxPermutation) * 100}%` }} />
            <div className="bar-thin faded" style={{ width: `${(feature.total_gain / maxGain) * 100}%` }} />
          </div>
        </div>
      ))}

      <details>
        <summary>What do the bars mean?</summary>
        <p className="muted small">
          White: how much the macro F1 on the test set drops when the feature is shuffled. Grey: the share of the
          improvement in the trees that came from the feature during training. The longest bar of each kind is the
          most important feature for that method.
        </p>
      </details>
    </section>
  )
}
