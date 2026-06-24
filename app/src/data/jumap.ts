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
  { key: 'fr',    label: 'France',      color: '#dbc4ff' },  // lavender
  { key: 'se',    label: 'Sweden',      color: '#a5d8ff' },  // arctic blue
  { key: 'no',    label: 'Norway',      color: '#b5e8ff' },  // glacier
  { key: 'es',    label: 'Spain',       color: '#ff9d6a' },  // terracotta
  { key: 'in',    label: 'India',       color: '#ffa356' },  // saffron
  { key: 'dk',    label: 'Denmark',     color: '#f06880' },  // dannebrog red
  { key: 'ie',    label: 'Ireland',     color: '#5edd96' },  // shamrock
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

// Genres are organised into families — siblings share a hue, parent
// family supplies the base shade. So pop / jpop / kpop all read as
// "pinks" with slightly different temperatures, hiphop / khiphop /
// rage all read as "oranges", etc. In Genre view the territory blob
// is drawn at the family level, with sub-genres clustering inside.
export const GENRES: GenreSpec[] = [
  // Pop family — pinks
  { key: 'pop',     label: 'Pop',      color: '#ff8eb0' },
  { key: 'jpop',    label: 'J-Pop',    color: '#ff6d8d' },
  { key: 'kpop',    label: 'K-Pop',    color: '#f491b6' },
  // Hip-hop family — oranges
  { key: 'hiphop',  label: 'Hip-Hop',  color: '#ffb35a' },
  { key: 'khiphop', label: 'K-Hip-Hop', color: '#ff8a3a' },
  { key: 'rage',    label: 'Rage',     color: '#ff5e3a' },
  // Standalone genres
  { key: 'anime',   label: 'Anime',    color: '#85d97e' },
  { key: 'rock',    label: 'Rock',     color: '#9b7fff' },
  { key: 'rnb',     label: 'R&B',      color: '#d784ff' },
  { key: 'edm',     label: 'EDM',      color: '#f0d83a' },
  { key: 'other',   label: 'Other',    color: '#a4abb6' },
]

