import { useEffect, useState } from 'react'
import { siApplemusic, siSoundcloud, siSpotify, siYoutubemusic } from 'simple-icons'
import { getCover } from './api.js'

// Artists from the dataset, three per genre, each with one of their songs (Spotify's track_id).
// Their bubbles float slowly behind the page and show that song's album cover, fetched from Spotify.
const ARTISTS = [
  { name: 'Mozart', trackId: '1z0oJ3x3Fb2BWJKRF8HNhx' },
  { name: 'Johann Sebastian Bach', trackId: '2wQriMWlY1LiuAAw64Td3y' },
  { name: 'Frédéric Chopin', trackId: '5E0ae8cM2HQPvNaQMRpQeI' },
  { name: 'Dolly Parton', trackId: '6rFesOvUui282rDwAm8zLo' },
  { name: 'Kacey Musgraves', trackId: '4waVhpVhVC26pybh8ttm2a' },
  { name: 'Johnny Cash', trackId: '28cnXtME493VX9NOw9cIUh' },
  { name: 'Almafuerte', trackId: '70VfAhsPWCKIXO9yc1rKQN' },
  { name: 'Rata Blanca', trackId: '6HHruc9avBu4RLhcRmUZew' },
  { name: 'Stam1na', trackId: '3mrCVBnj3LOOKZLlRoj2MT' },
  { name: 'Eminem', trackId: '7lQ8MOhq6IN2w8EYcFNSUk' },
  { name: 'Kendrick Lamar', trackId: '3GCdLUSnKSMJhs4Tj6CV3s' },
  { name: 'Drake', trackId: '5ZKG94fnjiuMH5yrC5S9lS' },
  { name: 'Louis Armstrong', trackId: '1qCQTy0fTXerET4x8VHyr9' },
  { name: 'Ella Fitzgerald', trackId: '0uZ14vmYf9O5LirYjN84GL' },
  { name: 'John Coltrane', trackId: '6vP4An3CkuPl1cpYMSR07u' },
  { name: 'Charlotte de Witte', trackId: '6cKTcheUC3OHDMI8QMKp08' },
  { name: 'Boris Brejcha', trackId: '1eV81a6H4xDdpi8r2C4tQT' },
  { name: 'Amelie Lens', trackId: '5UsfWcP6SThHlZ4oAgx7ge' },
]

// The logos of four music apps. They come from the "simple-icons" package, which has logos as drawings (SVG):
// logo.path is the drawing and logo.title the name, for example "Spotify".
const LOGOS = [siSpotify, siApplemusic, siYoutubemusic, siSoundcloud]

export default function ArtistBackground() {
  return (
    <div className="artist-background" aria-hidden="true">
      {ARTISTS.map((artist, i) => (
        <Bubble key={artist.name} index={i} name={artist.name}>
          <ArtistCover artist={artist} />
        </Bubble>
      ))}
      {/* The logos are numbered after the artists, so every bubble still gets its own place */}
      {LOGOS.map((logo, i) => (
        <Bubble key={logo.title} index={ARTISTS.length + i} name={logo.title}>
          <svg className="logo" viewBox="0 0 24 24"><path d={logo.path} /></svg>
        </Bubble>
      ))}
    </div>
  )
}

// One glass ball that floats up behind the page, with what is put inside it (children) and a name under it
function Bubble({ index, name, children }) {
  const size = 64 + (index % 4) * 20   // 64, 84, 104 or 124 pixels

  // Every bubble gets its own place, size and speed from its number, so they don't move together
  const style = {
    left: `${(index * 41) % 97}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${26 + (index % 5) * 7}s`,
    animationDelay: `${-index * 4}s`,
    '--y': `${(index * 53) % 90}%`,    // where it stays when animations are turned off
  }

  return (
    <div className="bubble" style={style}>
      {children}
      <span className="bubble-name">{name}</span>
    </div>
  )
}

// The album cover when Spotify has answered, the initials until then (or without internet)
function ArtistCover({ artist }) {
  const [cover, setCover] = useState(null)

  // Ask Spotify for the album cover once, when the bubble appears
  useEffect(() => {
    getCover(artist.trackId).then(setCover)
  }, [artist.trackId])

  if (cover) return <img src={cover} alt="" />
  const initials = artist.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  return <span className="initials">{initials}</span>
}
