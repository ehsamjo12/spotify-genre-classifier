// All the calls to the Flask backend are in this file, so the other files don't need to know the addresses.

// Where the backend runs (production/backend/app.py)
export const API_URL = 'http://127.0.0.1:5001'

// Sends one request to the backend and returns its JSON answer.
// If something goes wrong, it throws an error with a message the page can show.
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(API_URL + path, options)
  } catch {
    throw new Error(`Can't reach the backend at ${API_URL}. Is it running?`)
  }

  const data = await response.json()
  if (!response.ok) {
    // Our own errors are in "error", and flask-restful's automatic errors are in "message"
    throw new Error(data.error || Object.values(data.message || {}).join(', ') || `Error ${response.status}`)
  }
  return data
}

// URLSearchParams turns {search: 'mozart'} into "?search=mozart" for the address
const query = (values) => '?' + new URLSearchParams(values).toString()

export const getStatus = () => request('/')
export const searchSongs = (text) => request('/songs' + query({ search: text }))
export const predictSong = (songId) => request('/predict/song' + query({ song_id: songId }))
export const predictValues = (values) => request('/predict' + query(values))
export const getThresholds = () => request('/thresholds')
export const saveThresholds = (thresholds) => request('/thresholds' + query(thresholds), { method: 'PUT' })
export const getResults = () => request('/results')
export const getFeatureImportance = () => request('/feature-importance')

// The album covers come straight from Spotify (an outside source), not from our backend.
// Spotify's public "oEmbed" service needs no login, and gives a picture for every track_id.
const covers = {}   // remembers the covers we already got, so Spotify is only asked once per song

export async function getCover(trackId) {
  if (!(trackId in covers)) {
    try {
      const songPage = `https://open.spotify.com/track/${trackId}`
      const response = await fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(songPage))
      covers[trackId] = (await response.json()).thumbnail_url || null
    } catch {
      covers[trackId] = null   // no internet, or Spotify didn't answer: the page just shows no picture
    }
  }
  return covers[trackId]
}

// A 30 second preview of a song from Apple's iTunes Search API (also an outside source, no login needed).
// DJ mode uses it, because the sound of Spotify's player can't be changed by our page, but this one can.
export async function findPreview(trackName, artists) {
  const firstArtist = artists.split(';')[0]
  const address = 'https://itunes.apple.com/search?' +
    new URLSearchParams({ term: `${trackName} ${firstArtist}`, media: 'music', entity: 'song', limit: 1 })
  try {
    const found = (await (await fetch(address)).json()).results[0]
    return found ? { url: found.previewUrl, name: found.trackName, artist: found.artistName } : null
  } catch {
    return null   // no internet, or iTunes didn't answer
  }
}

// Makes a name easy to compare: small letters, no accents, no punctuation ("Beyoncé!" → "beyonce")
const simple = (text) => text.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, '').trim()

// The song's name without extras: "Without Me (Remastered)" and "Hurt - Live" become "Without Me" and "Hurt"
const shortTitle = (trackName) => trackName.split(/ [(-]/)[0]

// The official music video on YouTube, found through Wikidata: the free database behind Wikipedia (no key
// needed). For many songs it knows the YouTube id of the official video. Its search finds the song by its name
// (big or small letters don't matter), and the artist must be the same.
export async function findWikidataVideo(trackName, artists) {
  const title = shortTitle(trackName).replace(/["\\]/g, '')     // quotes would break the query
  const query = `SELECT ?video ?name WHERE {
    SERVICE wikibase:mwapi { bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch";
      mwapi:search "${title}"; mwapi:language "en". ?song wikibase:apiOutputItem mwapi:item. }
    ?song wdt:P1651 ?video; wdt:P175 ?artist. ?artist rdfs:label ?name. FILTER(LANG(?name) = "en")
  } LIMIT 50`
  try {
    const rows = (await (await fetch('https://query.wikidata.org/sparql?' + new URLSearchParams({ format: 'json', query }))).json()).results.bindings
    const found = rows.find((row) => simple(row.name.value) === simple(artists.split(';')[0]))
    return found ? { youtube: found.video.value, kind: 'Official music video' } : null
  } catch {
    return null   // no internet, or Wikidata didn't answer
  }
}

// YouTube's search, for the songs that Apple and Wikidata don't have. With a free YouTube API key in
// production/frontend/.env.local (see the README) it uses YouTube's official search. Without a key it asks the
// dev server, which reads YouTube's normal search page for us (see vite.config.js).
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY

async function searchYouTube(words, kind) {
  try {
    if (YOUTUBE_KEY) {
      const address = 'https://www.googleapis.com/youtube/v3/search?' + new URLSearchParams({
        part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: 1, key: YOUTUBE_KEY, q: words,
      })
      const found = (await (await fetch(address)).json()).items?.[0]
      return found ? { youtube: found.id.videoId, kind } : null
    }
    const { ids } = await (await fetch('/youtube-search?' + new URLSearchParams({ q: words }))).json()
    return ids.length ? { youtube: ids[0], kind } : null
  } catch {
    return null   // no internet, or YouTube didn't answer
  }
}

export const findYouTubeVideo = (trackName, artists) =>
  searchYouTube(`${shortTitle(trackName)} ${artists.split(';')[0]} official video`, 'Music video')

// A lyrics video (from channels like Billion Stars), when there is no official video
export const findLyricsVideo = (trackName, artists) =>
  searchYouTube(`${shortTitle(trackName)} ${artists.split(';')[0]} lyrics`, 'Lyrics video')

// A 30 second preview of the official music video from iTunes (no key needed). Apple doesn't have a video for
// every song, and the search sometimes finds covers by other people, so only a video by the same artist with the
// same title counts.
export async function findMusicVideo(trackName, artists) {
  const firstArtist = artists.split(';')[0]
  const title = simple(shortTitle(trackName))
  const address = 'https://itunes.apple.com/search?' +
    new URLSearchParams({ term: `${trackName} ${firstArtist}`, media: 'musicVideo', entity: 'musicVideo', limit: 25 })
  try {
    const found = (await (await fetch(address)).json()).results.find((video) =>
      video.previewUrl && simple(video.artistName).includes(simple(firstArtist)) && simple(video.trackName).includes(title))
    return found ? { url: found.previewUrl, kind: '30 second preview of the official video, from iTunes' } : null
  } catch {
    return null   // no internet, or iTunes didn't answer
  }
}

// YouTube's player script, so the page can play, pause and mute a YouTube video with its own glass buttons.
// It is only loaded once, the first time a YouTube video is shown.
let youTubePlayer = null

export function loadYouTubePlayer() {
  if (!youTubePlayer) {
    youTubePlayer = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT)   // YouTube's script calls this when it is ready
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
    })
  }
  return youTubePlayer
}

// Spotify's music player comes from Spotify too. Their "iFrame API" script puts a small player on the page and
// tells us when the song plays or pauses. The script is only loaded once, the first time a player is needed.
let spotifyPlayer = null

export function loadSpotifyPlayer() {
  if (!spotifyPlayer) {
    spotifyPlayer = new Promise((resolve) => {
      window.onSpotifyIframeApiReady = resolve   // Spotify's script calls this function when it is ready
      const script = document.createElement('script')
      script.src = 'https://open.spotify.com/embed/iframe-api/v1'
      document.body.appendChild(script)
    })
  }
  return spotifyPlayer
}
