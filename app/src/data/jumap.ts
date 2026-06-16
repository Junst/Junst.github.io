// Jumap — Jun's personal song-by-song critic, rendered as a drifting bubble
// map. Each *song* is a bubble. The bubble is sized by its tier (1 = biggest,
// flagship; bigger tier number = smaller). Bubbles cluster by genre — same
// genre songs gravitate to the same continent, no land underneath.

export type Tier = 1 | 2 | 3 | 4 | 5
export const TIERS: Tier[] = [1, 2, 3, 4, 5]

export interface Song {
  artist: string
  title: string
  tier: Tier
  // First genre is the primary one used for clustering on the map; any
  // additional genres show up as secondary tints + show in the legend.
  genres: string[]
  year?: number     // when the song was rated (or released)
  note?: string     // short comment, HTML allowed — fill in later
}

// Pastel translucent colour band per genre. Lower-case keys, longer names
// for display in the legend.
export interface GenreSpec {
  key: string
  label: string
  color: string
}

export const GENRES: GenreSpec[] = [
  { key: 'pop',     label: 'Pop',      color: '#ffe0ec' },
  { key: 'jpop',    label: 'J-Pop',    color: '#ffd6e7' },
  { key: 'kpop',    label: 'K-Pop',    color: '#cfeff7' },
  { key: 'hiphop',  label: 'Hip-Hop',  color: '#ffe5b4' },
  { key: 'rage',    label: 'Rage',     color: '#ffb3a7' },
  { key: 'anime',   label: 'Anime',    color: '#d6f5d6' },
  { key: 'rock',    label: 'Rock',     color: '#d6d6ff' },
  { key: 'rnb',     label: 'R&B',      color: '#f0d6ff' },
  { key: 'edm',     label: 'EDM',      color: '#fff5b8' },
  { key: 'other',   label: 'Other',    color: '#e8e8e8' },
]

export const GENRE_LOOKUP: Record<string, GenreSpec> = Object.fromEntries(
  GENRES.map((g) => [g.key, g]),
)
export function genreFor(key: string): GenreSpec {
  return GENRE_LOOKUP[key.toLowerCase()] ?? GENRE_LOOKUP['other']
}

// Tier sizing — base bubble radius in px. Tier 1 is the flagship, tier 5 is
// the smallest acknowledgment.
export const TIER_BASE_RADIUS: Record<Tier, number> = {
  1: 64,
  2: 52,
  3: 42,
  4: 34,
  5: 28,
}

export const TIER_LABEL: Record<Tier, string> = {
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
  5: 'T5',
}

// Starter songs from Jun. Tiers/genres only for now; notes filled in later.
export const songs: Song[] = [
  // J-Pop — ARASHI heartline
  { artist: 'ARASHI',          title: 'Love so sweet', tier: 1, genres: ['jpop'] },
  { artist: 'ARASHI',          title: 'Five',          tier: 1, genres: ['jpop'] },
  { artist: 'ARASHI',          title: 'JAM',           tier: 1, genres: ['jpop'] },
  { artist: 'King & Prince',   title: 'TraceTrace',    tier: 1, genres: ['jpop'] },
  // Anime / J-Rock
  { artist: 'ReoNa',           title: 'ANIMA',         tier: 2, genres: ['anime'] },
  // Hip-Hop
  { artist: 'Drake',           title: 'Nokia',         tier: 2, genres: ['hiphop'] },
  { artist: 'Travis Scott',    title: 'FE!N',          tier: 2, genres: ['rage', 'hiphop'] },
  { artist: 'Drake',           title: "God's Plan",    tier: 3, genres: ['hiphop'] },
  { artist: 'Post Malone',     title: 'I Like You (A Happier Song)', tier: 3, genres: ['pop', 'hiphop'] },
]

export function bubbleRadius(s: Song): number {
  return TIER_BASE_RADIUS[s.tier]
}

export function primaryGenre(s: Song): string {
  return (s.genres[0] ?? 'other').toLowerCase()
}

export function groupByGenre(items: Song[]): Map<string, Song[]> {
  const out = new Map<string, Song[]>()
  for (const s of items) {
    const key = primaryGenre(s)
    const arr = out.get(key) ?? []
    arr.push(s)
    out.set(key, arr)
  }
  return out
}

export function presentGenres(items: Song[]): GenreSpec[] {
  const set = new Set<string>()
  for (const s of items) for (const g of s.genres) set.add(g.toLowerCase())
  return GENRES.filter((g) => set.has(g.key))
}

export function sortByTier(items: Song[]): Song[] {
  return [...items].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier
    return a.title.localeCompare(b.title)
  })
}
