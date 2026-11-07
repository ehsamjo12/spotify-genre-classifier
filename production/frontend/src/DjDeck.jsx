import { useEffect, useRef, useState } from 'react'
import { findPreview } from './api.js'

// The DJ settings when nothing is changed
const FLAT = { volume: 1, bass: 0, treble: 0, filter: 0, echo: 0, reverb: 0, speed: 1 }

// Ready-made mixes. Each one changes a few of the settings above.
const PRESETS = [
  { name: 'Bass boost', settings: { bass: 12, volume: 0.9 } },
  { name: 'Slowed + reverb', settings: { speed: 0.8, reverb: 0.6 } },
  { name: 'Nightcore', settings: { speed: 1.25, treble: 4 } },
  { name: 'Underwater', settings: { filter: -0.85, reverb: 0.3 } },
  { name: 'Old radio', settings: { filter: 0.55, bass: -12 } },
]

const percent = (value) => `${Math.round(value * 100)}%`
const decibel = (value) => `${value > 0 ? '+' : ''}${Math.round(value)} dB`

// DJ mode: plays a 30 second preview of the song from iTunes and lets you change how it sounds.
// otherPlaying: Spotify's player started, so this one stops. onStart: this one starts, so Spotify's stops.
// onChange tells the record and the dancer if the music plays, and how fast.
export default function DjDeck({ song, otherPlaying, onStart, onChange }) {
  const [preview, setPreview] = useState(undefined)   // undefined: still looking, null: no preview found
  const [settings, setSettings] = useState(FLAT)
  const [playing, setPlaying] = useState(false)
  const audio = useRef(null)    // the <audio> element that plays the preview
  const sound = useRef(null)    // the Web Audio parts that change the sound, made the first time you press play

  // Look for a preview of the song on iTunes
  useEffect(() => {
    let stillNeeded = true
    findPreview(song.track_name, song.artists).then((found) => { if (stillNeeded) setPreview(found) })
    return () => { stillNeeded = false }
  }, [song])

  // Turning a knob changes the sound right away
  useEffect(() => {
    if (sound.current) setSound(sound.current, settings)
    if (audio.current) audio.current.playbackRate = settings.speed
    onChange({ playing, speed: settings.speed })
  }, [settings, playing])

  // Stop when Spotify's player starts, and when DJ mode is closed
  useEffect(() => {
    if (otherPlaying) audio.current?.pause()
  }, [otherPlaying])
  useEffect(() => () => {
    audio.current?.pause()
    sound.current?.context.close()
    onChange({ playing: false, speed: 1 })
  }, [])

  function change(name, value) {
    setSettings((current) => ({ ...current, [name]: value }))
  }

  async function playOrPause() {
    if (playing) {
      audio.current.pause()
      return
    }
    // Browsers only allow sound after a click, so the sound parts are made here, on the first click
    if (!sound.current) sound.current = makeSound(audio.current)
    setSound(sound.current, settings)
    await sound.current.context.resume()
    onStart()
    audio.current.play()
  }

  // Tape stop: the song slows down until it stops, like a turntable that is switched off
  function tapeStop() {
    const element = audio.current
    const start = performance.now()
    requestAnimationFrame(function slowDown(time) {
      const done = (time - start) / 1000                   // it takes one second
      if (done >= 1) {
        element.pause()
        element.playbackRate = settings.speed               // back to normal for the next play
        return
      }
      element.playbackRate = Math.max(0.07, settings.speed * (1 - done))   // browsers can't go slower than about 0.07
      onChange({ playing: true, speed: element.playbackRate })
      requestAnimationFrame(slowDown)
    })
  }

  if (preview === undefined) return <div className="dj"><p className="muted small">Looking for a preview…</p></div>
  if (preview === null) return <div className="dj"><p className="muted small">No preview found for this song, so DJ mode can't play it.</p></div>

  return (
    <div className="dj">
      {/* crossOrigin before src: iTunes allows our page to change the sound, but only when it asks first */}
      <audio ref={audio} crossOrigin="anonymous" src={preview.url} loop preload="auto"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      <div className="dj-top">
        <button onClick={playOrPause}>{playing ? 'Pause' : 'Play'}</button>
        <button className="light" onClick={tapeStop} disabled={!playing}>Tape stop</button>
        <span className="muted small">30 s preview from iTunes: {preview.name} – {preview.artist}</span>
      </div>

      <div className="knobs">
        <Knob label="Volume" value={settings.volume} start={1} min={0} max={1.5} show={percent} onChange={(v) => change('volume', v)} />
        <Knob label="Bass" value={settings.bass} start={0} min={-15} max={15} show={decibel} onChange={(v) => change('bass', v)} />
        <Knob label="Treble" value={settings.treble} start={0} min={-15} max={15} show={decibel} onChange={(v) => change('treble', v)} />
        <Knob label="Filter" value={settings.filter} start={0} min={-1} max={1} onChange={(v) => change('filter', v)}
          show={(v) => (Math.abs(v) < 0.03 ? 'Off' : v < 0 ? `Low ${percent(-v)}` : `High ${percent(v)}`)} />
        <Knob label="Echo" value={settings.echo} start={0} min={0} max={1} show={percent} onChange={(v) => change('echo', v)} />
        <Knob label="Reverb" value={settings.reverb} start={0} min={0} max={1} show={percent} onChange={(v) => change('reverb', v)} />
      </div>

      <label className="slider">
        <span>Speed</span>
        <input type="range" min="0.5" max="1.5" step="0.01" value={settings.speed}
          onChange={(e) => change('speed', Number(e.target.value))} />
        <span className="value">{settings.speed.toFixed(2)}×</span>
      </label>

      <div className="presets">
        {PRESETS.map((preset) => (
          <button key={preset.name} className="light" onClick={() => setSettings({ ...FLAT, ...preset.settings })}>
            {preset.name}
          </button>
        ))}
        <button className="light" onClick={() => setSettings(FLAT)}>Reset</button>
      </div>
    </div>
  )
}

