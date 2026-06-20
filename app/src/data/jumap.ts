// Jumap — Jun's personal music critic. Each *artist* is a floating pastel
// bubble; bubbles cluster by the artist's primary genre. The bubble's size is
// driven by the artist's best song (lowest tier = T1 flagship). Tap an artist
// and the songs beneath them slide into the detail card.

export type Tier = 1 | 2 | 3 | 4 | 5
export const TIERS: Tier[] = [1, 2, 3, 4, 5]

/** Within a tier, finer 4-step ranking — 0 = tier base, +3 = top of tier.
 *  Rendered as 0–3 small accent stars trailing the main tier stars. */
export type SubTier = 0 | 1 | 2 | 3
export const SUB_TIER_MAX = 3 as const

export interface Song {
  title: string
  tier: Tier
  /** 0–3, finer position inside the tier (0 = tier base, 3 = top).
   *  Defaults to 0 when omitted, so existing entries keep their look. */
  subTier?: SubTier
  // Each song can be tagged with one or more genres. The first one wins for
  // overall artist placement when the artist has no explicit primary genre.
  genres: string[]
  /** Release year (single, EP, or album drop) — shown in the Jumap modal. */
  year?: number
  /** Album / EP / single bundle this song was packaged in. Optional — a
   *  song released only as a stand-alone digital single can omit it. */
  album?: string
  /** Names of artists featured on the track. Must match an Artist.name in
   *  the roster so the Jumap layout can pull the song bubble toward each
   *  featured artist's planet (the "shared orbit" effect). */
  features?: string[]
  note?: string  // optional review fragment
}

export interface Artist {
  name: string
  // Optional: pin the artist to a specific genre cluster. Otherwise the most
  // common genre across their songs is used.
  primaryGenre?: string
  /** Country / region key — overrides the genre→country inference for
   *  Country view. Lets us split "Western" into US / UK / Canada / etc.
   *  Falls back to countryOfGenre() when omitted. */
  origin?: string
  /** Groups this artist is a member of (e.g. Sho Sakurai memberOf ['ARASHI'],
   *  Lilas memberOf ['YOASOBI']). Each name must match an Artist.name in
   *  the roster so a "member" bond can be drawn from solo planet to group
   *  planet — a distinct style from `features`. */
  memberOf?: string[]
  // Optional artist portrait (Wikipedia Commons URL or any hot-linkable
  // image). If absent, the bubble falls back to the artist's top song's
  // album art via the album-art lookup.
  photoUrl?: string
  songs: Song[]
}

export interface GenreSpec {
  key: string
  label: string
  // Soft pastel hex used as the bubble tint. Stays light enough to feel
  // translucent against the page even at high fill opacity.
  color: string
}

// Coarse "country / region" grouping — sits behind the per-genre territory
// blobs as a wider tinted backdrop so the user can read the overall map at
// a glance even when 60+ artists are on screen.
export interface CountrySpec {
  key: string
  label: string
  color: string
}
// Vivid, well-separated hues so adjacent territories read as visibly
// different at a glance. They're still toned-down enough that an
// additive-blend overlap looks like a colour mix rather than two
// washed-out clouds bleeding into the same beige.
export const COUNTRIES: CountrySpec[] = [
  { key: 'jp',    label: 'Japan',       color: '#ff6d8d' },  // coral pink
  { key: 'kr',    label: 'Korea',       color: '#5aa3ff' },  // sky blue
  { key: 'us',    label: 'USA',         color: '#ffcb52' },  // golden
  { key: 'uk',    label: 'UK',          color: '#9b7fff' },  // violet
  { key: 'ca',    label: 'Canada',      color: '#ff8a4c' },  // orange
  { key: 'au',    label: 'Australia',   color: '#e6c93a' },  // amber
  { key: 'nz',    label: 'New Zealand', color: '#5ed896' },  // mint
  { key: 'tw',    label: 'Taiwan',      color: '#5fd9c4' },  // teal
  { key: 'nl',    label: 'Netherlands', color: '#ff7a5a' },  // persimmon
  { key: 'other', label: 'Other',       color: '#a4abb6' },
]
const COUNTRY_LOOKUP = Object.fromEntries(COUNTRIES.map((c) => [c.key, c]))
export function countryFor(key: string): CountrySpec {
  return COUNTRY_LOOKUP[key.toLowerCase()] ?? COUNTRY_LOOKUP['other']
}
// Default genre→country mapping used when an artist has no explicit
// `origin` field. Western genres fall back to "us" — most of the roster
// is American — and per-artist overrides nail the UK/Canada/etc cases.
const COUNTRY_OF_GENRE: Record<string, string> = {
  jpop:    'jp',
  anime:   'jp',
  kpop:    'kr',
  khiphop: 'kr',
  pop:     'us',
  hiphop:  'us',
  rage:    'us',
  rock:    'us',
  rnb:     'us',
  edm:     'us',
  other:   'other',
}
export function countryOfGenre(genreKey: string): string {
  return COUNTRY_OF_GENRE[genreKey.toLowerCase()] ?? 'other'
}
export function countryOfArtist(a: Artist): string {
  if (a.origin) return a.origin.toLowerCase()
  return countryOfGenre(a.primaryGenre ?? artistPrimaryGenre(a))
}

