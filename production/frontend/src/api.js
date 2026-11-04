// Every call to the Flask backend is in this file, so the pages don't need to know the addresses.

// Where the backend runs (production/backend/app.py)
export const API_URL = 'http://127.0.0.1:5001'

// Sends one request to the backend and returns the JSON answer.
// If something goes wrong, it throws an error with a message the page can show.
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(API_URL + path, options)
  } catch {
    throw new Error(`Can't reach the backend at ${API_URL}. Is it running?`)
  }

  let data
  try {
    data = await response.json()
  } catch {
    // For example a "404 Not Found" page, which is HTML and not JSON
    throw new Error(`The backend answered with error ${response.status} (${path})`)
  }

  if (!response.ok) {
    // Our own errors are in "error", and flask-restful's automatic errors are in "message"
    const message = data.error || Object.values(data.message || {}).join(', ')
    throw new Error(message || `The backend answered with error ${response.status}`)
  }
  return data
}

// URLSearchParams turns {search: 'mozart'} into "search=mozart" for the address
const query = (values) => '?' + new URLSearchParams(values).toString()

export const getStatus = () => request('/')
export const searchSongs = (text) => request('/songs' + query({ search: text }))
export const predictSong = (songId) => request('/predict/song' + query({ song_id: songId }))
export const predictFeatures = (values) => request('/predict' + query(values))
export const getThresholds = () => request('/thresholds')
export const saveThresholds = (thresholds) => request('/thresholds' + query(thresholds), { method: 'PUT' })
export const getResults = () => request('/results')
export const getThresholdCurves = () => request('/threshold-curves')
export const getFeatureImportance = () => request('/feature-importance')
