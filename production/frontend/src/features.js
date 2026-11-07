// Information about the genres and the features, used by the other files

// The sliders in the "describe a song yourself" form.
// key, time_signature and explicit are not shown: the model barely uses them (see Features),
// so they keep their starting value.
export const SLIDERS = [
  { name: 'acousticness', label: 'Acousticness', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'danceability', label: 'Danceability', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'instrumentalness', label: 'Instrumentalness', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'energy', label: 'Energy', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'speechiness', label: 'Speechiness', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'valence', label: 'Valence (happy sound)', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'liveness', label: 'Liveness', min: 0, max: 1, step: 0.01, unit: '' },
  { name: 'tempo', label: 'Tempo', min: 40, max: 220, step: 1, unit: 'BPM' },
  { name: 'loudness', label: 'Loudness', min: -40, max: 0, step: 0.5, unit: 'dB' },
  { name: 'duration_ms', label: 'Duration', min: 30000, max: 600000, step: 1000, unit: 'ms' },
]

// Where the sliders start: the median of ALL the training songs, so the start doesn't belong to any genre
// (the most common value for key, mode, time_signature and explicit)
export const START_VALUES = {
  duration_ms: 222458, danceability: 0.552, energy: 0.669, loudness: -7.412, speechiness: 0.048,
  acousticness: 0.115, instrumentalness: 0.001, liveness: 0.124, valence: 0.405, tempo: 123.026,
  explicit: 0, key: 7, mode: 1, time_signature: 4,
}
