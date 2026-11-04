import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GENRE_COLORS } from '../features.js'

// One small plot per genre: the F1 score (from cross-validation on the training data)
// for every threshold. The red dashed line is the threshold the app uses right now.
export default function ThresholdCurves({ curves, thresholds }) {
  return (
    <div className="curves-grid">
      {Object.keys(curves.f1).map((genre) => {
        // recharts wants one object per point: {threshold: 0.05, f1: 0.81}, ...
        const points = curves.thresholds.map((threshold, i) => ({ threshold, f1: curves.f1[genre][i] }))

        return (
          <div key={genre} className="curve-card">
            <h4 style={{ color: GENRE_COLORS[genre] }}>{genre}</h4>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={points} margin={{ top: 5, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3e6eb" />
                <XAxis dataKey="threshold" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} fontSize={11} />
                <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} fontSize={11} />
                <Tooltip formatter={(value) => [value.toFixed(3), 'F1']} labelFormatter={(t) => `threshold ${t}`} />
                <Line dataKey="f1" stroke={GENRE_COLORS[genre]} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceLine x={thresholds[genre]} stroke="#e03131" strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}
