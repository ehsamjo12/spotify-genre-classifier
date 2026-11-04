// Information about the genres and the 15 features, used by several pages

// The six genres, in the same order as the backend (alphabetical)
export const GENRES = ['classical', 'country', 'heavy-metal', 'hip-hop', 'jazz', 'techno']

// The same colours as the plots in the notebook (matplotlib's default colours)
export const GENRE_COLORS = {
  classical: '#1f77b4',
  country: '#ff7f0e',
  'heavy-metal': '#2ca02c',
  'hip-hop': '#d62728',
  jazz: '#9467bd',
  techno: '#8c564b',
}

const KEY_NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B']

// How every feature is shown in the "describe a song yourself" form
export const FEATURES = [
  { name: 'danceability', label: 'Danceability', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How suitable the song is for dancing (0 = not at all, 1 = very)' },
  { name: 'energy', label: 'Energy', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How intense and active the song feels' },
  { name: 'acousticness', label: 'Acousticness', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How sure Spotify is that the song is acoustic' },
  { name: 'instrumentalness', label: 'Instrumentalness', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How likely it is that the song has no vocals' },
  { name: 'speechiness', label: 'Speechiness', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How much of the song is spoken words (rap scores high)' },
  { name: 'valence', label: 'Valence', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How positive the song sounds (0 = sad or angry, 1 = happy)' },
  { name: 'liveness', label: 'Liveness', type: 'slider', min: 0, max: 1, step: 0.01,
    help: 'How likely it is that the song was recorded live' },
  { name: 'tempo', label: 'Tempo (BPM)', type: 'number', min: 30, max: 250, step: 'any',
    help: 'Beats per minute' },
  { name: 'loudness', label: 'Loudness (dB)', type: 'number', min: -60, max: 2, step: 'any',
    help: 'Average loudness, usually between -60 and 0' },
  { name: 'duration_ms', label: 'Duration (seconds)', type: 'seconds', min: 10, max: 3000, step: 1,
    help: 'How long the song is' },
  { name: 'popularity', label: 'Popularity', type: 'number', min: 0, max: 100, step: 1,
    help: 'How popular the song is on Spotify (0 to 100). The model relies on this a lot, see Feature importance' },
  { name: 'key', label: 'Key', type: 'select',
    options: KEY_NAMES.map((name, number) => ({ value: number, label: name })) },
  { name: 'mode', label: 'Mode', type: 'select',
    options: [{ value: 1, label: 'Major' }, { value: 0, label: 'Minor' }] },
  { name: 'time_signature', label: 'Time signature', type: 'select',
    options: [{ value: 4, label: '4/4' }, { value: 3, label: '3/4' }, { value: 5, label: '5/4' }, { value: 1, label: '1/4' }] },
  { name: 'explicit', label: 'Explicit lyrics', type: 'checkbox' },
]

// A typical song for every genre: the median value of the TRAINING songs of that genre
// (the most common value for key, mode, time_signature and explicit).
// The test songs are not used here, so they stay unseen.
export const PRESETS = {
  classical: { popularity: 4, duration_ms: 197642, danceability: 0.379, energy: 0.139, loudness: -20.441,
    speechiness: 0.043, acousticness: 0.976, instrumentalness: 0.861, liveness: 0.118, valence: 0.335,
    tempo: 103.822, explicit: 0, key: 7, mode: 1, time_signature: 4 },
  country: { popularity: 1, duration_ms: 205320, danceability: 0.565, energy: 0.651, loudness: -6.571,
    speechiness: 0.034, acousticness: 0.201, instrumentalness: 0.0, liveness: 0.122, valence: 0.554,
    tempo: 123.099, explicit: 0, key: 7, mode: 1, time_signature: 4 },
  'heavy-metal': { popularity: 23, duration_ms: 245506, danceability: 0.445, energy: 0.929, loudness: -5.215,
    speechiness: 0.06, acousticness: 0.0, instrumentalness: 0.001, liveness: 0.193, valence: 0.374,
    tempo: 128.005, explicit: 0, key: 9, mode: 1, time_signature: 4 },
  'hip-hop': { popularity: 60, duration_ms: 202963, danceability: 0.732, energy: 0.69, loudness: -5.991,
    speechiness: 0.098, acousticness: 0.162, instrumentalness: 0.0, liveness: 0.135, valence: 0.546,
    tempo: 110.583, explicit: 0, key: 1, mode: 0, time_signature: 4 },
  jazz: { popularity: 37, duration_ms: 197040, danceability: 0.524, energy: 0.342, loudness: -10.799,
    speechiness: 0.039, acousticness: 0.764, instrumentalness: 0.0, liveness: 0.121, valence: 0.433,
    tempo: 112.409, explicit: 0, key: 0, mode: 1, time_signature: 4 },
  techno: { popularity: 42, duration_ms: 301440, danceability: 0.706, energy: 0.762, loudness: -8.149,
    speechiness: 0.049, acousticness: 0.012, instrumentalness: 0.76, liveness: 0.108, valence: 0.253,
    tempo: 125.023, explicit: 0, key: 7, mode: 1, time_signature: 4 },
}