// A round knob like on a DJ mixer. Drag it up or down (or use the arrow keys) to turn it,
// and double-click it to set it back to where it started.
function Knob({ label, value, start, min, max, show, onChange }) {
  const keep = (v) => Math.min(max, Math.max(min, v))

  function drag(event) {
    const fromY = event.clientY
    const fromValue = value
    function move(e) {
      onChange(keep(fromValue + ((fromY - e.clientY) / 150) * (max - min)))   // 150 pixels turns it all the way
    }
    function stop() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  function pressKey(event) {
    const step = (max - min) / 20
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') onChange(keep(value + step))
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') onChange(keep(value - step))
    else return
    event.preventDefault()   // stops the page from scrolling
  }

  return (
    <div className="knob-box">
      {/* --turn: how far the knob is turned, from 0 (all the way left) to 1 (all the way right) */}
      <div className="knob-ring" style={{ '--turn': (value - min) / (max - min) }}>
        <div className="knob" role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max}
          aria-valuenow={value} aria-valuetext={show(value)}
          onPointerDown={drag} onKeyDown={pressKey} onDoubleClick={() => onChange(start)} />
      </div>
      <span className="small">{label}</span>
      <span className="muted small">{show(value)}</span>
    </div>
  )
}

// The sound goes through a chain of Web Audio parts, like the cables in a DJ booth:
// preview → bass → treble → filter → (the song + echo + reverb) → volume → limiter → speakers
function makeSound(element) {
  element.preservesPitch = false          // faster = higher and slower = lower, like a real turntable
  element.webkitPreservesPitch = false    // the same for older Safari
  const context = new AudioContext()
  const source = context.createMediaElementSource(element)
  const bass = new BiquadFilterNode(context, { type: 'lowshelf', frequency: 150 })
  const treble = new BiquadFilterNode(context, { type: 'highshelf', frequency: 3500 })
  const lowPass = new BiquadFilterNode(context, { type: 'lowpass', frequency: 20000, Q: 1 })
  const highPass = new BiquadFilterNode(context, { type: 'highpass', frequency: 20, Q: 1 })
  const echo = new DelayNode(context, { delayTime: 0.33 })
  const echoAgain = new GainNode(context, { gain: 0.45 })   // how much of the echo echoes again
  const echoLevel = new GainNode(context, { gain: 0 })
  const reverb = new ConvolverNode(context, { buffer: makeRoom(context) })
  const reverbLevel = new GainNode(context, { gain: 0 })
  const volume = new GainNode(context, { gain: 1 })
  // The limiter keeps loud sound (volume up, bass boost) from cracking
  const limiter = new DynamicsCompressorNode(context, { threshold: -3, ratio: 20, attack: 0.003, release: 0.25 })

  source.connect(bass).connect(treble).connect(lowPass).connect(highPass)
  highPass.connect(volume)                                        // the song itself
  highPass.connect(echo).connect(echoLevel).connect(volume)       // the echo
  echo.connect(echoAgain).connect(echo)                           // the echo goes round again, a bit softer
  highPass.connect(reverb).connect(reverbLevel).connect(volume)   // the reverb
  volume.connect(limiter).connect(context.destination)
  return { context, bass, treble, lowPass, highPass, echoLevel, reverbLevel, volume }
}

// Sets the sound parts to the knobs. setTargetAtTime moves there in a few milliseconds, so it doesn't click.
function setSound(sound, settings) {
  const now = sound.context.currentTime
  const go = (setting, value) => setting.setTargetAtTime(value, now, 0.03)
  go(sound.bass.gain, settings.bass)
  go(sound.treble.gain, settings.treble)
  // The filter: to the left it only lets the low sounds through (muffled), to the right only the high ones (thin)
  go(sound.lowPass.frequency, settings.filter < 0 ? 20000 * 0.01 ** -settings.filter : 20000)
  go(sound.highPass.frequency, settings.filter > 0 ? 20 * 100 ** settings.filter : 20)
  go(sound.echoLevel.gain, settings.echo * 0.8)
  go(sound.reverbLevel.gain, settings.reverb * 1.5)
  go(sound.volume.gain, settings.volume)
}

// A made-up echoing room for the reverb: 2.5 seconds of noise that slowly fades out
function makeRoom(context) {
  const room = context.createBuffer(2, context.sampleRate * 2.5, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const samples = room.getChannelData(channel)
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 3
  }
  return room
}