export const GENRES: GenreSpec[] = [
  { key: 'pop',     label: 'Pop',      color: '#ffe3ee' },
  { key: 'jpop',    label: 'J-Pop',    color: '#ffd6e7' },
  { key: 'kpop',    label: 'K-Pop',    color: '#d6ecff' },
  { key: 'hiphop',  label: 'Hip-Hop',  color: '#ffe8c4' },
  { key: 'khiphop', label: 'K-Hip-Hop', color: '#ffd9a8' },
  { key: 'rage',    label: 'Rage',     color: '#ffc4b8' },
  { key: 'anime',   label: 'Anime',    color: '#dcf5dc' },
  { key: 'rock',    label: 'Rock',     color: '#dcdcff' },
  { key: 'rnb',     label: 'R&B',      color: '#f3dcff' },
  { key: 'edm',     label: 'EDM',      color: '#fff5c4' },
  { key: 'other',   label: 'Other',    color: '#ececec' },
]

const GENRE_LOOKUP = Object.fromEntries(GENRES.map((g) => [g.key, g]))
export function genreFor(key: string): GenreSpec {
  return GENRE_LOOKUP[key.toLowerCase()] ?? GENRE_LOOKUP['other']
}

// Tier-driven base radius; combined with song-count bonus inside bubbleRadius.
// Sizes scaled down (~25%) so the cluster doesn't overlap as readily; collision
// relaxation in JumapPage takes care of any residual overlap.
const TIER_BASE: Record<Tier, number> = {
  1: 58,
  2: 48,
  3: 40,
  4: 34,
  5: 28,
}

export const TIER_LABEL: Record<Tier, string> = {
  1: 'T1', 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5',
}

export function bestTier(a: Artist): Tier {
  if (a.songs.length === 0) return 5
  return a.songs.reduce<Tier>((best, s) => (s.tier < best ? s.tier : best), 5)
}

export function bubbleRadius(a: Artist): number {
  const base = TIER_BASE[bestTier(a)]
  const bonus = Math.min(12, (a.songs.length - 1) * 3)
  return base + Math.max(0, bonus)
}

