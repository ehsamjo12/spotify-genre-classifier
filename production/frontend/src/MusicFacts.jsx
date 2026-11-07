import { useState } from 'react'

// Music history, oldest first. It floats up on the left side of the page, like a timeline.
const HISTORY = [
  { label: 'Stone Age', text: 'The oldest instruments ever found: flutes of bird bone and mammoth ivory, over 40,000 years old' },
  { label: '1400 BC', text: 'The oldest written-down song we know, a hymn from ancient Syria' },
  { label: 'Ancient Rome', text: 'Gladiator fights had live music, with horns and a water organ' },
  { label: 'Around 1030', text: 'A monk names the notes ut, re, mi, fa, sol, la. Ut later becomes do' },
  { label: 'Around 1700', text: 'The piano is invented in Italy. Its full name, pianoforte, means soft-loud' },
  { label: '1764', text: 'Mozart writes his first symphony, at the age of eight' },
  { label: '1824', text: "Beethoven's Ninth Symphony is played for the first time, when he is almost completely deaf" },
  { label: '1860', text: 'The oldest known recording of a song. Nobody can play it back until 2008' },
  { label: '1877', text: 'Thomas Edison invents the phonograph, the first machine that can record and play back sound' },
  { label: '1917', text: 'The first jazz record comes out, by a band from New Orleans' },
  { label: '1925', text: 'The Grand Ole Opry starts. The country show is still on the radio every week' },
  { label: '1959', text: 'Miles Davis releases Kind of Blue, often called the best-selling jazz album ever' },
  { label: '1968', text: 'Johnny Cash records a live album inside Folsom Prison' },
  { label: '1970', text: "Black Sabbath's first album, often called the first heavy metal album" },
  { label: '1973', text: 'Hip-hop is born at a party in the Bronx, New York' },
  { label: '1980s', text: 'Techno is born in Detroit, made with drum machines and synthesizers' },
  { label: '1989', text: "Berlin's first Love Parade has about 150 people. Ten years later, over a million come" },
  { label: '2008', text: 'Spotify launches in Sweden. The songs in this app come from Spotify' },
  { label: '2018', text: 'Kendrick Lamar is the first rapper to win the Pulitzer Prize for Music' },
]

// Fun facts, on the right side of the page. .map() turns every sentence into the same shape as above.
const FUN_FACTS = [
  'Johann Sebastian Bach had 20 children',
  'Finland has more heavy metal bands per person than any other country',
  'Ella Fitzgerald went on stage at 17 to dance, got nervous, sang instead, and won',
  "Eminem's Rap God fits 1,560 words into about six minutes",
  'A song that gets stuck in your head is called an earworm',
  'Dolly Parton says she wrote Jolene and I Will Always Love You on the same day',
  'The TR-808 drum machine flopped in shops, then shaped hip-hop and techno',
  "Chopin's heart is buried in Warsaw, and the rest of him in Paris",
  "Black Sabbath's guitarist lost two fingertips at work, and made new ones from a plastic bottle",
  'Louis Armstrong was called Satchmo, short for satchel mouth',
  'Goosebumps from music come with a rush of dopamine in your brain',
  'Johnny Cash always dressed in black, and wrote the song Man in Black to explain why',
  'Vivaldi was a priest with red hair, so people called him the Red Priest',
  'A John Cage organ piece, played very slowly in a German church, will end in the year 2640',
].map((text) => ({ label: 'Fun fact', text }))

export default function MusicFacts() {
  return (
    <div className="facts-background" aria-hidden="true">
      {/* Three places on each side, so three facts float up on each side at the same time */}
      {[0, 1, 2].map((place) => <Fact key={'history' + place} facts={HISTORY} place={place} side="left" />)}
      {[0, 1, 2].map((place) => <Fact key={'fun' + place} facts={FUN_FACTS} place={place} side="right" />)}
    </div>
  )
}

// One floating fact. It takes 60 seconds to float up (.fact in App.css), and the three places on a side
// start 20 seconds apart. Each time the fact has left the top of the screen, it comes back at the bottom
// as a new one: three further in the list, because the other two places show the facts in between.
function Fact({ facts, place, side }) {
  const [round, setRound] = useState(0)        // how many times this place has floated up
  const fact = facts[(place + round * 3) % facts.length]

  const style = {
    [side]: '4%',                                 // "left: 4%" or "right: 4%"
    textAlign: side,
    // A minus means it has already been floating for that long when the page opens.
    // The right side is 10 seconds behind the left, so the facts don't line up.
    animationDelay: `${place * 20 - (side === 'left' ? 50 : 40)}s`,
    '--y': `${15 + place * 30}%`,                 // where it stays when animations are turned off
  }

  return (
    <p className="fact" style={style} onAnimationIteration={() => setRound(round + 1)}>
      <span className="fact-label">{fact.label}</span>
      {fact.text}
    </p>
  )
}
