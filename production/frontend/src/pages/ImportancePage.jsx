import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getFeatureImportance } from '../api.js'

export default function ImportancePage() {
  const [features, setFeatures] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getFeatureImportance()
      .then((data) => setFeatures(data.features))
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (!features) return <p className="muted">Loading…</p>

  // The backend sends them sorted by permutation importance; sort a copy by total gain for the second chart
  const byGain = [...features].sort((a, b) => b.total_gain - a.total_gain)

  return (
    <div>
      <section className="card">
        <h2>Which features does the model rely on?</h2>
        <p className="muted">
          Two different methods from the notebook. Permutation importance is measured on the test set, so it shows
          what the model really needs to be right on new songs. Total gain is measured during training, so it shows
          what the trees used while learning.
        </p>
      </section>

      <div className="two-columns">
        <section className="card">
          <h3>Permutation importance (test set)</h3>
          <p className="muted small">
            How much the macro F1 drops when one feature is shuffled. For example, 0.22 means the F1 falls from
            0.863 to about 0.64 when the model can't use that feature.
          </p>
          <ImportanceChart data={features} dataKey="permutation" color="#1f77b4" />
        </section>

        <section className="card">
          <h3>XGBoost total gain (training data)</h3>
          <p className="muted small">
            The share of all the improvement in the trees that came from splits on each feature. All the bars add
            up to 1.
          </p>
          <ImportanceChart data={byGain} dataKey="total_gain" color="#ff7f0e" />
        </section>
      </div>

      <section className="card">
        <h3>What this means</h3>
        <ul className="plain-list">
          <li>Both methods agree on the four most important features: popularity, acousticness, instrumentalness and danceability.</li>
          <li>
            Loudness is high in the total gain but low in the permutation importance. It is strongly correlated with
            energy, so when loudness is shuffled the model can get almost the same information from energy.
          </li>
          <li>
            The most important feature, popularity, says nothing about how a song sounds. Jazz, country and classical
            have many songs with popularity 0, so an unknown song from a small artist can be pushed towards these
            genres just because few people listen to it.
          </li>
        </ul>
      </section>
    </div>
  )
}

// A horizontal bar chart with one bar per feature
function ImportanceChart({ data, dataKey, color }) {
  return (
    <ResponsiveContainer width="100%" height={430}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e6eb" />
        <XAxis type="number" fontSize={11} />
        <YAxis type="category" dataKey="feature" width={115} fontSize={12} interval={0} />
        <Tooltip formatter={(value) => value.toFixed(3)} />
        <Bar dataKey={dataKey} fill={color} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