// Genre family map — used by the layout to nest sub-genres inside their
// parent's territory in Genre view, and by callers that want a single
// "family hue" for related genres.
const GENRE_FAMILY: Record<string, string> = {
  pop: 'pop',     jpop: 'pop',     kpop: 'pop',
  hiphop: 'hiphop', khiphop: 'hiphop', rage: 'hiphop',
  anime: 'anime',
  rock: 'rock',
  rnb: 'rnb',
  edm: 'edm',
  other: 'other',
}
export function familyOfGenre(genreKey: string): string {
  return GENRE_FAMILY[genreKey.toLowerCase()] ?? 'other'
}
// Family display info — label + base hue. Used when rendering the
// outer territory blob in Genre mode.
export interface FamilySpec { key: string; label: string; color: string }
export const GENRE_FAMILIES: FamilySpec[] = [
  { key: 'pop',     label: 'Pop',     color: '#ff8eb0' },
  { key: 'hiphop',  label: 'Hip-Hop', color: '#ffb35a' },
  { key: 'anime',   label: 'Anime',   color: '#85d97e' },
  { key: 'rock',    label: 'Rock',    color: '#9b7fff' },
  { key: 'rnb',     label: 'R&B',     color: '#d784ff' },
  { key: 'edm',     label: 'EDM',     color: '#f0d83a' },
  { key: 'other',   label: 'Other',   color: '#a4abb6' },
]
const FAMILY_LOOKUP = Object.fromEntries(GENRE_FAMILIES.map((f) => [f.key, f]))
export function familyFor(key: string): FamilySpec {
  return FAMILY_LOOKUP[key.toLowerCase()] ?? FAMILY_LOOKUP['other']
}

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
    origin: 'jp',
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
      { title: 'Crazy Moon~キミ・ハ・ムテキ~', tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'ココロチラリ',                    tier: 1, subTier: 1, genres: ['jpop'] },
      { title: '言葉より大切なもの',              tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'サクラ咲ケ',                     tier: 2, subTier: 3, genres: ['jpop'] },
      { title: '優しくって少しバカ',              tier: 2, subTier: 3, genres: ['jpop'] },
      { title: '遠くまで',                       tier: 2, subTier: 3, genres: ['jpop'] },
      { title: 'パレット',                       tier: 2, subTier: 1, genres: ['jpop'] },
      { title: '果てない空',                     tier: 3, subTier: 1, genres: ['jpop'] },
      { title: 'COOL & SOUL',                   tier: 3, subTier: 2, genres: ['jpop'] },
      { title: 'Love Wonderland',                tier: 3, subTier: 2, genres: ['jpop'] },
      { title: '明日の記憶',                     tier: 3, subTier: 2, genres: ['jpop'] },
      { title: '愛を叫べ',                       tier: 3, subTier: 1, genres: ['jpop'] },
      { title: 'ever',                           tier: 3, subTier: 2, genres: ['jpop'] },
      { title: 'ワイルド アット ハート',          tier: 3, subTier: 0, genres: ['jpop'] },
      { title: 'P・A・R・A・D・O・X',             tier: 2, subTier: 2, genres: ['jpop'] },
      { title: '光',                             tier: 1, subTier: 0, genres: ['jpop'] },
      { title: 'Song for you',                   tier: 1, subTier: 2, genres: ['jpop'] },
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
    origin: 'jp',
    songs: [
      { title: 'TraceTrace',  tier: 1, subTier: 1, genres: ['jpop'] },
      { title: 'HEART',       tier: 2, genres: ['jpop'], year: 2025 },
      { title: 'koi-wazurai', tier: 3, genres: ['jpop'], year: 2020, album: 'L&' },
    ],
  },
  {
    name: 'Hey! Say! JUMP',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      // year / album: please confirm
      { title: 'Muah Muah',  tier: 2, genres: ['jpop'] },
      { title: 'White Love', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'KAT-TUN',
    primaryGenre: 'jpop',
    origin: 'jp',
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
    origin: 'kr',
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
    origin: 'kr',
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
    origin: 'kr',
    songs: [
      { title: 'HEYA',     tier: 3, subTier: 3, genres: ['kpop'], year: 2024, album: 'IVE SWITCH' },
      { title: 'Bang Bang', tier: 2, subTier: 2, genres: ['kpop'] },
      { title: 'ELEVEN',    tier: 2, subTier: 2, genres: ['kpop'], year: 2021, album: 'ELEVEN' },
    ],
  },
  {
    name: 'NewJeans',
    primaryGenre: 'kpop',
    origin: 'kr',
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
    origin: 'jp',
    songs: [
      { title: 'ANIMA', tier: 2, genres: ['anime'] },
    ],
  },
  {
    name: 'Drake',
    primaryGenre: 'hiphop',
    origin: 'ca',
    songs: [
      { title: 'Nokia',              tier: 2, subTier: 3, genres: ['hiphop'] },
      { title: '2 Hard 4 The Radio', tier: 2, subTier: 2, genres: ['hiphop'] },
      { title: 'Which One',          tier: 2, subTier: 1, genres: ['hiphop'], features: ['Central Cee'] },
      { title: "God's Plan",         tier: 2, subTier: 3, genres: ['hiphop'] },
      { title: 'Janice STFU',        tier: 2, subTier: 0, genres: ['hiphop'], year: 2025, album: 'ICEMAN' },
      { title: 'Shabang',            tier: 2, subTier: 1, genres: ['hiphop'], year: 2025, album: 'ICEMAN' },
      { title: 'National Treasures', tier: 2, subTier: 2, genres: ['hiphop'], year: 2025, album: 'ICEMAN' },
    ],
  },
  {
    name: 'Kendrick Lamar',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Not Like Us', tier: 1, subTier: 0, genres: ['hiphop'], year: 2024 },
      { title: 'Euphoria',    tier: 1, subTier: 2, genres: ['hiphop'], year: 2024 },
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
    // Houston, TX. Hip-hop primary (rage / psychedelic-rap sub-genre).
    name: 'Travis Scott',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'FE!N',       tier: 1, subTier: 1, genres: ['rage', 'hiphop'] },
      { title: 'SICKO MODE', tier: 1, subTier: 0, genres: ['hiphop', 'rage'], year: 2018, album: 'Astroworld', features: ['Drake'] },
    ],
  },
  {
    name: 'Lil Uzi Vert',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: '20 Min', tier: 2, subTier: 3, genres: ['hiphop'], year: 2017, album: 'Luv Is Rage 2' },
    ],
  },
  {
    name: 'Post Malone',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'I Like You (A Happier Song)', tier: 3, genres: ['pop', 'hiphop'] },
    ],
  },
  {
    name: 'Doja Cat',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Paint The Town Red', tier: 3, subTier: 1, genres: ['pop', 'hiphop'], year: 2023, album: 'Scarlet' },
    ],
  },
  {
    // Korean rapper, AOMG → H1GHR MUSIC. K-hip hop.
    name: 'Sik-K',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'LOV3',        tier: 1, subTier: 2, genres: ['khiphop'] },
      { title: 'OUTTA SPACE', tier: 3, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: 'Ariana Grande',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'thank u, next', tier: 4, subTier: 2, genres: ['pop'], year: 2018, album: 'thank u, next' },
    ],
  },
  {
    // Japanese 3-piece pop-rock band. Rock primary.
    name: 'Mrs. GREEN APPLE',
    primaryGenre: 'rock',
    origin: 'jp',
    songs: [
      { title: 'ライラック', tier: 3, subTier: 2, genres: ['rock', 'jpop'], year: 2024 },
    ],
  },
  {
    name: 'Beenzino',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '990',         tier: 1, subTier: 1, genres: ['khiphop'] },
      { title: 'Time Travel', tier: 2, subTier: 3, genres: ['khiphop'] },
      { title: 'Radio',       tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },

  // ===== K-Pop additions =====
  {
    name: 'SHINee',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Stand By Me', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'KARA',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Pretty Girl', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'NCT WISH',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Surf', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'NCT U',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Kangaroo', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'TXT',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Force', tier: 1, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'JENNIE',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Love Hangover', tier: 3, subTier: 2, genres: ['kpop'], features: ['Dominic Fike'] },
    ],
  },
  {
    name: 'QWER',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '고민중독', tier: 2, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'TVXQ',
    primaryGenre: 'kpop',
    origin: 'kr',
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
    origin: 'kr',
    songs: [],
  },
  {
    name: 'PSY',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '강남스타일', tier: 4, subTier: 1, genres: ['kpop'], year: 2012, album: '강남스타일' },
    ],
  },
  {
    name: 'Wonder Girls',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Tell Me', tier: 2, subTier: 1, genres: ['kpop'], year: 2007 },
    ],
  },
  {
    // Korean rapper, ex-Block B leader. K-hip hop primary.
    name: 'ZICO',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'DUET', tier: 2, subTier: 1, genres: ['khiphop'], features: ['Lilas'] },
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
      { title: 'Rolling days',         tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'このままもっと',          tier: 2, subTier: 3, genres: ['jpop'] },
      { title: 'Come Back',             tier: 2, subTier: 0, genres: ['jpop'], features: ['Jun Matsumoto'] },
    ],
  },
  {
    // ARASHI member — Jun Matsumoto (Matsujun).
    name: 'Jun Matsumoto',
    primaryGenre: 'jpop',
    origin: 'jp',
    memberOf: ['ARASHI'],
    songs: [],
  },
  {
    // ARASHI member — Kazunari Ninomiya.
    name: 'Kazunari Ninomiya',
    primaryGenre: 'jpop',
    origin: 'jp',
    memberOf: ['ARASHI'],
    songs: [
      { title: '夜の影', tier: 1, subTier: 1, genres: ['jpop'], features: ['Satoshi Ohno', 'Jun Matsumoto'] },
    ],
  },
  {
    // ARASHI member — Satoshi Ohno (leader).
    name: 'Satoshi Ohno',
    primaryGenre: 'jpop',
    origin: 'jp',
    memberOf: ['ARASHI'],
    songs: [],
  },
  {
    // ARASHI member — Masaki Aiba.
    name: 'Masaki Aiba',
    primaryGenre: 'jpop',
    origin: 'jp',
    memberOf: ['ARASHI'],
    songs: [
      { title: 'Friendship', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    // Naniwa Danshi — Kansai-based J-pop group (Johnny's/STARTO).
    name: 'なにわ男子',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: '初心LOVE（うぶらぶ）', tier: 2, subTier: 1, genres: ['jpop'] },
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
    origin: 'us',
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
    origin: 'us',
    songs: [
      { title: 'Good Time', tier: 5, subTier: 2, genres: ['pop'], year: 2012, features: ['Carly Rae Jepsen'] },
    ],
  },
  {
    name: 'BOYNEXTDOOR',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '오늘만 I LOVE YOU', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'SEVENTEEN',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '음악의 신', tier: 2, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    name: '혁오',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '와리가리', tier: 2, subTier: 0, genres: ['kpop', 'rock'] },
    ],
  },
  {
    name: '정국',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Standing Next to You', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'BTS',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Dynamite', tier: 1, subTier: 0, genres: ['kpop'], year: 2020, album: 'BE' },
      { title: 'Butter',   tier: 3, subTier: 1, genres: ['kpop'], year: 2021 },
    ],
  },
  {
    name: 'JYJ',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '찾았다', tier: 2, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    // Korean indie rock / electronic duo. KAIST CS classmates.
    name: 'Peppertones',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: 'Superfantastic', tier: 2, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    name: '신지',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Always', tier: 1, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'NS 윤지',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'If You Love Me', tier: 4, subTier: 0, genres: ['kpop'], features: ['박재범'] },
    ],
  },
  {
    name: 'Hearts2Hearts',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'STYLE', tier: 2, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    // Korean alt-R&B singer-songwriter (Kwon Hyuk), born Seoul.
    name: 'DEAN',
    primaryGenre: 'rnb',
    origin: 'kr',
    songs: [
      { title: '넘어와', tier: 2, subTier: 0, genres: ['rnb', 'kpop'], features: ['백예린'] },
    ],
  },

  // ===== K-Hip-Hop additions =====
  {
    name: 'Effie',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'CAN I SIP 담배', tier: 1, subTier: 0, genres: ['khiphop'] },
      { title: '2025기침',       tier: 2, subTier: 0, genres: ['khiphop'] },
      { title: 'down',           tier: 3, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: 'EsDeeKid',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '4 Raws', tier: 2, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: '나우아임영',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'AH AH', tier: 1, subTier: 0, genres: ['khiphop'] },
      { title: 'AH',    tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },
  {
    name: 'Jazzyfact',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '아까워',   tier: 2, subTier: 3, genres: ['khiphop'] },
      { title: '하루종일', tier: 3, subTier: 3, genres: ['khiphop'] },
    ],
  },
  {
    name: 'SYSTEM SEOUL',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'SS', tier: 2, subTier: 1, genres: ['khiphop'] },
    ],
  },
  {
    name: 'Young B',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '아침에', tier: 2, subTier: 0, genres: ['khiphop'], features: ['Bryn'] },
    ],
  },
  {
    name: 'Kid Milli',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '25', tier: 2, subTier: 1, genres: ['khiphop'], features: ['Young B'] },
    ],
  },

  // ===== J-Pop additions =====
  {
    name: 'V6',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Can do! Can go!', tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'Super Powers',    tier: 2, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Buono!',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Kiss! Kiss! Kiss!', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Kenshi Yonezu',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'IRIS OUT', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Number_i',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'BON', tier: 1, subTier: 0, genres: ['jpop'] },
    ],
  },
  {
    name: 'EXILE',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Choo Choo Train', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'SEKAI NO OWARI',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'ターコイズ', tier: 2, subTier: 2, genres: ['jpop'] },
      { title: 'RPG',        tier: 2, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Official髭男dism',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: '犬かキャットかで死ぬまで喧嘩しよう!', tier: 1, subTier: 2, genres: ['jpop'] },
      { title: 'ノーダウト',                          tier: 4, subTier: 2, genres: ['jpop'] },
      { title: '宿命',                                tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },

  // ===== Anime =====
  {
    name: 'ClariS',
    primaryGenre: 'anime',
    origin: 'jp',
    songs: [
      { title: 'Irony', tier: 3, subTier: 0, genres: ['anime'] },
    ],
  },
  {
    name: 'Hiroshi Kitadani',
    primaryGenre: 'anime',
    origin: 'jp',
    songs: [
      { title: 'ウィーアー！', tier: 1, subTier: 0, genres: ['anime'] },
    ],
  },
  {
    name: '5050',
    primaryGenre: 'anime',
    origin: 'jp',
    songs: [
      { title: 'Jungle P', tier: 1, subTier: 0, genres: ['anime'] },
    ],
  },

  // ===== Hip-Hop (Western) =====
  {
    name: 'DJ Khaled',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'POPSTAR', tier: 2, subTier: 2, genres: ['hiphop'], features: ['Drake'] },
    ],
  },
  {
    name: 'The Notorious B.I.G.',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Hypnotize', tier: 3, subTier: 1, genres: ['hiphop'], year: 1997, album: 'Life After Death' },
    ],
  },
  {
    name: 'Nas',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'N.Y. State of Mind', tier: 3, subTier: 0, genres: ['hiphop'], year: 1994, album: 'Illmatic' },
    ],
  },

  // ===== Pop =====
  {
    name: 'Sabrina Carpenter',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Espresso', tier: 2, subTier: 3, genres: ['pop'], year: 2024, album: 'Short n’ Sweet' },
    ],
  },
  {
    name: 'Dominic Fike',
    primaryGenre: 'pop',
    origin: 'us',
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
    origin: 'us',
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
      { title: 'Let It Be',              tier: 4, subTier: 2, genres: ['rock'], year: 1970, album: 'Let It Be' },
      { title: 'Hey Jude',               tier: 3, subTier: 1, genres: ['rock'], year: 1968, album: 'Hey Jude' },
      { title: 'I Want To Hold Your Hand', tier: 2, subTier: 0, genres: ['rock', 'pop'], year: 1963, album: 'Meet the Beatles!' },
    ],
  },
  {
    name: 'Redbone',
    primaryGenre: 'rock',
    origin: 'us',
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
    origin: 'us',
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
    origin: 'us',
    songs: [
      { title: 'I Want You Back', tier: 3, subTier: 2, genres: ['rnb'], year: 1969 },
    ],
  },
  {
    name: 'Bruno Mars',
    primaryGenre: 'rnb',
    origin: 'us',
    songs: [
      { title: 'Skate', tier: 1, subTier: 3, genres: ['rnb', 'pop'], year: 2021, album: 'An Evening with Silk Sonic', features: ['Anderson .Paak'] },
    ],
  },
  {
    name: 'Anderson .Paak',
    primaryGenre: 'rnb',
    origin: 'us',
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
    origin: 'kr',
    songs: [
      { title: 'Missing You', tier: 5, subTier: 2, genres: ['kpop'], features: ['김윤아'] },
    ],
  },
  {
    name: '박재범',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    name: 'Bryn',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    // Korean R&B singer-songwriter (ex-15&, ex-JYP).
    name: '백예린',
    primaryGenre: 'rnb',
    origin: 'kr',
    songs: [],
  },
  {
    name: 'Snoop Dogg',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [],
  },

  // ===== J-Pop second batch =====
  {
    name: 'KinKi Kids',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Amazing Love', tier: 4, subTier: 0, genres: ['jpop'] },
    ],
  },
  {
    name: 'Noriyuki Makihara',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: '冬がはじまるよ', tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },
  {
    name: 'SMAP',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Dear WOMAN', tier: 1, subTier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'Gen Hoshino',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Week End', tier: 4, subTier: 3, genres: ['jpop'] },
    ],
  },
  {
    name: 'D-51',
    primaryGenre: 'jpop',
    origin: 'jp',
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
    origin: 'jp',
    songs: [
      { title: 'HEATS 2021', tier: 3, subTier: 2, genres: ['anime'] },
    ],
  },

  // ===== K-Pop second batch =====
  {
    name: 'NCT DREAM',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Beatbox', tier: 3, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: 'SS501',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '애인만들기', tier: 1, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    name: 'Kep1er',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'WA DA DA', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '구혜선',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '기억상실증 (Flying Galaxy)', tier: 4, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    name: '볼빨간 사춘기',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'You(=I)', tier: 2, subTier: 2, genres: ['kpop'] },
    ],
  },
  {
    // Bryan Cho (조휴일). Korean indie rock — multiple Korean Music Awards
    // for Best Modern Rock Album. Seoul-based.
    name: '검정치마',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: 'Antifreeze', tier: 2, subTier: 3, genres: ['rock', 'kpop'] },
      { title: 'Ling Ling',  tier: 3, subTier: 2, genres: ['rock'] },
    ],
  },

  // ===== Western second batch =====
  {
    name: 'Green Day',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: 'Basket Case', tier: 4, subTier: 3, genres: ['rock'], year: 1994, album: 'Dookie' },
    ],
  },
  {
    name: 'Katy Perry',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'California Gurls', tier: 1, subTier: 0, genres: ['pop'], year: 2010, album: 'Teenage Dream', features: ['Snoop Dogg'] },
    ],
  },

  // ===== K-Pop third batch =====
  {
    name: 'STAYC',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '색안경 (STEREOTYPE)', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'B.A.P',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '대박사건 (Crash)', tier: 3, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    name: 'Red Velvet',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Queendom', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'BEAST',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '미운사람', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: 'IZ*ONE',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'Panorama', tier: 4, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '소녀시대',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'I GOT A BOY', tier: 2, subTier: 3, genres: ['kpop'] },
    ],
  },
  {
    name: '박세아',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '희망', tier: 3, subTier: 3, genres: ['kpop'] },
    ],
  },

  // ===== J-Pop third batch =====
  {
    name: 'Melody.',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Realize', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: '레나 (LENA)',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'TOK! TOK! TOK!', tier: 4, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Ken Hirai',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Pop Star', tier: 3, subTier: 2, genres: ['jpop'] },
    ],
  },
  {
    name: 'Perfume',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: 'Love The World', tier: 2, subTier: 2, genres: ['jpop'] },
    ],
  },

  // ===== Western third batch =====
  {
    name: 'Fall Out Boy',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: 'The Phoenix', tier: 4, subTier: 1, genres: ['rock'], year: 2013, album: 'Save Rock and Roll' },
    ],
  },
  {
    name: 'Boys Like Girls',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: 'The Great Escape', tier: 4, subTier: 2, genres: ['rock'] },
    ],
  },
  {
    name: 'Billie Eilish',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'bad guy', tier: 3, subTier: 1, genres: ['pop'], year: 2019, album: 'When We All Fall Asleep, Where Do We Go?' },
    ],
  },
  {
    name: 'Jonas Brothers',
    primaryGenre: 'pop',
    origin: 'us',
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
    // 1994–2002 Japanese pop-rock band. Famous DAN DAN Kokoro Hikareteku
    // (Dragon Ball GT OP).
    name: 'FIELD OF VIEW',
    primaryGenre: 'rock',
    origin: 'jp',
    songs: [
      { title: 'DAN DAN 心魅かれてく', tier: 1, subTier: 0, genres: ['rock', 'jpop', 'anime'] },
    ],
  },
  {
    // Korean rock ballad legend (ex-Sinawe / Asiana vocalist).
    name: '임재범',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: '이 밤이 지나면', tier: 4, subTier: 3, genres: ['rock'] },
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
  {
    // South Korean singer-songwriter "Nation's Little Sister".
    name: 'IU',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '아이와 나의 바다', tier: 2, subTier: 0, genres: ['kpop'] },
    ],
  },
  {
    // South Korean ballad singer.
    name: '폴킴',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '모든 날, 모든 순간', tier: 5, subTier: 1, genres: ['kpop'] },
    ],
  },
  {
    // UK drill rapper.
    name: 'Central Cee',
    primaryGenre: 'hiphop',
    origin: 'uk',
    songs: [],
  },
  {
    // US hip-hop. Marshall Mathers.
    name: 'Eminem',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Without Me',          tier: 2, subTier: 1, genres: ['hiphop'], year: 2002, album: 'The Eminem Show' },
      { title: 'The Real Slim Shady', tier: 3, subTier: 2, genres: ['hiphop'], year: 2000, album: 'The Marshall Mathers LP' },
      { title: 'Houdini',             tier: 3, subTier: 1, genres: ['hiphop'], year: 2024, album: 'The Death of Slim Shady (Coup de Grâce)' },
    ],
  },
  {
    // Taiwanese Mandopop king. "Secret" (不能說的秘密) is a Brit-rock
    // ballad (Mandopop), film soundtrack — not classical, though the
    // movie's piano-duel scenes feature Chopin arrangements.
    name: 'Jay Chou',
    primaryGenre: 'pop',
    origin: 'tw',
    songs: [
      { title: 'Secret', tier: 2, subTier: 1, genres: ['pop', 'rock'], year: 2007, album: 'Secret: Soundtrack' },
    ],
  },
  {
    // French singer Camille Dalmais — Ratatouille (2007) ending song,
    // written with composer Michael Giacchino.
    name: 'Camille',
    primaryGenre: 'pop',
    origin: 'fr',
    songs: [
      { title: 'Le Festin', tier: 5, subTier: 3, genres: ['pop'], year: 2007, album: 'Ratatouille OST', features: ['Michael Giacchino'] },
    ],
  },
  {
    name: 'Michael Giacchino',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [],
  },
  {
    // Swedish EDM producer Tim Bergling.
    name: 'Avicii',
    primaryGenre: 'edm',
    origin: 'se',
    songs: [
      { title: 'Wake Me Up', tier: 4, subTier: 2, genres: ['edm'], year: 2013, album: 'True' },
    ],
  },
  {
    // Korean rapper.
    name: 'ASH ISLAND',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'OST', tier: 2, subTier: 3, genres: ['khiphop'], features: ['ちゃんみな'] },
    ],
  },
  {
    // Japanese-Korean rapper Chanmina (born in Korea, raised in Japan).
    name: 'ちゃんみな',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [],
  },
  {
    // English rock/pop band from Eastbourne. Famous 2000 cover of
    // "Dancing in the Moonlight" (King Harvest, 1972).
    name: 'Toploader',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: 'Dancing in the Moonlight', tier: 2, subTier: 3, genres: ['rock', 'pop'], year: 2000, album: 'Onka’s Big Moka' },
    ],
  },
  {
    // French chanson singer. "Monaco" (28°C à l'ombre, 1978).
    name: 'Jean Francois Maurice',
    primaryGenre: 'pop',
    origin: 'fr',
    songs: [
      { title: 'Monaco', tier: 3, subTier: 3, genres: ['pop'], year: 1978 },
    ],
  },
  {
    // British-Australian pop / disco trio (Gibb brothers, born Isle of Man).
    // Famously associated with Saturday Night Fever soundtrack.
    name: 'Bee Gees',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'How Deep Is Your Love', tier: 1, subTier: 1, genres: ['pop'], year: 1977, album: 'Saturday Night Fever' },
    ],
  },
  {
    // American rock/pop band from Chicago. Famous for ballads and brass.
    name: 'Chicago',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: "You're the Inspiration", tier: 1, subTier: 1, genres: ['rock', 'pop'], year: 1984, album: 'Chicago 17' },
    ],
  },
  {
    // Norwegian singer. Eurovision 1988 — "For vår jord" came 5th.
    // "You Call It Love" (La Boum 2 OST adaptation, 1988).
    name: 'Karoline Krüger',
    primaryGenre: 'pop',
    origin: 'no',
    songs: [
      { title: 'You Call It Love', tier: 2, subTier: 3, genres: ['pop'], year: 1988 },
    ],
  },
  {
    // English rock band — Jeff Lynne's orchestral-rock outfit.
    name: 'Electric Light Orchestra',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: 'Mr. Blue Sky', tier: 2, subTier: 3, genres: ['rock', 'pop'], year: 1977, album: 'Out of the Blue' },
    ],
  },
  {
    // 1988 Korean rock band, Shin Hae-chul-led. "그대에게" is a
    // legendary college festival anthem.
    name: '무한궤도',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: '그대에게', tier: 4, subTier: 2, genres: ['rock'], year: 1988 },
    ],
  },
  {
    // Korean rock band, Min Kyung-hoon vocals.
    name: 'Buzz',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: '겁쟁이', tier: 4, subTier: 1, genres: ['rock'] },
    ],
  },
  {
    // JYP K-pop girl group, debuted 2019.
    name: 'ITZY',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: '달라달라', tier: 3, subTier: 2, genres: ['kpop'], year: 2019, album: 'IT’z Different' },
    ],
  },
  {
    // Korean indie rock band — "Jannabi".
    name: '잔나비',
    primaryGenre: 'rock',
    origin: 'kr',
    songs: [
      { title: '주저하는 연인들을 위해', tier: 3, subTier: 0, genres: ['rock'], year: 2019, album: '전설' },
      { title: '사랑의이름으로!',        tier: 2, subTier: 2, genres: ['rock', 'kpop'], features: ['KARINA'] },
    ],
  },
  {
    // BLACKPINK's Rosé (Roseanne Park).
    name: 'ROSÉ',
    primaryGenre: 'kpop',
    origin: 'kr',
    songs: [
      { title: 'APT.', tier: 5, subTier: 2, genres: ['kpop', 'pop'], year: 2024, features: ['Bruno Mars'] },
    ],
  },
  {
    // Korean R&B / soul ballad group from early 2000s.
    name: '프리스타일',
    primaryGenre: 'rnb',
    origin: 'kr',
    songs: [
      { title: 'Y', tier: 4, subTier: 2, genres: ['rnb', 'kpop'] },
    ],
  },
  {
    // Korean hip-hop duo Simon D + E-Sens, debuted 2009 under
    // Amoeba Culture.
    name: 'Supreme Team',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'Supermagic', tier: 4, subTier: 2, genres: ['khiphop'] },
    ],
  },
  {
    // Korean rapper Choi Suk-bae. Mass Appeal Records Korea.
    name: 'Nafla',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'Wu', tier: 2, subTier: 2, genres: ['khiphop'] },
    ],
  },
  {
    // Kang Min-ho, ex-Supreme Team. Underground K-hip-hop legend.
    name: 'E SENS',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '비행',                tier: 2, subTier: 0, genres: ['khiphop'] },
      { title: 'Gas',                 tier: 2, subTier: 2, genres: ['khiphop'], features: ['Jibin'] },
    ],
  },
  {
    // K-hip-hop / R&B vocalist Jibin.
    name: 'Jibin',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    // K-hip-hop rapper EK (이케이).
    name: 'EK',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: 'MollyWorld', tier: 3, subTier: 3, genres: ['khiphop'], features: ['GV'] },
    ],
  },
  {
    // K-hip-hop rapper / producer GV (지비).
    name: 'GV',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    // K-hip-hop rapper Mushvenom (머쉬베놈) — Show Me the Money 9.
    name: '머쉬베놈',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [
      { title: '돌림판', tier: 2, subTier: 1, genres: ['khiphop'], features: ['신빠람 이박사'] },
    ],
  },
  {
    // 신빠람 이박사 — 한 사람.
    name: '신빠람 이박사',
    primaryGenre: 'khiphop',
    origin: 'kr',
    songs: [],
  },
  {
    // Spanish duo. "Macarena" (1993, dance hit revived by Bayside Boys
    // Mix 1995/96).
    name: 'Los Del Rio',
    primaryGenre: 'pop',
    origin: 'es',
    songs: [
      { title: 'Macarena', tier: 4, subTier: 0, genres: ['pop'], year: 1993 },
    ],
  },
  {
    // Manchester rock band, Gallagher brothers.
    name: 'Oasis',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: "Don't Look Back In Anger", tier: 4, subTier: 2, genres: ['rock'], year: 1995, album: '(What’s the Story) Morning Glory?' },
    ],
  },
  {
    // LA EDM/pop duo (Redfoo + SkyBlu). 2011 dance-pop juggernaut.
    name: 'LMFAO',
    primaryGenre: 'edm',
    origin: 'us',
    songs: [
      { title: 'Party Rock Anthem', tier: 4, subTier: 2, genres: ['edm', 'pop'], year: 2011, album: 'Sorry for Party Rocking', features: ['Lauren Bennett', 'GoonRock'] },
    ],
  },
  {
    name: 'Lauren Bennett',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [],
  },
  {
    name: 'GoonRock',
    primaryGenre: 'edm',
    origin: 'us',
    songs: [],
  },
  {
    // Broadway / film singer. Voice of Elsa in Disney's Frozen.
    name: 'Idina Menzel',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Let It Go', tier: 4, subTier: 0, genres: ['pop'], year: 2013, album: 'Frozen OST' },
    ],
  },
  {
    // English singer-songwriter from Halifax / Suffolk.
    name: 'Ed Sheeran',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'Shape of You', tier: 4, subTier: 1, genres: ['pop'], year: 2017, album: '÷ (Divide)' },
    ],
  },
  {
    // British soul / pop band (1967–1970), best known for "Build Me Up
    // Buttercup".
    name: 'The Foundations',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'Build Me Up Buttercup', tier: 4, subTier: 2, genres: ['pop', 'rnb'], year: 1968, album: 'Digging the Foundations' },
    ],
  },
  {
    // American R&B / funk / soul band founded by Maurice White.
    name: 'Earth, Wind & Fire',
    primaryGenre: 'rnb',
    origin: 'us',
    songs: [
      { title: 'September', tier: 2, subTier: 3, genres: ['rnb', 'pop'], year: 1978, album: 'The Best of Earth, Wind & Fire, Vol. 1' },
    ],
  },
  {
    // American singer/rapper from Dallas, viral with "Lil Boo Thang"
    // (2023).
    name: 'Paul Russell',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Lil Boo Thang', tier: 4, subTier: 2, genres: ['pop', 'hiphop'], year: 2023, album: 'Lil Boo Thang' },
    ],
  },
  {
    // King of Pop.
    name: 'Michael Jackson',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Beat It', tier: 2, subTier: 3, genres: ['pop', 'rock'], year: 1982, album: 'Thriller' },
    ],
  },
  {
    // aespa member; appears here as the featured artist on 잔나비's
    // "사랑의이름으로!" — the strong member-pull will keep her sitting
    // tangent to the aespa planet inside Korea.
    name: 'KARINA',
    primaryGenre: 'kpop',
    origin: 'kr',
    memberOf: ['aespa'],
    songs: [],
  },
  {
    // American sibling duo (Karen + Richard Carpenter), early 70s soft
    // pop.
    name: 'Carpenters',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Top Of The World', tier: 5, subTier: 2, genres: ['pop'], year: 1972, album: 'A Song for You' },
    ],
  },
  {
    // British rock band; Freddie Mercury, Brian May, Roger Taylor,
    // John Deacon.
    name: 'Queen',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: "Don't Stop Me Now", tier: 2, subTier: 2, genres: ['rock', 'pop'], year: 1978, album: 'Jazz' },
    ],
  },
  {
    // British rock — Chris Martin, Jonny Buckland, Guy Berryman, Will
    // Champion.
    name: 'Coldplay',
    primaryGenre: 'rock',
    origin: 'uk',
    songs: [
      { title: 'Viva La Vida', tier: 5, subTier: 2, genres: ['rock', 'pop'], year: 2008, album: 'Viva la Vida or Death and All His Friends' },
    ],
  },
  {
    // American pop/rock band fronted by Adam Levine.
    name: 'Maroon 5',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Sugar', tier: 5, subTier: 2, genres: ['pop', 'rock'], year: 2014, album: 'V' },
    ],
  },
  {
    // LA-based indie pop / soul band fronted by Michael Fitzpatrick.
    name: 'Fitz and the Tantrums',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'HandClap', tier: 4, subTier: 1, genres: ['pop', 'rock'], year: 2016, album: 'Fitz and the Tantrums' },
    ],
  },
  {
    // British (Zimbabwean-born) pop/dance singer.
    name: 'Taio Cruz',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'Hangover', tier: 3, subTier: 3, genres: ['pop'], year: 2011, album: 'TY.O', features: ['Flo Rida'] },
    ],
  },
  {
    // American rapper from Florida.
    name: 'Flo Rida',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Whistle',      tier: 4, subTier: 0, genres: ['hiphop', 'pop'], year: 2012, album: 'Wild Ones' },
      { title: 'Good Feeling', tier: 3, subTier: 0, genres: ['hiphop', 'pop'], year: 2011, album: 'Wild Ones' },
    ],
  },
  {
    // Canadian pop singer-songwriter.
    name: 'Shawn Mendes',
    primaryGenre: 'pop',
    origin: 'ca',
    songs: [
      { title: "If I Can't Have You", tier: 3, subTier: 3, genres: ['pop'], year: 2019 },
    ],
  },
  {
    // American hip-hop. Ye.
    name: 'Kanye West',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'On Sight', tier: 3, subTier: 3, genres: ['hiphop'], year: 2013, album: 'Yeezus' },
    ],
  },
  {
    // Cuban-American pop singer; ex-Fifth Harmony.
    name: 'Camila Cabello',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Havana', tier: 2, subTier: 2, genres: ['pop'], year: 2017, album: 'Camila', features: ['Young Thug'] },
    ],
  },
  {
    // Atlanta rapper.
    name: 'Young Thug',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [],
  },
  {
    // New Jersey emo / alt-rock band.
    name: 'My Chemical Romance',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: 'Welcome to the Black Parade', tier: 3, subTier: 3, genres: ['rock'], year: 2006, album: 'The Black Parade' },
    ],
  },
  {
    // American singer-songwriter from Virginia.
    name: 'Jason Mraz',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: "I'm Yours", tier: 4, subTier: 1, genres: ['pop'], year: 2008, album: 'We Sing. We Dance. We Steal Things.' },
    ],
  },
  {
    // American pop/rock singer-songwriter, Pennsylvania.
    name: 'Vanessa Carlton',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'A Thousand Miles', tier: 4, subTier: 2, genres: ['pop'], year: 2002, album: 'Be Not Nobody' },
    ],
  },
  {
    // St. Louis rapper.
    name: 'Nelly',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Hot in Herre', tier: 4, subTier: 0, genres: ['hiphop'], year: 2002, album: 'Nellyville' },
    ],
  },
  {
    // American pop/country superstar.
    name: 'Taylor Swift',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'You Belong With Me', tier: 4, subTier: 3, genres: ['pop'], year: 2008, album: 'Fearless' },
    ],
  },
  {
    // LA hip-hop / pop group; will.i.am, apl.de.ap, Taboo, Fergie.
    name: 'Black Eyed Peas',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Where Is The Love?', tier: 4, subTier: 3, genres: ['pop', 'hiphop'], year: 2003, album: 'Elephunk' },
    ],
  },
  {
    // American pop singer Kesha Rose Sebert; styled "Ke$ha" early
    // career.
    name: 'Ke$ha',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Tik Tok', tier: 3, subTier: 1, genres: ['pop'], year: 2009, album: 'Animal' },
    ],
  },
  {
    // Japanese composer (菅野祐悟). Wrote the JoJo's Bizarre Adventure
    // Part 5 main theme "il vento d'oro" (Golden Wind).
    name: 'Yugo Kanno',
    primaryGenre: 'anime',
    origin: 'jp',
    songs: [
      { title: "il vento d'oro", tier: 3, subTier: 1, genres: ['anime'], year: 2018, album: 'Le Bizzarre Avventure di GioGio' },
    ],
  },
  {
    // Indian bhangra / Punjabi pop singer; "King of Bhangra Pop".
    name: 'Daler Mehndi',
    primaryGenre: 'other',
    origin: 'in',
    songs: [
      { title: 'Tunak Tunak Tun', tier: 4, subTier: 1, genres: ['other', 'pop'], year: 1998, album: 'Tunak Tunak Tun' },
    ],
  },
  {
    // Norwegian comedy duo Vegard + Bård Ylvisåker. "What Does the Fox
    // Say?" 2013 viral hit.
    name: 'YLVIS',
    primaryGenre: 'pop',
    origin: 'no',
    songs: [
      { title: 'The Fox', tier: 5, subTier: 1, genres: ['pop'], year: 2013, album: 'I kveld med YLVIS' },
    ],
  },
  {
    // Atlanta rapper DeAndre Cortez Way. "Crank That (Soulja Boy)" was
    // a 2007 ringtone-era smash.
    name: 'Soulja Boy',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Crank That', tier: 3, subTier: 3, genres: ['hiphop'], year: 2007, album: 'souljaboytellem.com' },
    ],
  },
  {
    // Danish-Norwegian eurodance group; "Barbie Girl" 1997.
    name: 'AQUA',
    primaryGenre: 'pop',
    origin: 'dk',
    songs: [
      { title: 'Barbie Girl', tier: 4, subTier: 2, genres: ['pop', 'edm'], year: 1997, album: 'Aquarium' },
    ],
  },
  {
    // American jazz / pop singer-pianist. "Don't Know Why" was her
    // 2002 breakout, Album of the Year at the 2003 Grammys.
    name: 'Norah Jones',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: "Don't Know Why", tier: 4, subTier: 0, genres: ['pop', 'rnb'], year: 2002, album: 'Come Away with Me' },
    ],
  },
  {
    // Norwegian singer; lead vocalist of a-ha ("Take On Me"). "Can't
    // Take My Eyes off You" is his Frankie Valli cover from his 2014
    // album "Brother".
    name: 'Morten Harket',
    primaryGenre: 'pop',
    origin: 'no',
    songs: [
      { title: "Can't Take My Eyes off You", tier: 4, subTier: 3, genres: ['pop'], year: 2014, album: 'Brother' },
    ],
  },
  {
    // British actress; sang "A Step You Can't Take Back" in the 2013
    // film "Begin Again" (dir. John Carney).
    name: 'Keira Knightley',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: "A Step You Can't Take Back", tier: 5, subTier: 0, genres: ['pop'], year: 2014, album: 'Begin Again (Original Motion Picture Soundtrack)' },
    ],
  },
  {
    // Canadian jazz / pop crooner from Burnaby, BC.
    name: 'Michael Bublé',
    primaryGenre: 'pop',
    origin: 'ca',
    songs: [
      { title: "It's a Beautiful Day", tier: 5, subTier: 2, genres: ['pop'], year: 2013, album: 'To Be Loved' },
    ],
  },
  {
    // British (Kosovar-Albanian) pop singer; "Levitating" 2020.
    name: 'Dua Lipa',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'Levitating', tier: 4, subTier: 2, genres: ['pop'], year: 2020, album: 'Future Nostalgia' },
    ],
  },
  {
    // Australian singer-songwriter Sia Furler. "Chandelier" 2014.
    name: 'Sia',
    primaryGenre: 'pop',
    origin: 'au',
    songs: [
      { title: 'Chandelier', tier: 5, subTier: 1, genres: ['pop'], year: 2014, album: '1000 Forms of Fear' },
    ],
  },
  {
    // British hyperpop singer (Charlotte Aitchison). BRAT, 2024.
    name: 'Charli xcx',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: '360', tier: 4, subTier: 1, genres: ['pop', 'edm'], year: 2024, album: 'BRAT' },
    ],
  },
  {
    // British pop singer; ex-One Direction. Harry's House, 2022.
    name: 'Harry Styles',
    primaryGenre: 'pop',
    origin: 'uk',
    songs: [
      { title: 'As It Was', tier: 4, subTier: 2, genres: ['pop'], year: 2022, album: "Harry's House" },
    ],
  },
  {
    // American pop/R&B icon; "Queen of Christmas".
    name: 'Mariah Carey',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'All I Want for Christmas Is You', tier: 3, subTier: 0, genres: ['pop', 'rnb'], year: 1994, album: 'Merry Christmas' },
    ],
  },
  {
    // Japanese piano-pop band from Shimane / Tokyo. "幾億光年"
    // ("Hundred Million Light Years") is the opening for the 2024
    // anime "Oblivion Battery" (忘却バッテリー).
    name: 'Omoinotake',
    primaryGenre: 'jpop',
    origin: 'jp',
    songs: [
      { title: '幾億光年', tier: 2, subTier: 0, genres: ['jpop'], year: 2024 },
    ],
  },
  {
    // Irish pop boy band from Sligo / Dublin. "My Love" 2000.
    name: 'Westlife',
    primaryGenre: 'pop',
    origin: 'ie',
    songs: [
      { title: 'My Love', tier: 2, subTier: 0, genres: ['pop'], year: 2000, album: 'Coast to Coast' },
    ],
  },
  {
    // American pop-punk band from Baltimore, MD.
    name: 'All Time Low',
    primaryGenre: 'rock',
    origin: 'us',
    songs: [
      { title: 'Time-Bomb', tier: 4, subTier: 0, genres: ['rock', 'pop'], year: 2011, album: 'Dirty Work' },
    ],
  },
  {
    // American pop / R&B singer-rapper Melissa Viviane Jefferson.
    name: 'Lizzo',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Juice', tier: 3, subTier: 0, genres: ['pop', 'rnb'], year: 2019, album: 'Cuz I Love You' },
    ],
  },
  {
    // American pop singer / producer, Rumson NJ.
    name: 'Charlie Puth',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: "I Don't Think That I Like Her", tier: 3, subTier: 1, genres: ['pop'], year: 2022, album: 'Charlie' },
    ],
  },
  {
    // American actress / singer; voice of Anna in Disney's Frozen.
    // "Love Is an Open Door" is the Anna ↔ Hans duet — Santino Fontana
    // sings as Hans.
    name: 'Kristen Bell',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [
      { title: 'Love Is an Open Door', tier: 3, subTier: 1, genres: ['pop'], year: 2013, album: 'Frozen (Original Motion Picture Soundtrack)', features: ['Santino Fontana'] },
    ],
  },
  {
    // American actor / singer; voiced Hans in Disney's Frozen.
    name: 'Santino Fontana',
    primaryGenre: 'pop',
    origin: 'us',
    songs: [],
  },
  {
    // American rapper / singer from Houston, TX. Cactus Jack signee.
    name: 'Don Toliver',
    primaryGenre: 'hiphop',
    origin: 'us',
    songs: [
      { title: 'Lose My Mind', tier: 3, subTier: 1, genres: ['hiphop', 'rnb'], year: 2025, features: ['Doja Cat'] },
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
