// Jumap — Jun's personal music critic. Each *artist* is a floating pastel
// bubble; bubbles cluster by the artist's primary genre. The bubble's size is
// driven by the artist's best song (lowest tier = T1 flagship). Tap an artist
// and the songs beneath them slide into the detail card.

export type Tier = 1 | 2 | 3 | 4 | 5
export const TIERS: Tier[] = [1, 2, 3, 4, 5]

export interface Song {
  title: string
  tier: Tier
  // Each song can be tagged with one or more genres. The first one wins for
  // overall artist placement when the artist has no explicit primary genre.
  genres: string[]
  year?: number
  note?: string  // optional review fragment
}

export interface Artist {
  name: string
  // Optional: pin the artist to a specific genre cluster. Otherwise the most
  // common genre across their songs is used.
  primaryGenre?: string
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

export const GENRES: GenreSpec[] = [
  { key: 'pop',     label: 'Pop',      color: '#ffe3ee' },
  { key: 'jpop',    label: 'J-Pop',    color: '#ffd6e7' },
  { key: 'kpop',    label: 'K-Pop',    color: '#d6ecff' },
  { key: 'hiphop',  label: 'Hip-Hop',  color: '#ffe8c4' },
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
      { title: 'Love so sweet', tier: 1, genres: ['jpop'] },
      { title: 'Five',          tier: 1, genres: ['jpop'] },
      { title: 'JAM',           tier: 1, genres: ['jpop'] },
    ],
  },
  {
    name: 'King & Prince',
    primaryGenre: 'jpop',
    songs: [
      { title: 'TraceTrace', tier: 1, genres: ['jpop'] },
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
    songs: [
      { title: 'Nokia',      tier: 2, genres: ['hiphop'] },
      { title: "God's Plan", tier: 3, genres: ['hiphop'] },
    ],
  },
  {
    name: 'Travis Scott',
    primaryGenre: 'rage',
    songs: [
      { title: 'FE!N', tier: 2, genres: ['rage', 'hiphop'] },
    ],
  },
  {
    name: 'Post Malone',
    primaryGenre: 'pop',
    songs: [
      { title: 'I Like You (A Happier Song)', tier: 3, genres: ['pop', 'hiphop'] },
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
