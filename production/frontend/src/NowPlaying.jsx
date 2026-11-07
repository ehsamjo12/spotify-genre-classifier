import { useEffect, useRef } from 'react'
import { loadSpotifyPlayer } from './api.js'

// The song you picked, like on a record player: the album cover is the sleeve, and the record next to it
// spins at 33⅓ rpm (like a real LP) while the song plays. The tone arm moves onto the record when it plays.
// speed comes from DJ mode: at 0.8× the record turns slower, at 1.25× faster.
export function Record({ cover, playing, speed }) {
  const vinyl = useRef(null)
  const goal = useRef(0)                 // how fast the record should turn: 0 when the music stops
  goal.current = playing ? speed : 0

  // Turn the record a little every frame. Like a real turntable, it speeds up and slows down smoothly.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let angle = 0
    let turning = 0                      // how fast it turns right now (1 = 33⅓ turns a minute)
    let last = performance.now()
    let frame = requestAnimationFrame(function turn(time) {
      const seconds = (time - last) / 1000
      last = time
      turning += (goal.current - turning) * Math.min(1, seconds * 4)
      angle = (angle + turning * 200 * seconds) % 360    // 33⅓ turns a minute = 200 degrees a second
      vinyl.current.style.transform = `rotate(${angle}deg)`
      frame = requestAnimationFrame(turn)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={playing ? 'record tilt playing' : 'record tilt'} data-tilt="14">
      <div className="vinyl" ref={vinyl}>{cover && <img className="vinyl-label" src={cover} alt="" />}</div>
      <span className="vinyl-shine" />
      <span className="tonearm" />
      {cover ? <img className="sleeve" src={cover} alt="" /> : <span className="sleeve" />}
    </div>
  )
}

// Spotify's own player for the song, so you can listen and judge the model yourself.
// Without a Spotify login it plays a 30 second preview. onPlayingChange is told when it plays or pauses,
// and controller.current is the player itself, so DJ mode can pause it.
export function SpotifyPlayer({ trackId, controller, onPlayingChange }) {
  const box = useRef(null)

  useEffect(() => {
    const wrapper = box.current
    const place = document.createElement('div')   // Spotify replaces this empty div with its player
    wrapper.appendChild(place)
    let player = null
    let stillNeeded = true                          // false when another song is shown before Spotify is ready

    loadSpotifyPlayer().then((spotify) => {
      if (!stillNeeded) return
      spotify.createController(place, { uri: `spotify:track:${trackId}`, width: '100%', height: 80 }, (made) => {
        if (!stillNeeded) return
        player = made
        controller.current = made
        // Playing means: not paused, and not at the end yet (when a preview ends, Spotify still says "not paused")
        player.addListener('playback_update', ({ data }) => onPlayingChange(!data.isPaused && data.position < data.duration))
      })
    })

    // When the song changes or the answer disappears: stop and remove the player
    return () => {
      stillNeeded = false
      onPlayingChange(false)
      controller.current = null
      if (player) player.destroy()
      wrapper.replaceChildren()
    }
  }, [trackId])

  return <div ref={box} className="player" />
}
