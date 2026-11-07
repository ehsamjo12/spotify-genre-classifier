import { useEffect, useRef, useState } from 'react'
import { findLyricsVideo, findMusicVideo, findWikidataVideo, findYouTubeVideo, loadYouTubePlayer } from './api.js'

// Where the music video comes from, tried in this order (see api.js):
// 1. Apple's 30 second preview of the official video: the cleanest, because it plays in our own player
// 2. the official video on YouTube, found through Wikidata (no key needed)
// 3. YouTube's own search, only with a YouTube key: the official video ...
// 4. ... or else a lyrics video
const SOURCES = [findMusicVideo, findWikidataVideo, findYouTubeVideo, findLyricsVideo]

async function findVideo(song, from) {
  for (let i = from; i < SOURCES.length; i++) {
    const found = await SOURCES[i](song.track_name, song.artists)
    if (found) return { ...found, next: i + 1 }   // next: where to go on if this video can't be played
  }
  return null
}

// The song's music video, in a player that looks like the Apple TV app.
// speed comes from DJ mode, and the video follows it. onSound: the video's sound was turned on, so Spotify's
// player should stop.
export default function MusicVideo({ song, speed, onSound }) {
  const [video, setVideo] = useState(undefined)   // undefined: still looking, null: no video found
  const [from, setFrom] = useState(0)             // the first source to try

  useEffect(() => {
    let stillNeeded = true
    setVideo(undefined)
    findVideo(song, from).then((found) => { if (stillNeeded) setVideo(found) })
    return () => { stillNeeded = false }
  }, [song, from])

  if (video === undefined) {
    return <div className="video"><p className="video-message muted small">Looking for the music video…</p></div>
  }

  if (video === null) {
    const search = 'https://www.youtube.com/results?' + new URLSearchParams({ search_query: `${song.track_name} ${song.artists.split(';')[0]}` })
    return (
      <div className="video">
        <div className="video-message">
          <p className="muted small">No music video found for this song.</p>
          <a className="button-link" href={search} target="_blank" rel="noreferrer">Search on YouTube</a>
        </div>
      </div>
    )
  }

  // key: a new video gets a new player
  return <Player key={video.youtube || video.url} video={video} song={song} speed={speed} onSound={onSound}
    onFail={() => setFrom(video.next)} />
}