export function artistPrimaryGenre(a: Artist): string {
  if (a.primaryGenre) return a.primaryGenre.toLowerCase()
  if (a.songs.length === 0) return 'other'
  const counts = new Map<string, number>()
  for (const s of a.songs) for (const g of s.genres) {
    const k = g.toLowerCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  let bestKey = 'other'
  let bestCount = -1
  for (const [k, n] of counts) if (n > bestCount) { bestKey = k; bestCount = n }
  return bestKey
}

export function artistGenres(a: Artist): string[] {
  const set = new Set<string>()
  for (const s of a.songs) for (const g of s.genres) set.add(g.toLowerCase())
  return [...set]
}

export function groupArtistsByGenre(items: Artist[]): Map<string, Artist[]> {
  const out = new Map<string, Artist[]>()
  for (const a of items) {
    const k = artistPrimaryGenre(a)
    const arr = out.get(k) ?? []
    arr.push(a)
    out.set(k, arr)
  }
  return out
}

export function presentGenres(items: Artist[]): GenreSpec[] {
  const set = new Set<string>()
  for (const a of items) for (const g of artistGenres(a)) set.add(g)
  return GENRES.filter((g) => set.has(g.key))
}

// Sort by best tier first, then song count, then alphabetical.
export function sortArtists(items: Artist[]): Artist[] {
  return [...items].sort((a, b) => {
    const t = bestTier(a) - bestTier(b)
    if (t !== 0) return t
    const c = b.songs.length - a.songs.length
    if (c !== 0) return c
    return a.name.localeCompare(b.name)
  })
}

// Starter roster from Jun. Append freely; the map picks new entries up.
export const artists: Artist[] = [
  {
    name: 'ARASHI',
    primaryGenre: 'jpop',
    songs: [
      { title: 'A·RA·SHI',         tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'Ready To Fly',     tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'LOVE PARADE',      tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'Love so sweet',    tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'Monster',          tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'One Love',         tier: 1, subTier: 3, genres: ['jpop'] },
      { title: 'Five',             tier: 1, subTier: 2, genres: ['jpop'] },
      { title: 'Happiness',        tier: 1, subTier: 2, genres: ['jpop'] },
      { title: 'Only Love',        tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'Turning Up',       tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'JAM',              tier: 1, subTier: 0, genres: ['jpop'] },
      { title: 'Yes? No?',         tier: 1, subTier: 0, genres: ['jpop'] },
      { title: 'Oh Yeah!',         tier: 1, subTier: 2, genres: ['jpop'] },
      { title: 'Zero-G',           tier: 2, subTier: 1, genres: ['jpop'] },
      { title: 'Dear Snow',        tier: 3, subTier: 0, genres: ['jpop'] },
      { title: 'Endless Game',     tier: 3, subTier: 1, genres: ['jpop'] },
      { title: 'Your Eyes',        tier: 4, subTier: 2, genres: ['jpop'] },
      { title: '身長差のない恋人',  tier: 1, subTier: 2, genres: ['jpop'] },
      { title: 'Crazy Moon~キミ・ハ・ムテキ~', tier: 2, subTier: 3, genres: ['jpop'] },
      { title: 'BRAVE',            tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'FUNKY',                  tier: 2, subTier: 3, genres: ['jpop'] },
      { title: 'サヨナラのあとで',        tier: 2, subTier: 3, genres: ['jpop'] },
      { title: 'Believe',          tier: 2, subTier: 0, genres: ['jpop'] },
      // year / album: please confirm
      { title: 'WISH',             tier: 3, subTier: 0, genres: ['jpop'] },
      { title: 'Troublemaker',     tier: 3, subTier: 0, genres: ['jpop'] },
      { title: 'Summer Splash!',   tier: 3, genres: ['jpop'] },
      { title: 'Green Light',      tier: 3, subTier: 2, genres: ['jpop'] },
      { title: 'Whenever you call', tier: 4, subTier: 2, genres: ['jpop'] },
      { title: 'IN THE SUMMER',     tier: 4, subTier: 2, genres: ['jpop'] },
      { title: 'Raise Your Hands', tier: 4, genres: ['jpop'] },
      { title: 'DANGAN-LINER',     tier: 3, subTier: 1, genres: ['jpop'] },
      { title: 'Turning Up (R3HAB Remix)', tier: 3, subTier: 0, genres: ['jpop', 'edm'], features: ['R3HAB'] },
      { title: 'Face Down : Reborn', tier: 5, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'King & Prince',
    primaryGenre: 'jpop',
    songs: [
      { title: 'TraceTrace',  tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'HEART',       tier: 2, genres: ['jpop'], year: 2025 },
      { title: 'koi-wazurai', tier: 3, genres: ['jpop'], year: 2020, album: 'L&' },
    ],
  },
  {
    name: 'Hey! Say! JUMP',
    primaryGenre: 'jpop',
    songs: [
      // year / album: please confirm
      { title: 'Muah Muah',  tier: 2, genres: ['jpop'] },
      { title: 'White Love', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'KAT-TUN',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Real Face', tier: 3, genres: ['jpop'], year: 2006, album: 'Best of KAT-TUN' },
    ],
  },
  {
    name: 'timelesz',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'ぎゅっと', tier: 2, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'aespa',
    primaryGenre: 'kpop',
    songs: [
      // 'WDA': please confirm the full title + year + album
      { title: 'WDA',   tier: 3, genres: ['kpop'], features: ['G-DRAGON'] },
      { title: 'Spicy', tier: 2, subTier: 3, genres: ['kpop'], year: 2023, album: 'MY WORLD' },
      { title: 'Girls', tier: 3, subTier: 1, genres: ['kpop'], year: 2022, album: 'Girls' },
    ],
  },
  {
    name: 'ILLIT',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Magnetic',                          tier: 1, genres: ['kpop'], year: 2024, album: 'SUPER REAL ME' },
      { title: '빌려온 고양이 (Do the Dance)',       tier: 2, subTier: 2, genres: ['kpop'] },
      { title: 'Almond Chocolate',                  tier: 3, subTier: 2, genres: ['kpop'] },
      { title: "It's Me",                           tier: 5, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'IVE',
    primaryGenre: 'kpop',
    songs: [
      { title: 'HEYA',     tier: 3, subTier: 3, genres: ['kpop'], year: 2024, album: 'IVE SWITCH' },
      { title: 'Bang Bang', tier: 2, subTier: 2, genres: ['kpop'] },
      { title: 'ELEVEN',    tier: 2, subTier: 2, genres: ['kpop'], year: 2021, album: 'ELEVEN' },
    ],
  },
  {
    name: 'NewJeans',
    primaryGenre: 'kpop',
    songs: [
      { title: 'OMG',        tier: 1, subTier: 1, genres: ['kpop'], year: 2023, album: 'NewJeans ‘OMG’' },
      { title: 'New Jeans',  tier: 1, subTier: 2, genres: ['kpop'], year: 2024, album: 'How Sweet' },
      { title: 'Get Up',     tier: 1, subTier: 2, genres: ['kpop'], year: 2023, album: 'Get Up' },
      { title: 'GODS',       tier: 1, subTier: 0, genres: ['kpop'], year: 2023 },
      { title: 'Attention',  tier: 2, subTier: 3, genres: ['kpop'], year: 2022, album: 'New Jeans' },
      { title: 'Hype Boy',   tier: 2, subTier: 2, genres: ['kpop'], year: 2022, album: 'New Jeans' },
      { title: 'How Sweet',  tier: 2, subTier: 1, genres: ['kpop'], year: 2024, album: 'How Sweet' },
    ],
  },
  {
    name: 'ReoNa',
    primaryGenre: 'anime',
    songs: [
      { title: 'ANIMA', tier: 2, genres: ['anime'] },
    ],
  },
  {
    name: 'Drake',
    primaryGenre: 'hiphop',
    origin: 'ca',
    songs: [
      { title: 'Nokia',             tier: 2, genres: ['hiphop'] },
      { title: '2 Hard 4 The Radio', tier: 2, subTier: 2, genres: ['hiphop'] },
      { title: "God's Plan",        tier: 3, genres: ['hiphop'] },
    ],
  },
  {
    name: 'Kendrick Lamar',
    primaryGenre: 'hiphop',
    songs: [
      { title: 'Not Like Us', tier: 2, subTier: 3, genres: ['hiphop'], year: 2024 },
      { title: 'HUMBLE.',     tier: 2, subTier: 3, genres: ['hiphop'], year: 2017, album: 'DAMN.' },
      { title: 'Luther',      tier: 2, subTier: 3, genres: ['hiphop', 'rnb'], features: ['SZA'] },
      { title: 'N95',         tier: 3, subTier: 0, genres: ['hiphop'], year: 2022, album: 'Mr. Morale & The Big Steppers' },
    ],
  },
  {
    name: 'Masked Wolf',
    primaryGenre: 'hiphop',
    origin: 'au',
    songs: [
      { title: 'Astronaut In The Ocean', tier: 2, subTier: 0, genres: ['hiphop'], year: 2019, album: 'Astronomical' },
    ],
  },
  {
    name: 'Travis Scott',
    primaryGenre: 'rage',
    songs: [
      { title: 'FE!N',       tier: 1, subTier: 1, genres: ['rage', 'hiphop'] },
      { title: 'SICKO MODE', tier: 1, subTier: 0, genres: ['hiphop', 'rage'], year: 2018, album: 'Astroworld', features: ['Drake'] },
    ],
  },
  {
    name: 'Lil Uzi Vert',
    primaryGenre: 'hiphop',
    songs: [
      { title: '20 Min', tier: 2, subTier: 3, genres: ['hiphop'], year: 2017, album: 'Luv Is Rage 2' },
    ],
  },
  {
    name: 'Post Malone',
    primaryGenre: 'pop',
    songs: [
      { title: 'I Like You (A Happier Song)', tier: 3, genres: ['pop', 'hiphop'] },
    ],
  },
  {
    name: 'Doja Cat',
    primaryGenre: 'pop',
    songs: [
      { title: 'Paint The Town Red', tier: 3, subTier: 1, genres: ['pop', 'hiphop'], year: 2023, album: 'Scarlet' },
    ],
  },
  {
    name: 'Sik-K',
    primaryGenre: 'hiphop',
    songs: [
      { title: 'LOV3',        tier: 1, subTier: 2, genres: ['hiphop'] },
      { title: 'OUTTA SPACE', tier: 3, subTier: 1, genres: ['hiphop'] },
    ],
  },
  {
    name: 'Ariana Grande',
    primaryGenre: 'pop',
    songs: [
      { title: 'thank u, next', tier: 4, subTier: 2, genres: ['pop'], year: 2018, album: 'thank u, next' },
    ],
  },
  {
    name: 'Mrs. GREEN APPLE',
    primaryGenre: 'jpop',
    songs: [
      { title: 'ライラック', tier: 3, subTier: 2, genres: ['jpop', 'rock'], year: 2024 },
    ],
  },
  {
    name: 'Beenzino',
    primaryGenre: 'khiphop',
    songs: [
      { title: '990',         tier: 2, subTier: 1, genres: ['khiphop'] },
      { title: 'Time Travel', tier: 2, subTier: 3, genres: ['khiphop'] },
      { title: 'Radio',       tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },

  // ===== K-Pop additions =====
  {
    name: 'SHINee',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Stand By Me', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'KARA',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Pretty Girl', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'NCT WISH',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Surf', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'NCT U',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Kangaroo', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'TXT',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Force', tier: 1, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'JENNIE',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Love Hangover', tier: 3, subTier: 2, genres: ['kpop'], features: ['Dominic Fike'] },
    ],
  },
  {
    name: 'QWER',
    primaryGenre: 'kpop',
    songs: [
      { title: '고민중독', tier: 2, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'TVXQ',
    primaryGenre: 'kpop',
    songs: [
      { title: '풍선',           tier: 1, subTier: 0, genres: ['kpop'] },
      { title: 'Show Me Your Love', tier: 2, subTier: 2, genres: ['kpop'], features: ['Super Junior'] },
      { title: 'Tonight',         tier: 3, subTier: 3, genres: ['kpop'] },
      { title: '믿어요',          tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'Super Junior',
    primaryGenre: 'kpop',
    songs: [],
  },
  {
    name: 'PSY',
    primaryGenre: 'kpop',
    songs: [
      { title: '강남스타일', tier: 4, subTier: 1, genres: ['kpop'], year: 2012, album: '강남스타일' },
    ],
  },
  {
    name: 'Wonder Girls',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Tell Me', tier: 2, subTier: 1, genres: ['kpop'], year: 2007 },
    ],
  },
  {
    name: 'ZICO',
    primaryGenre: 'kpop',
    songs: [
      { title: 'DUET', tier: 2, subTier: 1, genres: ['kpop'], features: ['Lilas'] },
    ],
  },
  {
    name: 'Lilas',
    primaryGenre: 'jpop',
    origin: 'jp',
    // Member of YOASOBI — special bond drawn to the group planet.
    memberOf: ['YOASOBI'],
    songs: [],
  },
  {
    name: 'YOASOBI',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [],
  },
  {
    name: 'Sho Sakurai',
    primaryGenre: 'jpop',
    origin: 'jp',
    // Member of ARASHI — special bond drawn to ARASHI planet.
    memberOf: ['ARASHI'],
    songs: [
      { title: 'come again *Reloaded', tier: 1, subTier: 0, genres: ['jpop'], features: ['m-flo'] },
    ],
  },
  {
    name: 'm-flo',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'tell me tell me', tier: 2, subTier: 3, genres: ['jpop'], features: ['Sik-K', 'eill', 'Taichi Mukai'] },
    ],
  },
  {
    name: 'Lady Gaga',
    primaryGenre: 'pop',
    songs: [
      { title: 'Rain On Me', tier: 2, subTier: 2, genres: ['pop'], year: 2020, album: 'Chromatica', features: ['Ariana Grande'] },
    ],
  },
  {
    name: 'Carly Rae Jepsen',
    primaryGenre: 'pop',
    origin: 'ca',
    songs: [
      { title: 'Call Me Maybe', tier: 3, subTier: 1, genres: ['pop'], year: 2011 },
    ],
  },
  {
    name: 'Owl City',
    primaryGenre: 'pop',
    songs: [
      { title: 'Good Time', tier: 5, subTier: 2, genres: ['pop'], year: 2012, features: ['Carly Rae Jepsen'] },
    ],
  },
  {
    name: 'BOYNEXTDOOR',
    primaryGenre: 'kpop',
    songs: [
      { title: '오늘만 I LOVE YOU', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'SEVENTEEN',
    primaryGenre: 'kpop',
    songs: [
      { title: '음악의 신', tier: 2, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    name: '혁오',
    primaryGenre: 'kpop',
    songs: [
      { title: '와리가리', tier: 2, subTier: 0, genres: ['kpop', 'rock'] },
    ],
  },
  {
    name: '정국',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Standing Next to You', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'BTS',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Dynamite', tier: 1, subTier: 0, genres: ['kpop'], year: 2020, album: 'BE' },
    ],
  },
  {
    name: 'JYJ',
    primaryGenre: 'kpop',
    songs: [
      { title: '찾았다', tier: 2, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'Peppertones',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Superfantastic', tier: 2, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    name: '신지',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Always', tier: 1, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'NS 윤지',
    primaryGenre: 'kpop',
    songs: [
      { title: 'If You Love Me', tier: 4, subTier: 0, genres: ['kpop'], features: ['박재범'] },
    ],
  },
  {
    name: 'Hearts2Hearts',
    primaryGenre: 'kpop',
    songs: [
      { title: 'STYLE', tier: 2, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'DEAN',
    primaryGenre: 'rnb',
    songs: [
      { title: '넘어와', tier: 2, subTier: 0, genres: ['rnb', 'kpop'], features: ['백예린'] },
    ],
  },

  // ===== K-Hip-Hop additions =====
  {
    name: 'Effie',
    primaryGenre: 'khiphop',
    songs: [
      { title: '2025기침', tier: 2, subTier: 0, genres: ['khiphop'] },
      { title: 'down',     tier: 3, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: 'EsDeeKid',
    primaryGenre: 'khiphop',
    songs: [
      { title: '4 Raws', tier: 2, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: '나우아임영',
    primaryGenre: 'khiphop',
    songs: [
      { title: 'AH', tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },
  {
    name: 'Jazzyfact',
    primaryGenre: 'khiphop',
    songs: [
      { title: '하루종일', tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },
  {
    name: 'SYSTEM SEOUL',
    primaryGenre: 'khiphop',
    songs: [
      { title: 'SS', tier: 2, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: 'Young B',
    primaryGenre: 'khiphop',
    songs: [
      { title: '아침에', tier: 2, subTier: 0, genres: ['khiphop'], features: ['Bryn'] },
    ],
  },
  {
    name: 'Kid Milli',
    primaryGenre: 'khiphop',
    songs: [
      { title: '25', tier: 2, subTier: 1, genres: ['khiphop'], features: ['Young B'] },
    ],
  },

  // ===== J-Pop additions =====
  {
    name: 'V6',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Can do! Can go!', tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'Super Powers',    tier: 2, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Buono!',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Kiss! Kiss! Kiss!', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Kenshi Yonezu',
    primaryGenre: 'jpop',
    songs: [
      { title: 'IRIS OUT', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Number_i',
    primaryGenre: 'jpop',
    songs: [
      { title: 'BON', tier: 1, subTier: 0, genres: ['jpop'] },
    ],
  },
  {
    name: 'EXILE',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Choo Choo Train', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'SEKAI NO OWARI',
    primaryGenre: 'jpop',
    songs: [
      { title: 'ターコイズ', tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'RPG',        tier: 2, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Official髭男dism',
    primaryGenre: 'jpop',
    songs: [
      { title: '犬かキャットかで死ぬまで喧嘩しよう!', tier: 1, subTier: 2, genres: ['jpop'] },
    ],
  },

  // ===== Anime =====
  {
    name: 'ClariS',
    primaryGenre: 'anime',
    songs: [
      { title: 'Irony', tier: 3, subTier: 0, genres: ['anime'] },
    ],
  },
  {
    name: 'Hiroshi Kitadani',
    primaryGenre: 'anime',
    songs: [
      { title: 'ウィーアー！', tier: 1, subTier: 0, genres: ['anime'] },
    ],
  },
  {
    name: '5050',
    primaryGenre: 'anime',
    songs: [
      { title: 'Jungle P', tier: 1, subTier: 0, genres: ['anime'] },
    ],
  },

  // ===== Hip-Hop (Western) =====
  {
    name: 'DJ Khaled',
    primaryGenre: 'hiphop',
    songs: [
      { title: 'POPSTAR', tier: 2, subTier: 2, genres: ['hiphop'], features: ['Drake'] },
    ],
  },
  {
    name: 'The Notorious B.I.G.',
    primaryGenre: 'hiphop',
    songs: [
      { title: 'Hypnotize', tier: 3, subTier: 1, genres: ['hiphop'], year: 1997, album: 'Life After Death' },
    ],
  },
  {
    name: 'Nas',
    primaryGenre: 'hiphop',
    songs: [
      { title: 'N.Y. State of Mind', tier: 3, subTier: 0, genres: ['hiphop'], year: 1994, album: 'Illmatic' },
    ],
  },

  // ===== Pop =====
  {
    name: 'Sabrina Carpenter',
    primaryGenre: 'pop',
    songs: [
      { title: 'Espresso', tier: 2, subTier: 3, genres: ['pop'], year: 2024, album: 'Short n’ Sweet' },
    ],
  },
  {
    name: 'Dominic Fike',
    primaryGenre: 'pop',
    songs: [
      { title: 'Pasture Child', tier: 4, subTier: 3, genres: ['pop', 'rock'] },
    ],
  },
  {
    name: 'Karencici',
    primaryGenre: 'pop',
    origin: 'tw',
    songs: [
      { title: 'Hard to say', tier: 3, subTier: 1, genres: ['pop'] },
    ],
  },
  {
    name: 'Chelsea Collins',
    primaryGenre: 'pop',
    songs: [
      { title: '07 Britney', tier: 3, subTier: 3, genres: ['pop'] },
    ],
  },

  // ===== Rock =====
  {
    name: 'The Beatles',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: 'Let It Be', tier: 4, subTier: 2, genres: ['rock'], year: 1970, album: 'Let It Be' },
    ],
  },
  {
    name: 'Redbone',
    primaryGenre: 'rock',
    songs: [
      { title: 'Come and Get Your Love', tier: 3, subTier: 3, genres: ['rock'], year: 1974, album: 'Wovoka' },
    ],
  },
  {
    name: 'Avril Lavigne',
    primaryGenre: 'rock',
    origin: 'ca',
    songs: [
      { title: 'Sk8er Boi', tier: 1, subTier: 0, genres: ['rock', 'pop'], year: 2002, album: 'Let Go' },
    ],
  },
  {
    name: 'Steriogram',
    primaryGenre: 'rock',
    origin: 'nz',
    songs: [
      { title: 'Walkie Talkie Man', tier: 3, subTier: 3, genres: ['rock'] },
    ],
  },

  // ===== R&B =====
  {
    name: 'SZA',
    primaryGenre: 'rnb',
    songs: [
      { title: 'Snooze',   tier: 2, subTier: 0, genres: ['rnb'], year: 2022, album: 'SOS' },
      { title: '30 For 30', tier: 3, subTier: 3, genres: ['rnb'], features: ['Kendrick Lamar'] },
    ],
  },
  {
    name: 'The Weeknd',
    primaryGenre: 'rnb',
    origin: 'ca',
    songs: [
      { title: 'Out of Time', tier: 1, subTier: 0, genres: ['rnb'], year: 2022, album: 'Dawn FM' },
      { title: 'Die for You', tier: 2, subTier: 3, genres: ['rnb'], year: 2016, album: 'Starboy' },
    ],
  },
  {
    name: 'Jackson 5',
    primaryGenre: 'rnb',
    songs: [
      { title: 'I Want You Back', tier: 3, subTier: 2, genres: ['rnb'], year: 1969 },
    ],
  },
  {
    name: 'Bruno Mars',
    primaryGenre: 'rnb',
    songs: [
      { title: 'Skate', tier: 1, subTier: 3, genres: ['rnb', 'pop'], year: 2021, album: 'An Evening with Silk Sonic', features: ['Anderson .Paak'] },
    ],
  },
  {
    name: 'Anderson .Paak',
    primaryGenre: 'rnb',
    // No song entries yet — exists in the roster so the Silk Sonic
    // collaboration draws a feature bond from "Skate" to this planet.
    songs: [],
  },

  // ===== Empty-roster artists — exist as bond targets for songs that
  // feature them so the force layout pulls collab tracks toward their
  // planet and a feature line is drawn. Songs can be added later. =====
  {
    name: 'G-DRAGON',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Missing You', tier: 5, subTier: 2, genres: ['kpop'], features: ['김윤아'] },
    ],
  },
  {
    name: '박재범',
    primaryGenre: 'khiphop',
    songs: [],
  },
  {
    name: 'Bryn',
    primaryGenre: 'khiphop',
    songs: [],
  },
  {
    name: '백예린',
    primaryGenre: 'rnb',
    songs: [],
  },
  {
    name: 'Snoop Dogg',
    primaryGenre: 'hiphop',
    songs: [],
  },

  // ===== J-Pop second batch =====
  {
    name: 'KinKi Kids',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Amazing Love', tier: 4, subTier: 0, genres: ['jpop'] },
    ],
  },
  {
    name: 'Noriyuki Makihara',
    primaryGenre: 'jpop',
    songs: [
      { title: '冬がはじまるよ', tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },
  {
    name: 'SMAP',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Dear WOMAN', tier: 1, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Gen Hoshino',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Week End', tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },
  {
    name: 'D-51',
    primaryGenre: 'jpop',
    songs: [
      { title: 'BRAND NEW WORLD', tier: 4, subTier: 3, genres: ['jpop', 'anime'] },
    ],
  },
  {
    name: 'Ken Arai',
    primaryGenre: 'edm',
    songs: [
      { title: 'Marble',            tier: 1, subTier: 0, genres: ['edm', 'jpop'] },
      { title: 'Sweet Little Lies', tier: 2, subTier: 1, genres: ['edm', 'jpop'] },
    ],
  },

  // ===== Anime second batch =====
  {
    name: 'Hironobu Kageyama',
    primaryGenre: 'anime',
    songs: [
      { title: 'HEATS 2021', tier: 3, subTier: 2, genres: ['anime'] },
    ],
  },

  // ===== K-Pop second batch =====
  {
    name: 'NCT DREAM',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Beatbox', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'SS501',
    primaryGenre: 'kpop',
    songs: [
      { title: '애인만들기', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'Kep1er',
    primaryGenre: 'kpop',
    songs: [
      { title: 'WA DA DA', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '구혜선',
    primaryGenre: 'kpop',
    songs: [
      { title: '기억상실증 (Flying Galaxy)', tier: 4, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: '볼빨간 사춘기',
    primaryGenre: 'kpop',
    songs: [
      { title: 'You(=I)', tier: 2, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: '검정치마',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Antifreeze', tier: 2, subTier: 3, genres: ['kpop', 'rock'] },
    ],
  },

  // ===== Western second batch =====
  {
    name: 'Green Day',
    primaryGenre: 'rock',
    songs: [
      { title: 'Basket Case', tier: 4, subTier: 3, genres: ['rock'], year: 1994, album: 'Dookie' },
    ],
  },
  {
    name: 'Katy Perry',
    primaryGenre: 'pop',
    songs: [
      { title: 'California Gurls', tier: 1, subTier: 0, genres: ['pop'], year: 2010, album: 'Teenage Dream', features: ['Snoop Dogg'] },
    ],
  },

  // ===== K-Pop third batch =====
  {
    name: 'STAYC',
    primaryGenre: 'kpop',
    songs: [
      { title: '색안경 (STEREOTYPE)', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'B.A.P',
    primaryGenre: 'kpop',
    songs: [
      { title: '대박사건 (Crash)', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'Red Velvet',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Queendom', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'BEAST',
    primaryGenre: 'kpop',
    songs: [
      { title: '미운사람', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'IZ*ONE',
    primaryGenre: 'kpop',
    songs: [
      { title: 'Panorama', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '소녀시대',
    primaryGenre: 'kpop',
    songs: [
      { title: 'I GOT A BOY', tier: 2, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '박세아',
    primaryGenre: 'kpop',
    songs: [
      { title: '희망', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },

  // ===== J-Pop third batch =====
  {
    name: 'Melody.',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Realize', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: '레나 (LENA)',
    primaryGenre: 'jpop',
    songs: [
      { title: 'TOK! TOK! TOK!', tier: 4, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Ken Hirai',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Pop Star', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Perfume',
    primaryGenre: 'jpop',
    songs: [
      { title: 'Love The World', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },

  // ===== Western third batch =====
  {
    name: 'Fall Out Boy',
    primaryGenre: 'rock',
    songs: [
      { title: 'The Phoenix', tier: 4, subTier: 1, genres: ['rock'], year: 2013, album: 'Save Rock and Roll' },
    ],
  },
  {
    name: 'Boys Like Girls',
    primaryGenre: 'rock',
    songs: [
      { title: 'The Great Escape', tier: 4, subTier: 2, genres: ['rock'] },
    ],
  },
  {
    name: 'Billie Eilish',
    primaryGenre: 'pop',
    songs: [
      { title: 'bad guy', tier: 3, subTier: 1, genres: ['pop'], year: 2019, album: 'When We All Fall Asleep, Where Do We Go?' },
    ],
  },
  {
    name: 'Jonas Brothers',
    primaryGenre: 'pop',
    songs: [
      { title: 'Sucker', tier: 3, subTier: 1, genres: ['pop'], year: 2019, album: 'Happiness Begins' },
    ],
  },
  {
    name: 'Justin Bieber',
    primaryGenre: 'pop',
    origin: 'ca',
    songs: [
      { title: 'Sorry', tier: 2, subTier: 0, genres: ['pop'], year: 2015, album: 'Purpose' },
    ],
  },

  // ===== Fourth batch =====
  // Japan
  {
    name: 'eill',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [],
  },
  {
    name: 'Taichi Mukai',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [],
  },
  {
    name: 'Hikaru Utada',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Distance (M-flo Remix)', tier: 2, subTier: 0, genres: ['jpop'], features: ['m-flo'] },
    ],
  },
  {
    name: 'Kalen Anzai',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'come again', tier: 2, subTier: 2, genres: ['jpop'], features: ['CAELAN'] },
    ],
  },
  {
    name: 'CAELAN',
    primaryGenre: 'jpop',
    origin: 'jp',
    memberOf: ['INTERSECTION'],
    songs: [],
  },
  {
    name: 'INTERSECTION',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [],
  },

  // Korea
  {
    name: 'Epik High',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'Love Love Love', tier: 1, subTier: 0, genres: ['khiphop'], features: ['융진'] },
    ],
  },
  {
    name: '융진',
    primaryGenre: 'kpop',
    origin: 'kr',
    memberOf: ['Casker'],
    songs: [],
  },
  {
    name: 'Casker',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [],
  },
  {
    name: 'House Rulez',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Do It!', tier: 4, subTier: 1, genres: ['kpop'], features: ['이윤정'] },
    ],
  },
  {
    name: '이윤정',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [],
  },
  {
    name: 'Heize',
    primaryGenre: 'rnb',
    origin: 'kr',
    songs: [
      { title: 'And July', tier: 3, subTier: 2, genres: ['rnb', 'kpop'], features: ['DEAN', 'DJ Friz'] },
    ],
  },
  {
    name: 'DJ Friz',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    name: '거북이',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '비행기', tier: 5, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: '김윤아',
    primaryGenre: 'rock',
    origin: 'kr',
    memberOf: ['자우림'],
    songs: [],
  },
  {
    name: '자우림',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [],
  },
  {
    name: 'CORTIS',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'REDRED', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: '마이티 마우스',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '톡톡 (Tok Tok)', tier: 2, subTier: 1, genres: ['khiphop'], features: ['소야'] },
    ],
  },
  {
    name: '소야',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [],
  },

  // Netherlands
  {
    name: 'R3HAB',
    primaryGenre: 'edm',
    origin: 'nl',
    songs: [],
  },

  // ===== Fifth batch =====
  {
    name: 'GENERATIONS from EXILE TRIBE',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Hard Knock Days', tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },
  {
    name: 'AAA',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Wake up!', tier: 4, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'FIELD OF VIEW',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'DAN DAN 心魅かれてく', tier: 1, subTier: 0, genres: ['jpop', 'anime'] },
    ],
  },
  {
    name: '임재범',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '이 밤이 지나면', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'BIGBANG',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '하루하루', tier: 4, subTier: 3, genres: ['kpop'], year: 2008 },
    ],
  },
]

// Pick a face for the bubble. Order of preference:
//   1. Explicit artist.photoUrl (one-off override)
//   2. Auto-fetched Wikipedia portrait (artistPhotoLookup)
//   3. Album art of the artist's best song (albumArtLookup)
export function artistFaceFor(
  a: Artist,
  albumArtLookup: (artist: string, title: string) => string | undefined,
  artistPhotoLookup?: (name: string) => string | undefined,
): string | undefined {
  if (a.photoUrl) return a.photoUrl
  const wiki = artistPhotoLookup?.(a.name)
  if (wiki) return wiki
  if (a.songs.length === 0) return undefined
  const sorted = [...a.songs].sort((x, y) => x.tier - y.tier)
  for (const s of sorted) {
    const url = albumArtLookup(a.name, s.title)
    if (url) return url
  }
  return undefined
}
