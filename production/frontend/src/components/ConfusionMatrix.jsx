// The confusion matrix from /results as a table.
// Rows = the real genre, columns = what the model answered (including "not sure").
// The darker a cell, the bigger the share of that row's songs.
export default function ConfusionMatrix({ labels, values }) {
  const genres = labels.slice(0, values.length)   // the rows: the six real genres

  return (
    <div className="table-scroll">
      <table className="matrix">
        <thead>
          <tr>
            <th className="corner">real ↓ / predicted →</th>
            {labels.map((label) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {values.map((row, rowNumber) => {
            const rowTotal = row.reduce((sum, value) => sum + value, 0)
            return (
              <tr key={genres[rowNumber]}>
                <th>{genres[rowNumber]}</th>
                {row.map((value, columnNumber) => {
                  const share = rowTotal > 0 ? value / rowTotal : 0
                  const isCorrect = rowNumber === columnNumber
                  const isNotSure = labels[columnNumber] === 'not sure'
                  const color = isNotSure ? '120, 120, 120' : isCorrect ? '31, 119, 180' : '214, 39, 40'
                  return (
                    <td
                      key={columnNumber}
                      className={isCorrect ? 'correct' : ''}
                      style={{ background: `rgba(${color}, ${0.08 + share * 0.8})`, color: share > 0.55 ? 'white' : 'inherit' }}
                      title={`${(share * 100).toFixed(1)}% of the real ${genres[rowNumber]} songs`}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