// The player, like the one in the Apple TV app: all the buttons lie on the video. It works the same for both
// kinds of video, because player.current has the same buttons for both: play, pause, mute, volume, seek, time,
// length and speed. (This app is for private use: YouTube's rules don't allow covering its player like this.)
function Player({ video, song, speed, onSound, onFail }) {
  const box = useRef(null)         // the whole player, for full screen
  const screen = useRef(null)      // where YouTube's player goes
  const film = useRef(null)        // our own <video> for Apple's preview
  const glow = useRef(null)        // the canvas with the video's colors, glowing around the player
  const player = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)        // videos start without sound, so they don't play over Spotify
  const [volume, setVolume] = useState(1)
  const [time, setTime] = useState(0)
  const [length, setLength] = useState(0)

  // YouTube: its script puts its player in the screen, without YouTube's own buttons (controls: 0)
  useEffect(() => {
    if (!video.youtube) return
    const place = document.createElement('div')   // YouTube replaces this empty div with its player
    const holder = screen.current
    holder.appendChild(place)
    let youtube = null
    let stillNeeded = true
    loadYouTubePlayer().then((YT) => {
      if (!stillNeeded) return
      youtube = new YT.Player(place, {
        videoId: video.youtube,
        playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, iv_load_policy: 3, fs: 0 },
        events: {
          onReady: () => {
            player.current = {
              play: () => youtube.playVideo(),
              pause: () => youtube.pauseVideo(),
              mute: (on) => (on ? youtube.mute() : youtube.unMute()),
              volume: (level) => youtube.setVolume(Math.round(level * 100)),
              seek: (seconds) => youtube.seekTo(seconds, true),
              time: () => youtube.getCurrentTime(),
              length: () => youtube.getDuration(),
              speed: (rate) => youtube.setPlaybackRate(rate),
            }
            youtube.playVideo()
          },
          onStateChange: (event) => setPlaying(event.data === YT.PlayerState.PLAYING),
          onError: onFail,      // for example the owner doesn't allow it on other websites: try the next source
        },
      })
    })
    return () => {
      stillNeeded = false
      player.current = null
      if (youtube) youtube.destroy()
      holder.replaceChildren()
    }
  }, [video])

  // Apple's preview: our own <video>, so its colors can also be drawn into the glow every 0.2 seconds
  useEffect(() => {
    if (video.youtube) return
    const element = film.current
    player.current = {
      play: () => element.play(),
      pause: () => element.pause(),
      mute: (on) => { element.muted = on },
      volume: (level) => { element.volume = level },
      seek: (seconds) => { element.currentTime = seconds },
      time: () => element.currentTime,
      length: () => element.duration || 0,
      speed: (rate) => { element.playbackRate = rate },
    }
    const paint = glow.current.getContext('2d')
    const timer = setInterval(() => paint.drawImage(element, 0, 0, 32, 18), 200)
    return () => clearInterval(timer)
  }, [video])

  // Read the time 4 times a second, for the slider and the clock
  useEffect(() => {
    const timer = setInterval(() => {
      if (!player.current) return
      setTime(player.current.time() || 0)
      setLength(player.current.length() || 0)
    }, 250)
    return () => clearInterval(timer)
  }, [])

  // DJ mode's speed
  useEffect(() => {
    if (player.current) player.current.speed(speed)
  }, [speed, playing])

  function playOrPause() {
    if (!player.current) return
    if (playing) player.current.pause()
    else player.current.play()
  }

  // 10 seconds back (-10) or forward (10)
  function skip(seconds) {
    player.current?.seek(Math.max(0, Math.min(length, time + seconds)))
  }

  // The speaker button turns the sound on or off. When the sound goes on, Spotify's player stops.
  function soundOnOrOff() {
    if (!player.current) return
    player.current.mute(!muted)
    setMuted(!muted)
    if (muted) onSound()
  }

  // The volume slider. Moving it up from 0 turns the sound on.
  function changeVolume(level) {
    if (!player.current) return
    player.current.volume(level)
    setVolume(level)
    player.current.mute(level === 0)
    if (muted && level > 0) onSound()
    setMuted(level === 0)
  }

  function fullScreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else box.current.requestFullscreen?.()
  }

  const title = (
    <p className="tv-title">
      <small>{song.artists.replaceAll(';', ', ')}</small>
      <strong>{song.track_name}</strong>
    </p>
  )
  const loudness = (
    <div className="tv-pill tv-volume">
      <input className="tv-slider" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
        onChange={(e) => changeVolume(Number(e.target.value))} aria-label="Volume" />
      <button className="tv-icon" onClick={soundOnOrOff} aria-label={muted ? 'Turn the sound on' : 'Turn the sound off'}>
        <Icon name={muted ? 'muted' : 'sound'} />
      </button>
    </div>
  )
  const scrubber = (
    <div className="tv-pill tv-scrubber">
      <span>{showTime(time)}</span>
      <input className="tv-slider" type="range" min="0" max={length || 1} step="0.1" value={Math.min(time, length || 1)}
        onChange={(e) => player.current?.seek(Number(e.target.value))} aria-label="Position in the video" />
      <span>-{showTime(Math.max(0, length - time))}</span>
    </div>
  )

  return (
    <div ref={box} className={`tv-player${video.youtube ? ' youtube' : ''}${playing ? ' playing' : ''}`}>
      {/* The glow: the video's colors, very blurred, around the player (like Apple TV) */}
      {video.youtube
        ? <img className="video-glow" src={`https://i.ytimg.com/vi/${video.youtube}/hqdefault.jpg`} alt="" />
        : <canvas className="video-glow" ref={glow} width="32" height="18" />}

      <div className="video">
        {/* YouTube's player is made taller than the screen (see .youtube in App.css), so its title and logo
            fall in the black bars above and below the video, outside the screen */}
        {video.youtube
          ? <div className="video-screen" ref={screen} />
          : <video ref={film} src={video.url} autoPlay muted loop playsInline
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={onFail} />}

        {/* The layer with the buttons, over the whole video. It also catches the mouse, so YouTube's own menus
            don't pop up, and clicking the video itself plays or pauses it. While paused, the video is frosted.
            The buttons fade away while it plays, and come back when the mouse is on the video. */}
        <div className="tv-controls" onClick={(e) => { if (e.target === e.currentTarget) playOrPause() }}>
          <div className="tv-pill tv-corner">
            {!video.youtube && (
              <button className="tv-icon" onClick={() => film.current.requestPictureInPicture?.()} aria-label="Picture in picture">
                <Icon name="window" />
              </button>
            )}
            <button className="tv-icon" onClick={fullScreen} aria-label="Full screen"><Icon name="full" /></button>
          </div>
          {loudness}

          <div className="tv-center">
            <button className="tv-round" onClick={() => skip(-10)} aria-label="10 seconds back"><Icon name="back" /></button>
            <button className="tv-round big" onClick={playOrPause} aria-label={playing ? 'Pause' : 'Play'}>
              <Icon name={playing ? 'pause' : 'play'} />
            </button>
            <button className="tv-round" onClick={() => skip(10)} aria-label="10 seconds forward"><Icon name="forward" /></button>
          </div>

          <div className="tv-bottom">{title}{scrubber}</div>
        </div>
      </div>
      <p className="video-kind muted small">{video.kind}</p>
    </div>
  )
}

// 125 seconds → "2:05"
function showTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

// The small white pictures on the buttons, drawn as SVG, like the ones in the Apple TV app
function Icon({ name }) {
  const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const ten = <text x="12" y="15.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor">10</text>
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === 'play' && <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />}
      {name === 'pause' && <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />}
      {name === 'back' && <><path d="M12 4.5a7.5 7.5 0 1 1-7.5 7.5" {...line} /><path d="M14.5 2 12 4.5 14.5 7" {...line} />{ten}</>}
      {name === 'forward' && <><path d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5" {...line} /><path d="M9.5 2 12 4.5 9.5 7" {...line} />{ten}</>}
      {(name === 'sound' || name === 'muted') && <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor" />}
      {name === 'sound' && <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" {...line} />}
      {name === 'muted' && <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" {...line} />}
      {name === 'full' && <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...line} />}
      {name === 'window' && <><rect x="3" y="5" width="18" height="14" rx="2" {...line} /><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" /></>}
    </svg>
  )
}
