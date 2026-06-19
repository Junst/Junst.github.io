import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  artists,
  GENRES,
  COUNTRIES,
  TIERS,
  bubbleRadius,
  bestTier,
  genreFor,
  countryOfGenre,
  artistPrimaryGenre,
  artistGenres,
  sortArtists,
  artistFaceFor,
  type Artist,
  type Song,
} from '../data/jumap'
import { useAlbumArt } from '../components/AlbumArt'
import { TierBadge, tierCrownSrc } from '../components/TierBadge'
import { albumArtFor } from '../data/album-art'
import { artistPhotoFor } from '../data/artist-photos'

// Phyllotaxis (Vogel's model) constant — sunflower seed spacing.
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface PlacedArtist extends Artist {
  kind: 'artist'
  cx: number
  cy: number
  r: number
  /** Effective radius of the artist's full orbit (artist edge + furthest song
   *  edge + small buffer). Used by forceLayoutNodes to keep two artists
   *  from getting closer than their combined orbits — so songs of artist A
   *  can never be closer to artist B than to A. */
  orbitR: number
  /** Country / region key (jp / kr / west / other) — set at place() time
   *  so the force pass can apply a wider gap to inter-country pairs. */
  country: string
  // Idle drift seeds (deterministic so the motion is stable per artist)
  driftDelay: number
  driftDuration: number
}

interface PlacedSong {
  kind: 'song'
  /** Owning artist name — used for album-art lookup and feature bond anchors. */
  primaryArtist: string
  song: Song
  /** Stable id of the form `${artist}|${title}` for keys and focus targets. */
  id: string
  cx: number
  cy: number
  r: number
  driftDelay: number
  driftDuration: number
}

type PlacedNode = PlacedArtist | PlacedSong

// Tier-driven small radius for song moons.
function songBubbleRadius(s: Song): number {
  return ({ 1: 22, 2: 18, 3: 15, 4: 13, 5: 11 } as const)[s.tier]
}

function seed(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return (h >>> 0) / 0xffffffff
}

interface Bond {
  from: string
  to: string
  x1: number
  y1: number
  x2: number
  y2: number
  intensity: number
  /** 'own' = artist→its own song tether; 'feature' = song→featured artist */
  kind: 'own' | 'feature'
}

interface Territory {
  key: string
  color: string
  label: string
  // Per-bubble footprints — the SVG goo filter will fuse them into one
  // organic blob per genre.
  blobs: { cx: number; cy: number; r: number; primary: boolean }[]
  // Floating label position (above the cluster, x at centroid).
  labelX: number
  labelY: number
}

// Each genre gets a soft territory drawn behind the bubbles. Footprints for
// the secondary genres are added at a smaller radius, so when an artist
// spans two genres the two coloured blobs cross each other freely instead
// of being walled off — that's the "shapes break out of genre" feel.
function computeTerritories(placed: PlacedArtist[]): Territory[] {
  const byGenre = new Map<string, PlacedArtist[]>()
  const secByGenre = new Map<string, PlacedArtist[]>()
  for (const a of placed) {
    const primary = artistPrimaryGenre(a)
    if (!byGenre.has(primary)) byGenre.set(primary, [])
    byGenre.get(primary)!.push(a)
    const secondaries = artistGenres(a).filter((g) => g !== primary)
    for (const s of secondaries) {
      if (!secByGenre.has(s)) secByGenre.set(s, [])
      secByGenre.get(s)!.push(a)
    }
  }

  const out: Territory[] = []
  const allKeys = new Set<string>([...byGenre.keys(), ...secByGenre.keys()])
  for (const key of allKeys) {
    const spec = genreFor(key)
    if (!spec) continue
    const primaries = byGenre.get(key) ?? []
    const secondaries = secByGenre.get(key) ?? []
    const blobs = [
      // Even tighter hug — earlier 1.45·r let same-genre bubbles' territories
      // fuse into one big blob via the goo filter, which read on screen as
      // "the bubbles are close together". Now each blob barely extends past
      // its bubble so visual separation between bubbles is preserved.
      ...primaries.map((m) => ({ cx: m.cx, cy: m.cy, r: m.r * 1.1 + 6, primary: true })),
      ...secondaries.map((m) => ({ cx: m.cx, cy: m.cy, r: m.r * 0.85 + 4, primary: false })),
    ]
    // Label anchor: above the topmost primary bubble (fall back to topmost
    // secondary if there are no primary holders for this genre).
    const anchorPool = primaries.length > 0 ? primaries : secondaries
    let topY = Infinity
    let topX = 0
    for (const m of anchorPool) {
      if (m.cy - m.r < topY) { topY = m.cy - m.r; topX = m.cx }
    }
    out.push({
      key,
      color: spec.color,
      label: spec.label,
      blobs,
      labelX: topX,
      labelY: Math.max(28, topY - 16),
    })
  }
  return out
}

// Predict the orbit reach an artist will need given just its tier and song
// count — used by `place` to set orbitR BEFORE songs are laid out, so the
// artist-only force pass has a real radius to enforce gaps against.
function estimateOrbitR(a: Artist): number {
  if (a.songs.length === 0) return bubbleRadius(a)
  const r = bubbleRadius(a)
  const lastI = a.songs.length - 1
  const orbitR = r + 32 + Math.sqrt(lastI + 0.5) * 40
  // The biggest song moon is a T1 = 22 viewBox px.
  return orbitR + 22 + 18
}

export type ViewMode = 'country' | 'genre' | 'tier'

function place(
  items: Artist[],
  width: number,
  height: number,
  mode: ViewMode = 'country',
): PlacedArtist[] {
  if (mode === 'genre') return placeByGenre(items, width, height)
  if (mode === 'tier') return placeByTier(items, width, height)
  return placeByCountry(items, width, height)
}

function placeByCountry(items: Artist[], width: number, height: number): PlacedArtist[] {
  // Country-first clustering. Each country picks a centroid on a wide
  // super-ring. Inside each country, members are further sub-grouped by
  // their primary genre on a small inner ring around the country centre,
  // and each genre sub-cluster phyllotaxis-spirals out from there. So
  // J-Pop and anime both sit clearly under "Japan", and K-Pop and
  // K-Hip-Hop both sit under "Korea", instead of intermingling.
  const byCountry = new Map<string, Artist[]>()
  for (const a of items) {
    const c = countryOfGenre(artistPrimaryGenre(a))
    if (!byCountry.has(c)) byCountry.set(c, [])
    byCountry.get(c)!.push(a)
  }
  const countryKeys = COUNTRIES.map((c) => c.key).filter((k) => byCountry.has(k))
  const cx = width / 2
  const cy = height / 2
  const countryCentres: Record<string, { x: number; y: number }> = {}
  if (countryKeys.length === 1) {
    countryCentres[countryKeys[0]] = { x: cx, y: cy }
  } else {
    const ringR = Math.min(width, height) * 1.4
    countryKeys.forEach((key, i) => {
      const angle = (i / countryKeys.length) * Math.PI * 2 - Math.PI / 2
      countryCentres[key] = {
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
      }
    })
  }

  const out: PlacedArtist[] = []
  for (const country of countryKeys) {
    const cc = countryCentres[country]
    const arts = byCountry.get(country) ?? []
    // Sub-group this country's artists by genre
    const byGenre = new Map<string, Artist[]>()
    for (const a of arts) {
      const g = artistPrimaryGenre(a)
      if (!byGenre.has(g)) byGenre.set(g, [])
      byGenre.get(g)!.push(a)
    }
    const genreKeys = GENRES.map((g) => g.key).filter((k) => byGenre.has(k))
    // Inner ring inside the country — places each genre at its own sub-centroid.
    const innerR = Math.min(width, height) * 0.20
    const genreCentres: Record<string, { x: number; y: number }> = {}
    if (genreKeys.length === 1) {
      genreCentres[genreKeys[0]] = { x: cc.x, y: cc.y }
    } else {
      genreKeys.forEach((g, i) => {
        const angle = (i / genreKeys.length) * Math.PI * 2 - Math.PI / 2
        genreCentres[g] = {
          x: cc.x + Math.cos(angle) * innerR,
          y: cc.y + Math.sin(angle) * innerR,
        }
      })
    }
    for (const genre of genreKeys) {
      const gc = genreCentres[genre]
      const cluster = sortArtists(byGenre.get(genre) ?? [])
      const phase = cluster.length > 0 ? seed(cluster[0].name) * Math.PI * 2 : 0
      cluster.forEach((a, i) => {
        const r = bubbleRadius(a)
        const sd = seed(a.name)
        const angle = i * GOLDEN_ANGLE + phase
        const localRadius = cluster.length === 1 ? 0 : Math.sqrt(i + 0.6) * 110
        out.push({
          ...a,
          kind: 'artist',
          cx: gc.x + Math.cos(angle) * localRadius,
          cy: gc.y + Math.sin(angle) * localRadius,
          r,
          orbitR: estimateOrbitR(a),
          country,
          driftDelay: -(sd * 12),
          driftDuration: 8 + (sd * 6),
        })
      })
    }
  }
  return out
}

function placeByGenre(items: Artist[], width: number, height: number): PlacedArtist[] {
  // Genre-first: each genre on a wide ring, country becomes secondary.
  const byGenre = new Map<string, Artist[]>()
  for (const a of items) {
    const g = artistPrimaryGenre(a)
    if (!byGenre.has(g)) byGenre.set(g, [])
    byGenre.get(g)!.push(a)
  }
  const genreKeys = GENRES.map((g) => g.key).filter((k) => byGenre.has(k))
  const cx = width / 2
  const cy = height / 2
  const centres: Record<string, { x: number; y: number }> = {}
  if (genreKeys.length === 1) centres[genreKeys[0]] = { x: cx, y: cy }
  else {
    const ringR = Math.min(width, height) * 1.4
    genreKeys.forEach((g, i) => {
      const angle = (i / genreKeys.length) * Math.PI * 2 - Math.PI / 2
      centres[g] = { x: cx + Math.cos(angle) * ringR, y: cy + Math.sin(angle) * ringR }
    })
  }
  const out: PlacedArtist[] = []
  for (const genre of genreKeys) {
    const c = centres[genre]
    const cluster = sortArtists(byGenre.get(genre) ?? [])
    const phase = cluster.length > 0 ? seed(cluster[0].name) * Math.PI * 2 : 0
    cluster.forEach((a, i) => {
      const r = bubbleRadius(a)
      const sd = seed(a.name)
      const angle = i * GOLDEN_ANGLE + phase
      const localRadius = cluster.length === 1 ? 0 : Math.sqrt(i + 0.6) * 130
      out.push({
        ...a,
        kind: 'artist',
        cx: c.x + Math.cos(angle) * localRadius,
        cy: c.y + Math.sin(angle) * localRadius,
        r,
        orbitR: estimateOrbitR(a),
        country: countryOfGenre(artistPrimaryGenre(a)),
        driftDelay: -(sd * 12),
        driftDuration: 8 + (sd * 6),
      })
    })
  }
  return out
}

function placeByTier(items: Artist[], width: number, height: number): PlacedArtist[] {
  // Tier-first: best-tier artists at the centre, lower-tier artists out on
  // rings further from the centre — concentric circles.
  const cx = width / 2
  const cy = height / 2
  const byTier = new Map<number, Artist[]>()
  for (const a of items) {
    const t = bestTier(a)
    if (!byTier.has(t)) byTier.set(t, [])
    byTier.get(t)!.push(a)
  }
  const tiers = Array.from(byTier.keys()).sort((a, b) => a - b)
  const out: PlacedArtist[] = []
  const ringStep = Math.min(width, height) * 0.55
  for (const tier of tiers) {
    const cluster = sortArtists(byTier.get(tier) ?? [])
    // Tier 1 is innermost (small ring). Each subsequent tier sits further
    // out, evenly distributed around its ring.
    const ringR = (tier - 1) * ringStep + 80
    const phase = cluster.length > 0 ? seed(cluster[0].name) * Math.PI * 2 : 0
    cluster.forEach((a, i) => {
      const r = bubbleRadius(a)
      const sd = seed(a.name)
      // Use the ring for >1 members; single member sits on the ring.
      const angle =
        cluster.length === 1
          ? phase
          : (i / cluster.length) * Math.PI * 2 + phase
      out.push({
        ...a,
        kind: 'artist',
        cx: cx + Math.cos(angle) * ringR,
        cy: cy + Math.sin(angle) * ringR,
        r,
        orbitR: estimateOrbitR(a),
        country: countryOfGenre(artistPrimaryGenre(a)),
        driftDelay: -(sd * 12),
        driftDuration: 8 + (sd * 6),
      })
    })
  }
  return out
}

// Place each artist's songs in an orbit around the artist using
// phyllotaxis — tier-1 songs land closest, lower-tier songs spiral outward.
// The force pass below then settles overlaps and pulls featured songs
// toward their featured artist's planet.
function placeSongsAround(artists: PlacedArtist[]): PlacedSong[] {
  const out: PlacedSong[] = []
  for (const artist of artists) {
    const songs = [...artist.songs].sort(
      (a, b) =>
        a.tier - b.tier ||
        (b.subTier ?? 0) - (a.subTier ?? 0) ||
        a.title.localeCompare(b.title),
    )
    const phase = seed(artist.name) * Math.PI * 2
    let maxOrbitEdge = artist.r
    songs.forEach((song, i) => {
      const sd = seed(`${artist.name}|${song.title}`)
      const angle = i * GOLDEN_ANGLE + phase
      const r = songBubbleRadius(song)
      // Orbit radius grows with sqrt(i) so density stays roughly even
      // even for artists with lots of songs (ARASHI has the most).
      const orbitR = artist.r + 32 + Math.sqrt(i + 0.5) * 40
      const edge = orbitR + r
      if (edge > maxOrbitEdge) maxOrbitEdge = edge
      out.push({
        kind: 'song',
        primaryArtist: artist.name,
        song,
        id: `${artist.name}|${song.title}`,
        cx: artist.cx + Math.cos(angle) * orbitR,
        cy: artist.cy + Math.sin(angle) * orbitR,
        r,
        driftDelay: -(sd * 8),
        driftDuration: 5 + (sd * 4),
      })
    })
    // Tell the force pass how much space this artist's orbit really needs.
    artist.orbitR = maxOrbitEdge + 18
  }
  return out
}

// Force-directed layout that handles a mixed list of artist-planets and
// song-moons. Forces felt by each node:
//   (1) Pairwise repulsion proportional to overlap. Min-gap depends on the
//       pair's kind: artist↔artist gets the widest gap, song↔song the
//       smallest, mixed pairs sit in the middle so songs can stay close to
//       their primary artist without being pushed across the canvas.
//   (2) Anchor spring back to the initial spot (preserves the genre /
//       orbit topology even after the simulation settles).
//   (3) Songs feel an extra gentle pull toward each featured artist's
//       planet, so collaboration tracks drift to the orbit boundary
//       between the two artists.
function forceLayoutNodes(
  nodes: PlacedNode[],
  iterations: number = 800,
  options: { freezeArtists?: boolean } = {},
): void {
  const { freezeArtists = false } = options
  const n = nodes.length
  if (n < 2) return
  const anchorX = nodes.map((it) => it.cx)
  const anchorY = nodes.map((it) => it.cy)
  const vx = new Array(n).fill(0)
  const vy = new Array(n).fill(0)

  const artistIdx = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const nd = nodes[i]
    if (nd.kind === 'artist') artistIdx.set(nd.name, i)
  }

  // Extra padding once the two orbits clear each other — bumped up so
  // even small-orbit artists have plenty of breathing room between
  // their planet and the next one over.
  const GAP_AA_BUFFER = 180
  const GAP_AA_MIN = 320
  const GAP_AS = 12
  const GAP_SS = 6
  const ANCHOR_PULL = 0.022
  const FEATURE_PULL = 0.018
  const STEP = 0.85
  const DAMPING = 0.78

  for (let k = 0; k < iterations; k++) {
    let maxSpeed = 0
    for (let i = 0; i < n; i++) {
      let fx = 0
      let fy = 0
      const a = nodes[i]
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const b = nodes[j]
        const dx = a.cx - b.cx
        const dy = a.cy - b.cy
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        let minDist: number
        if (a.kind === 'artist' && b.kind === 'artist') {
          // Stronger guarantee than "orbits don't overlap": every song on
          // the edge of the larger orbit must be closer to its OWN artist
          // than to the neighbour. With dist(A,B) >= 2·max(orbitR) + 60,
          // an edge song at distance orbitR_max from its artist ends up
          // at distance >= orbitR_max + 60 from the other artist — so
          // proximity always identifies the right primary.
          const sameCountry = a.country === b.country
          // Inter-country pairs get a much larger floor, so the country
          // territory blobs end up clearly separated and the visual
          // grouping reads as Japan / Korea / Western at a glance.
          const countryBoost = sameCountry ? 0 : 380
          minDist = Math.max(
            2 * Math.max(a.orbitR, b.orbitR) + 120 + countryBoost,
            a.orbitR + b.orbitR + GAP_AA_BUFFER + countryBoost,
            a.r + b.r + GAP_AA_MIN + countryBoost,
          )
        } else {
          const gap = a.kind !== b.kind ? GAP_AS : GAP_SS
          minDist = a.r + b.r + gap
        }
        if (dist < minDist) {
          const push = (minDist - dist) * 0.55
          fx += (dx / dist) * push
          fy += (dy / dist) * push
        }
      }
      fx += (anchorX[i] - a.cx) * ANCHOR_PULL
      fy += (anchorY[i] - a.cy) * ANCHOR_PULL

      // Featuring pull — only songs with explicit features feel this.
      if (a.kind === 'song' && a.song.features) {
        for (const featName of a.song.features) {
          const fi = artistIdx.get(featName)
          if (fi == null) continue
          const fa = nodes[fi]
          fx += (fa.cx - a.cx) * FEATURE_PULL
          fy += (fa.cy - a.cy) * FEATURE_PULL
        }
      }

      vx[i] = (vx[i] + fx * STEP) * DAMPING
      vy[i] = (vy[i] + fy * STEP) * DAMPING
      const s = Math.abs(vx[i]) + Math.abs(vy[i])
      if (s > maxSpeed) maxSpeed = s
    }
    for (let i = 0; i < n; i++) {
      // When the second pass is settling songs around fixed artists, skip
      // updating artist positions so they stay where pass 1 put them.
      if (freezeArtists && nodes[i].kind === 'artist') continue
      nodes[i].cx += vx[i]
      nodes[i].cy += vy[i]
    }
    if (k > 120 && maxSpeed < 0.05) break
  }
}

interface Ripple { id: number; cx: number; cy: number; r: number }

const ArtistBubble = memo(function ArtistBubble({
  a, focus, onFocus, onDragStart,
}: {
  a: PlacedArtist
  focus: string | null
  onFocus: (key: string | null) => void
  onDragStart: (e: React.PointerEvent, name: string) => void
}) {
  const primary = genreFor(artistPrimaryGenre(a))
  const genres = artistGenres(a)
  const secondary = genres.length > 1 ? genreFor(genres.find((g) => g !== primary.key) ?? '') : null
  const focused = focus === a.name
  const dim = focus != null && !focused
  const shapeOpacity = dim ? 0.22 : 1
  const face = artistFaceFor(a, albumArtFor, artistPhotoFor)
  const clipId = `bubble-face-${a.name.replace(/[^a-z0-9]/gi, '_')}`
  // Face image now sits as a smaller inset in the bubble, not edge-to-edge.
  const faceR = a.r * 0.6
  return (
    <g
      className={'jumap-bubble jumap-bubble-artist' + (focused ? ' focused' : '')}
      data-artist-name={a.name}
      style={{
        ['--drift-delay' as string]: `${a.driftDelay}s`,
        ['--drift-duration' as string]: `${a.driftDuration}s`,
      }}
      onMouseEnter={() => onFocus(a.name)}
      onMouseLeave={() => onFocus(null)}
      onPointerDown={(e) => onDragStart(e, a.name)}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={a.cx} cy={a.cy} r={faceR} />
        </clipPath>
      </defs>
      {/* Drop shadow */}
      <ellipse
        cx={a.cx}
        cy={a.cy + a.r * 1.04}
        rx={a.r * 0.62}
        ry={a.r * 0.1}
        fill="#000"
        opacity={(focused ? 0.18 : 0.08) * shapeOpacity}
      />
      {/* Frosted pastel bubble — fills the whole circle so the face sits on
          a tinted backdrop instead of consuming all of it. */}
      <circle
        cx={a.cx}
        cy={a.cy}
        r={a.r}
        fill={`url(#bubble-${primary.key})`}
        opacity={(focused ? 0.85 : 0.78) * shapeOpacity}
        stroke={secondary?.color ?? primary.color}
        strokeOpacity={(secondary ? 0.55 : 0.42) * shapeOpacity}
        strokeWidth={secondary ? 2.5 : 1.4}
        strokeDasharray={secondary ? '5 4' : undefined}
      />
      {/* Artist face — small inset, clipped to a circle smaller than the bubble */}
      {face && (
        <>
          <image
            href={face}
            x={a.cx - faceR}
            y={a.cy - faceR}
            width={faceR * 2}
            height={faceR * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            opacity={(focused ? 0.98 : 0.92) * shapeOpacity}
            style={{ filter: focused ? 'saturate(1.05)' : 'saturate(0.95) brightness(1.02)' }}
          />
          <circle
            cx={a.cx}
            cy={a.cy}
            r={faceR}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={1.4}
            opacity={0.85 * shapeOpacity}
            pointerEvents="none"
          />
        </>
      )}
      {/* Bottom-right glow */}
      <circle
        cx={a.cx}
        cy={a.cy}
        r={a.r}
        fill="url(#bubble-glow)"
        opacity={(focused ? 0.55 : 0.35) * shapeOpacity}
        pointerEvents="none"
      />
      {/* Top-left specular sheen */}
      <ellipse
        cx={a.cx - a.r * 0.32}
        cy={a.cy - a.r * 0.38}
        rx={a.r * 0.5}
        ry={a.r * 0.28}
        fill="url(#bubble-highlight)"
        opacity={(focused ? 0.95 : 0.78) * shapeOpacity}
        pointerEvents="none"
      />
      {/* Tiny pinpoint highlight */}
      <ellipse
        cx={a.cx - a.r * 0.38}
        cy={a.cy - a.r * 0.46}
        rx={a.r * 0.1}
        ry={a.r * 0.05}
        fill="#ffffff"
        opacity={(focused ? 1 : 0.85) * shapeOpacity}
        pointerEvents="none"
      />
      {/* Metallic crown above the artist name — material encodes the tier. */}
      {(() => {
        const t = bestTier(a)
        const crownW = Math.max(20, a.r * 0.42)
        const crownH = (crownW * 232) / 354
        return (
          <image
            href={tierCrownSrc(t)}
            x={a.cx - crownW / 2}
            y={a.cy - a.r * 0.58 - crownH / 2}
            width={crownW}
            height={crownH}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))' }}
          />
        )
      })()}
      {/* Artist name centered, always full opacity */}
      <text
        x={a.cx}
        y={a.cy + 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="jumap-artist"
        opacity="1"
      >
        {a.name}
      </text>
    </g>
  )
})

// A song moon — small bubble showing the song's album art clipped to a
// circle. Hovering it lights up the song's primary artist; clicking opens
// the single-song modal. Songs with `features` show via the feature bonds
// drawn separately as connecting lines to each featured artist.
const SongBubble = memo(function SongBubble({
  s, focus, onFocus, onOpen, onRipple,
}: {
  s: PlacedSong
  focus: string | null
  onFocus: (key: string | null) => void
  onOpen: (s: PlacedSong) => void
  onRipple: (r: Ripple) => void
}) {
  const focused = focus === s.id || focus === s.primaryArtist
  const dim = focus != null && !focused
  const opacity = dim ? 0.32 : 1
  const art = albumArtFor(s.primaryArtist, s.song.title)
  const clipId = `song-clip-${s.id.replace(/[^a-z0-9]/gi, '_')}`
  return (
    <g
      className={'jumap-bubble jumap-bubble-song' + (focused ? ' focused' : '')}
      data-song-artist={s.primaryArtist}
      style={{
        ['--drift-delay' as string]: `${s.driftDelay}s`,
        ['--drift-duration' as string]: `${s.driftDuration}s`,
      }}
      onMouseEnter={() => onFocus(s.id)}
      onMouseLeave={() => onFocus(null)}
      onClick={() => {
        onRipple({ id: Date.now() + Math.random(), cx: s.cx, cy: s.cy, r: s.r })
        onOpen(s)
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={s.cx} cy={s.cy} r={s.r} />
        </clipPath>
      </defs>
      {/* Soft shadow */}
      <ellipse
        cx={s.cx}
        cy={s.cy + s.r * 1.1}
        rx={s.r * 0.55}
        ry={s.r * 0.12}
        fill="#000"
        opacity={(focused ? 0.2 : 0.12) * opacity}
      />
      {/* Album art clipped to circle, or a tinted placeholder. */}
      {art ? (
        <image
          href={art}
          x={s.cx - s.r}
          y={s.cy - s.r}
          width={s.r * 2}
          height={s.r * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={opacity}
        />
      ) : (
        <circle cx={s.cx} cy={s.cy} r={s.r} fill="#dcdcdc" opacity={opacity} />
      )}
      {/* Crisp ring + tier-coloured stroke. */}
      <circle
        cx={s.cx}
        cy={s.cy}
        r={s.r}
        fill="none"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth={1.2}
        opacity={0.85 * opacity}
        pointerEvents="none"
      />
      <circle
        cx={s.cx}
        cy={s.cy}
        r={s.r + 1.4}
        fill="none"
        stroke="#1a1a1a"
        strokeOpacity={(focused ? 0.55 : 0.22) * opacity}
        strokeWidth={focused ? 1.4 : 0.9}
        pointerEvents="none"
      />
      <title>{`${s.song.title} — ${s.primaryArtist}`}</title>
    </g>
  )
})

function Stars({ tier, subTier = 0 }: { tier: number; subTier?: number }) {
  const filled = 6 - tier            // T1 → 5 ★, T5 → 1 ★
  const empty = 5 - filled
  const sub = Math.max(0, Math.min(3, subTier))
  return (
    <span
      className="jumap-modal-song-stars"
      aria-label={`Tier ${tier}${sub > 0 ? `+${sub}` : ''}`}
    >
      {'★'.repeat(filled)}
      <span className="jumap-modal-song-stars-empty">{'★'.repeat(empty)}</span>
      {sub > 0 && (
        <span className="jumap-modal-song-substars" aria-hidden="true">
          {'★'.repeat(sub)}
        </span>
      )}
    </span>
  )
}

function SongRow({ artist, song }: { artist: string; song: Song }) {
  const { src, color } = useAlbumArt(artist, song.title)
  return (
    <li
      className="jumap-modal-song"
      style={color ? { ['--song-tint' as string]: color } : undefined}
    >
      <div className="jumap-modal-song-head">
        <h3 className="jumap-modal-song-title">{song.title}</h3>
        {song.album && (
          <div className="jumap-modal-song-album">{song.album}</div>
        )}
        <div className="jumap-modal-song-row">
          <TierBadge tier={song.tier} />
          <Stars tier={song.tier} subTier={song.subTier} />
          {song.year && <span className="jumap-modal-song-year">{song.year}</span>}
        </div>
      </div>
      {src ? (
        <img
          className="jumap-modal-song-art"
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="jumap-modal-song-art-placeholder" aria-hidden="true">♪</div>
      )}
      {song.note ? (
        <p
          className="jumap-modal-song-note"
          dangerouslySetInnerHTML={{ __html: song.note }}
        />
      ) : (
        <p className="jumap-modal-song-note jumap-modal-song-note-empty">
          No review written yet — this is where the wide-form thoughts go.
        </p>
      )}
    </li>
  )
}


// Single-song detail dialog opened by clicking a song moon. Reuses SongRow
// so the layout matches the existing per-song card.
function SongModal({
  primaryArtist, song, onClose,
}: {
  primaryArtist: string
  song: Song
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  const primary = genreFor((song.genres[0] ?? 'other').toLowerCase())
  return (
    <div className="jumap-modal-backdrop" onClick={onClose}>
      <div
        className="jumap-modal jumap-modal-single"
        role="dialog"
        aria-label={song.title}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--modal-tint' as string]: primary.color }}
      >
        <button
          type="button"
          className="jumap-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <header className="jumap-modal-head jumap-modal-head-song">
          <div className="jumap-modal-song-artist">{primaryArtist}</div>
          {song.features && song.features.length > 0 && (
            <div className="jumap-modal-song-feat">
              feat. {song.features.join(', ')}
            </div>
          )}
        </header>
        <ol className="jumap-modal-songs">
          <SongRow artist={primaryArtist} song={song} />
        </ol>
      </div>
    </div>
  )
}

interface Orbit {
  cx: number
  cy: number
  r: number
  color: string
  id: string
  name: string
}

interface CountryTerritory {
  id: string
  key: string
  cx: number
  cy: number
  r: number
  color: string
  label: string
  labelY: number
}

// Heavy SVG inner — everything that's expensive to reconcile (territories,
// orbit halos, feature bonds, all bubble nodes, ripples). Memoised so the
// pan / zoom re-renders of JumapPage skip this entire subtree as long as
// the data + focus + ripples haven't changed. Only the <svg> viewBox
// attribute updates per frame during drag.
const JumapSvgInner = memo(function JumapSvgInner({
  artistsPlaced, songsPlaced, territories, countryTerritories, orbits, bonds,
  focus, openSong, ripples,
  setFocus, setOpenSong, addRipple, onArtistDragStart,
}: {
  artistsPlaced: PlacedArtist[]
  songsPlaced: PlacedSong[]
  territories: Territory[]
  countryTerritories: CountryTerritory[]
  orbits: Orbit[]
  bonds: Bond[]
  focus: string | null
  openSong: PlacedSong | null
  ripples: Ripple[]
  setFocus: (k: string | null) => void
  setOpenSong: (s: PlacedSong | null) => void
  addRipple: (r: Ripple) => void
  onArtistDragStart: (e: React.PointerEvent, name: string) => void
}) {
  const focusedBond = (b: Bond) =>
    focus === b.from || focus === b.to ||
    (openSong !== null && (openSong.primaryArtist === b.from || openSong.primaryArtist === b.to))
  return (
    <>
      <defs>
        {GENRES.map((g) => (
          <radialGradient
            key={g.key}
            id={`bubble-${g.key}`}
            cx="32%"
            cy="28%"
            r="85%"
          >
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%"  stopColor={g.color} stopOpacity="0.5" />
            <stop offset="75%"  stopColor={g.color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={g.color} stopOpacity="0.18" />
          </radialGradient>
        ))}
        <radialGradient id="bubble-highlight" cx="32%" cy="22%" r="36%">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bubble-glow" cx="70%" cy="80%" r="40%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bond-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#b03434" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#205493" stopOpacity="0.65" />
        </linearGradient>
        {orbits.map((o) => (
          <radialGradient key={o.id} id={o.id} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor={o.color} stopOpacity="0.22" />
            <stop offset="70%" stopColor={o.color} stopOpacity="0.13" />
            <stop offset="100%" stopColor={o.color} stopOpacity="0" />
          </radialGradient>
        ))}
        {/* Per-genre soft territory gradient — replaces the previous SVG
            goo filter, which was the dominant cost on mobile (every viewBox
            change re-evaluated a Gaussian blur + color-matrix threshold). */}
        {GENRES.map((g) => (
          <radialGradient key={`tt-${g.key}`} id={`tt-${g.key}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={g.color} stopOpacity="0.85" />
            <stop offset="50%"  stopColor={g.color} stopOpacity="0.48" />
            <stop offset="100%" stopColor={g.color} stopOpacity="0" />
          </radialGradient>
        ))}
        {COUNTRIES.map((c) => (
          <radialGradient key={`ct-${c.key}`} id={`ct-${c.key}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={c.color} stopOpacity="0.78" />
            <stop offset="55%"  stopColor={c.color} stopOpacity="0.42" />
            <stop offset="100%" stopColor={c.color} stopOpacity="0" />
          </radialGradient>
        ))}
        {/* Country ring stroke — darker shade of the country tint, used
            as a thin dashed outline around each region for an atlas-y
            ink-line feel. */}
        {COUNTRIES.map((c) => (
          <linearGradient key={`cr-${c.key}`} id={`cr-${c.key}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={c.color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={c.color} stopOpacity="0.3" />
          </linearGradient>
        ))}
        {/* Sub-pixel dot pattern under everything for a paper-grain feel
            so the background doesn't read as a featureless wash. */}
        <pattern id="jumap-grain" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="rgba(0,0,0,0.10)" />
          <circle cx="26" cy="14" r="0.6" fill="rgba(0,0,0,0.07)" />
          <circle cx="14" cy="34" r="0.5" fill="rgba(0,0,0,0.06)" />
          <circle cx="38" cy="40" r="0.7" fill="rgba(0,0,0,0.09)" />
        </pattern>
      </defs>
      {/* Paper-grain wash behind everything else — much wider than the
          cluster, so even when fully zoomed out the canvas reads as a
          textured surface rather than a flat fog. */}
      <rect
        x={-8000}
        y={-8000}
        width={16000}
        height={16000}
        fill="url(#jumap-grain)"
        opacity={0.6}
        pointerEvents="none"
      />
      {/* Country regions — drawn BEFORE genre territories so they sit at
          the back as a large atlas backdrop. */}
      <g className="jumap-country-territories" aria-hidden="true">
        {countryTerritories.map((c) => (
          <g key={c.id} className="jumap-country-territory">
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={`url(#ct-${c.key})`}
            />
            {/* Atlas-style dashed boundary ring around the country */}
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r - 18}
              fill="none"
              stroke={`url(#cr-${c.key})`}
              strokeWidth={1.4}
              strokeDasharray="6 10"
              opacity={0.6}
            />
            <text
              x={c.cx}
              y={c.labelY}
              textAnchor="middle"
              className="jumap-country-label"
              fill={c.color}
            >
              {c.label}
            </text>
          </g>
        ))}
      </g>
      <g className="jumap-territories" aria-hidden="true">
        {territories.map((t) => (
          <g
            key={t.key}
            className="jumap-territory"
            style={{ ['--genre-tint' as string]: t.color }}
          >
            {t.blobs.map((b, i) => (
              <circle
                key={i}
                cx={b.cx}
                cy={b.cy}
                // Bigger radius to compensate for the gradient's soft fade
                // — the visible "stain" is roughly the previous filtered size.
                r={b.r * 1.55}
                fill={`url(#tt-${t.key})`}
                opacity={b.primary ? 0.95 : 0.55}
              />
            ))}
          </g>
        ))}
      </g>
      <g className="jumap-territory-labels" aria-hidden="true">
        {territories.map((t) => (
          <text
            key={t.key}
            className="jumap-territory-label"
            x={t.labelX}
            y={t.labelY}
            fill={t.color}
            textAnchor="middle"
          >
            {t.label}
          </text>
        ))}
      </g>
      <g className="jumap-orbits" aria-hidden="true">
        {orbits.map((o) => {
          const dim = focus !== null && focus !== o.name &&
            !(focus.startsWith(o.name + '|'))
          return (
            <circle
              key={o.id}
              cx={o.cx}
              cy={o.cy}
              r={o.r}
              fill={`url(#${o.id})`}
              opacity={dim ? 0.4 : 1}
            />
          )
        })}
      </g>
      <g className="jumap-bonds">
        {bonds.map((b, i) => {
          const active = focusedBond(b)
          const dim = focus !== null && !active
          const isOwn = b.kind === 'own'
          return (
            <line
              key={`${b.kind}|${b.from}|${b.to}`}
              className={
                'jumap-bond ' + (isOwn ? 'jumap-bond-own' : 'jumap-bond-feature') +
                (active ? ' jumap-bond-active' : '')
              }
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke={active && !isOwn ? 'url(#bond-grad)' : 'currentColor'}
              strokeOpacity={dim ? 0.04 : b.intensity * (active ? 1.4 : 1)}
              strokeWidth={
                active ? 1.7 : isOwn ? 0.5 : 1.1
              }
              strokeDasharray={isOwn ? '2 3' : undefined}
              style={{
                ['--bond-i' as string]: i,
              }}
            />
          )
        })}
      </g>
      {artistsPlaced.map((a) => (
        <ArtistBubble
          key={a.name}
          a={a}
          focus={focus}
          onFocus={setFocus}
          onDragStart={onArtistDragStart}
        />
      ))}
      {songsPlaced.map((s) => (
        <SongBubble
          key={s.id}
          s={s}
          focus={focus}
          onFocus={setFocus}
          onOpen={setOpenSong}
          onRipple={addRipple}
        />
      ))}
      {ripples.map((rp) => (
        <circle
          key={rp.id}
          className="jumap-ripple"
          cx={rp.cx}
          cy={rp.cy}
          r={rp.r}
          fill="none"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth={2}
        />
      ))}
    </>
  )
})

export function JumapPage() {
  const [focus, setFocus] = useState<string | null>(null)
  const [openSong, setOpenSong] = useState<PlacedSong | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const width = 960
  const height = 640
  // Two-step placement: artists first via genre rings + phyllotaxis, then
  // songs in orbit around each artist. A single force pass then settles all
  // bubbles together so song moons drift to the orbit boundary between
  // featured artists, and no two bubbles overlap.
  const [viewMode, setViewMode] = useState<ViewMode>('country')
  const { artistsPlaced, songsPlaced } = useMemo(() => {
    // Two-pass layout, view-mode-aware:
    //   (1) Place artists per mode (country / genre / tier) then force-sim
    //       just the artists with their predicted orbit radii.
    //   (2) Lay songs out around the now-settled artists, then force-sim
    //       again with artists frozen — songs anchor to their planet's
    //       final position.
    const a = place(artists, width, height, viewMode)
    forceLayoutNodes(a, 700)
    const s = placeSongsAround(a)
    forceLayoutNodes([...a, ...s], 500, { freezeArtists: true })
    return { artistsPlaced: a, songsPlaced: s }
  }, [viewMode])
  const territories = useMemo(() => computeTerritories(artistsPlaced), [artistsPlaced])
  // Coarse country / region territory — much larger soft blob behind the
  // genre territories so it reads as a region atlas at any zoom.
  const countryTerritories = useMemo(() => {
    const byCountry = new Map<string, PlacedArtist[]>()
    for (const a of artistsPlaced) {
      const c = countryOfGenre(artistPrimaryGenre(a))
      if (!byCountry.has(c)) byCountry.set(c, [])
      byCountry.get(c)!.push(a)
    }
    return COUNTRIES.flatMap((spec) => {
      const list = byCountry.get(spec.key)
      if (!list || list.length === 0) return []
      let cx = 0
      let cy = 0
      for (const a of list) { cx += a.cx; cy += a.cy }
      cx /= list.length
      cy /= list.length
      let r = 0
      for (const a of list) {
        const d = Math.hypot(a.cx - cx, a.cy - cy) + a.orbitR
        if (d > r) r = d
      }
      return [{
        id: `country-${spec.key}`,
        key: spec.key,
        cx,
        cy,
        // Extra padding so the country tint extends well past every artist
        // in it — reads as a region rather than a tight outline.
        r: r + 160,
        color: spec.color,
        label: spec.label,
        labelY: cy - r - 110,
      }]
    })
  }, [artistsPlaced])
  // Per-artist orbit halo: a soft tinted disk that contains the artist + all
  // its songs, giving a visual cue that those moons belong to the same
  // planet. Colour is the artist's primary genre tint.
  const orbits = useMemo(() => {
    return artistsPlaced.map((a) => {
      let maxReach = a.r
      for (const s of songsPlaced) {
        if (s.primaryArtist !== a.name) continue
        const d = Math.hypot(s.cx - a.cx, s.cy - a.cy) + s.r
        if (d > maxReach) maxReach = d
      }
      return {
        cx: a.cx,
        cy: a.cy,
        r: maxReach + 14,
        color: genreFor(artistPrimaryGenre(a)).color,
        // Sanitize artist name to a safe SVG id token.
        id: `orbit-${a.name.replace(/[^a-z0-9]/gi, '_')}`,
        name: a.name,
      }
    })
  }, [artistsPlaced, songsPlaced])
  // Replace the old intra-genre bonds with featuring bonds: lines from each
  // song with `features` to every named featured artist that's in the
  // roster. Falls back to the (artist-name) being missing silently.
  const bonds = useMemo<Bond[]>(() => {
    const aMap = new Map(artistsPlaced.map((a) => [a.name, a]))
    const out: Bond[] = []
    // Ownership tethers: each song to its primary planet. Soft thin
    // lines so the user can always trace which planet a moon belongs to.
    for (const s of songsPlaced) {
      const owner = aMap.get(s.primaryArtist)
      if (!owner) continue
      out.push({
        from: s.primaryArtist,
        to: s.id,
        x1: owner.cx, y1: owner.cy,
        x2: s.cx, y2: s.cy,
        intensity: 0.28,
        kind: 'own',
      })
    }
    // Featuring bonds: drawn on top, brighter, only for songs whose
    // featured artist is in the roster.
    for (const s of songsPlaced) {
      const feats = s.song.features
      if (!feats || feats.length === 0) continue
      for (const f of feats) {
        const fa = aMap.get(f)
        if (!fa) continue
        out.push({
          from: s.primaryArtist,
          to: f,
          x1: s.cx, y1: s.cy,
          x2: fa.cx, y2: fa.cy,
          intensity: 0.55,
          kind: 'feature',
        })
      }
    }
    return out
  }, [artistsPlaced, songsPlaced])
  // Stable reference so React.memo on song/artist bubbles can short-circuit
  // re-renders during pan/zoom (only `view` changes per pointer move).
  const addRipple = useCallback((r: Ripple) => {
    setRipples((cur) => [...cur, r])
    window.setTimeout(() => {
      setRipples((cur) => cur.filter((x) => x.id !== r.id))
    }, 900)
  }, [])


  // --- Pan / zoom on the SVG stage --------------------------------------------
  // The SVG keeps its virtual `width` × `height` canvas. The viewBox window
  // into it is shifted by (`view.x`, `view.y`) and shrunk/grown by `view.z`
  // (z>1 = zoomed in, z<1 = zoomed out). We support:
  //   • Mouse drag / single-finger touch  → pan
  //   • Plain mouse wheel / two-finger scroll → pan
  //   • Ctrl|⌘ + wheel  (also the synthetic ctrl-wheel browsers emit for
  //     trackpad pinch)                  → zoom around cursor
  //   • Two-finger pinch on touch        → zoom around mid-point
  //   • +/− buttons                      → zoom around canvas centre
  //
  // Drag-vs-click is disambiguated with a small movement threshold; a
  // pan that crosses it suppresses the synthesised click on pointerup
  // so bubbles don't open when you were just sliding the canvas.
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 4
  const clamp = (n: number, lo: number, hi: number) =>
    n < lo ? lo : n > hi ? hi : n

  // Cluster bounding box (in viewBox coords) — used to set both the
  // initial zoom (fit-to-content) and the pan envelope (no empty space).
  const bbox = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    for (const a of artistsPlaced) {
      const r = a.orbitR
      if (a.cx - r < minX) minX = a.cx - r
      if (a.cx + r > maxX) maxX = a.cx + r
      if (a.cy - r < minY) minY = a.cy - r
      if (a.cy + r > maxY) maxY = a.cy + r
    }
    if (!isFinite(minX)) return { minX: 0, maxX: width, minY: 0, maxY: height }
    return { minX, maxX, minY, maxY }
  }, [artistsPlaced])

  // Tight pan envelope hugged to the actual cluster (plus a small buffer)
  // — so users don't end up dragging into empty space and thinking the
  // map "barely moves". Each axis is symmetric around 0 (the canvas
  // centre), since both edges need to reach the cluster.
  const PAN_BUFFER = 140
  const PAN_MAX_X = Math.max(
    Math.abs(bbox.minX) + PAN_BUFFER,
    bbox.maxX - width + PAN_BUFFER,
    width * 0.3,
  )
  const PAN_MAX_Y = Math.max(
    Math.abs(bbox.minY) + PAN_BUFFER,
    bbox.maxY - height + PAN_BUFFER,
    height * 0.3,
  )

  // Initial view auto-fits the whole cluster, so users land seeing every
  // planet at once and only need to drag/zoom for detail.
  const initialView = useMemo(() => {
    const cw = bbox.maxX - bbox.minX + 160
    const ch = bbox.maxY - bbox.minY + 160
    const zX = width / cw
    const zY = height / ch
    // Don't auto-fit too small — past 0.4 song moons get hard to click.
    // With the new country super-ring the cluster spans a lot more, so
    // we allow zooming a bit further out than before.
    const z = Math.max(0.4, Math.min(1, Math.min(zX, zY)))
    const cx = (bbox.minX + bbox.maxX) / 2
    const cy = (bbox.minY + bbox.maxY) / 2
    return {
      x: cx - (width / z) / 2,
      y: cy - (height / z) / 2,
      z,
    }
  }, [bbox])

  // The view (pan + zoom) is held in a ref as the source of truth, and the
  // SVG viewBox is updated imperatively from refs in the pointer handlers
  // — bypassing React entirely during drag / wheel / pinch so we get smooth
  // 60 fps interaction even on mobile, regardless of how many bubbles are
  // rendered. State is only used for UI bits that need to re-render (the
  // zoom-percentage label, button disabled states).
  const [view, setView] = useState<{ x: number; y: number; z: number }>(initialView)
  const viewRef = useRef(view)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const contentRef = useRef<SVGGElement | null>(null)
  // Pan/zoom is applied as a transform on a content <g> rather than by
  // changing the SVG's viewBox. With `will-change: transform` (in CSS)
  // the browser can promote the group to its own compositing layer and
  // handle transform changes on the GPU — pinch zoom no longer triggers
  // a per-frame re-rasterisation of every bubble + gradient.
  const applyViewToDom = useCallback(() => {
    const g = contentRef.current
    if (!g) return
    const v = viewRef.current
    g.setAttribute(
      'transform',
      `translate(${-v.x * v.z} ${-v.y * v.z}) scale(${v.z})`,
    )
  }, [])
  // Keep DOM in sync with viewRef after every React render (including any
  // hover / focus / ripple re-render that happens mid-drag). Layout effect
  // runs synchronously before paint so there's no flicker.
  useLayoutEffect(() => {
    applyViewToDom()
  })
  // Coalesce setView calls — happens at most once per frame, only so the
  // zoom % label updates. The actual viewBox attribute is already being
  // updated imperatively from viewRef without waiting for React.
  const stateRafRef = useRef<number | null>(null)
  const scheduleStateSync = useCallback(() => {
    if (stateRafRef.current != null) return
    stateRafRef.current = requestAnimationFrame(() => {
      stateRafRef.current = null
      setView({ ...viewRef.current })
    })
  }, [])
  // commitView: the one path every input handler goes through. Updates the
  // ref + DOM immediately, schedules a state sync for any state-aware UI.
  const commitView = useCallback(
    (updater: (v: { x: number; y: number; z: number }) => { x: number; y: number; z: number }) => {
      viewRef.current = updater(viewRef.current)
      applyViewToDom()
      scheduleStateSync()
    },
    [applyViewToDom, scheduleStateSync],
  )
  useEffect(() => () => {
    if (stateRafRef.current != null) cancelAnimationFrame(stateRafRef.current)
  }, [])

  // All active pointers currently down on the SVG. 1 = drag, 2 = pinch.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const dragRef = useRef<
    | { pointerId: number; startX: number; startY: number; baseX: number; baseY: number; moved: boolean }
    | null
  >(null)
  const pinchRef = useRef<
    | {
        id1: number
        id2: number
        startDist: number
        startZoom: number
        // Midpoint of the two fingers when the pinch started (client px).
        midX: number
        midY: number
        baseX: number
        baseY: number
        rect: DOMRect
      }
    | null
  >(null)
  const [grabbing, setGrabbing] = useState(false)
  // Latches true once movement crosses the click/drag threshold so the
  // subsequent click event can be swallowed.
  const draggedRef = useRef(false)

  // Reframe the viewBox so a given client-space point keeps mapping to the
  // same content point as zoom changes. Pure function over a `view` value.
  const reframeAt = useCallback(
    (
      prev: { x: number; y: number; z: number },
      clientX: number,
      clientY: number,
      rect: { left: number; top: number; width: number; height: number },
      targetZ: number,
    ) => {
      if (rect.width === 0 || rect.height === 0) return prev
      const z = clamp(targetZ, MIN_ZOOM, MAX_ZOOM)
      const rx = (clientX - rect.left) / rect.width
      const ry = (clientY - rect.top) / rect.height
      const vbX = prev.x + rx * (width / prev.z)
      const vbY = prev.y + ry * (height / prev.z)
      return {
        x: clamp(vbX - rx * (width / z), -PAN_MAX_X, PAN_MAX_X),
        y: clamp(vbY - ry * (height / z), -PAN_MAX_Y, PAN_MAX_Y),
        z,
      }
    },
    [PAN_MAX_X, PAN_MAX_Y, width, height],
  )

  // macOS Safari trackpad pinch fires GestureEvent (not ctrl+wheel like
  // Chrome / Firefox), so without handling it the page itself zooms via
  // Safari's default. Listen for the gesture events, prevent default, and
  // map them through commitView like a wheel zoom.
  // We ALSO bind wheel as a native non-passive listener here — React's
  // synthetic wheel ends up passive in some browsers, and a passive
  // wheel handler's preventDefault is silently ignored, which lets the
  // page itself scroll while the user is trying to zoom Jumap (the very
  // scrollbar that then steals their vertical pan).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    let baseZoom = 1
    let baseCx = 0
    let baseCy = 0
    function onGestureStart(e: Event) {
      e.preventDefault()
      baseZoom = viewRef.current.z
      const ge = e as unknown as { clientX: number; clientY: number }
      baseCx = ge.clientX
      baseCy = ge.clientY
    }
    function onGestureChange(e: Event) {
      e.preventDefault()
      const ge = e as unknown as { scale: number; clientX: number; clientY: number }
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const targetZ = baseZoom * ge.scale
      const cx = ge.clientX || baseCx
      const cy = ge.clientY || baseCy
      commitView((v) => reframeAt(v, cx, cy, rect, targetZ))
    }
    function onGestureEnd(e: Event) { e.preventDefault() }
    function onNativeWheel(e: WheelEvent) {
      if (e.deltaX === 0 && e.deltaY === 0) return
      e.preventDefault()
      const svgEl = svgRef.current
      if (!svgEl) return
      const rect = svgEl.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const dy = Math.max(-80, Math.min(80, e.deltaY))
        const factor = Math.exp(-dy * 0.0009)
        commitView((v) => reframeAt(v, e.clientX, e.clientY, rect, v.z * factor))
        return
      }
      commitView((v) => {
        const scaleX = rect.width > 0 ? (width / v.z) / rect.width : 1
        const scaleY = rect.height > 0 ? (height / v.z) / rect.height : 1
        return {
          x: clamp(v.x + e.deltaX * scaleX, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(v.y + e.deltaY * scaleY, -PAN_MAX_Y, PAN_MAX_Y),
          z: v.z,
        }
      })
    }
    svg.addEventListener('gesturestart' as keyof SVGSVGElementEventMap, onGestureStart as EventListener)
    svg.addEventListener('gesturechange' as keyof SVGSVGElementEventMap, onGestureChange as EventListener)
    svg.addEventListener('gestureend' as keyof SVGSVGElementEventMap, onGestureEnd as EventListener)
    svg.addEventListener('wheel', onNativeWheel, { passive: false })
    return () => {
      svg.removeEventListener('gesturestart' as keyof SVGSVGElementEventMap, onGestureStart as EventListener)
      svg.removeEventListener('gesturechange' as keyof SVGSVGElementEventMap, onGestureChange as EventListener)
      svg.removeEventListener('gestureend' as keyof SVGSVGElementEventMap, onGestureEnd as EventListener)
      svg.removeEventListener('wheel', onNativeWheel)
    }
  }, [commitView, reframeAt, PAN_MAX_X, PAN_MAX_Y, width, height])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      // Only capture for touch / pen pointers. Capturing a *mouse*
      // pointer makes Safari dispatch the subsequent click to the
      // captured element (the SVG) rather than the original target
      // (the song bubble), so the song modal never opens. Mouse
      // mousemove still fires document-wide without capture, so drag
      // tracking works fine without it.
      if (e.pointerType !== 'mouse') {
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
      }

      // Read the live view from the ref — state can lag behind during a
      // pinch since we rAF-throttle setView. Reading viewRef avoids the
      // first pinch frame starting from a stale baseZoom / basePan.
      const liveView = viewRef.current
      if (pointersRef.current.size === 1) {
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          baseX: liveView.x,
          baseY: liveView.y,
          moved: false,
        }
        draggedRef.current = false
        setGrabbing(true)
      } else if (pointersRef.current.size === 2) {
        // Promote to pinch. Drop the drag so the same finger can't
        // pan-then-jump when pinch ends.
        const ids = Array.from(pointersRef.current.keys())
        const p1 = pointersRef.current.get(ids[0])!
        const p2 = pointersRef.current.get(ids[1])!
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        pinchRef.current = {
          id1: ids[0],
          id2: ids[1],
          startDist: Math.max(dist, 1),
          startZoom: liveView.z,
          midX: (p1.x + p2.x) / 2,
          midY: (p1.y + p2.y) / 2,
          baseX: liveView.x,
          baseY: liveView.y,
          rect: e.currentTarget.getBoundingClientRect(),
        }
        dragRef.current = null
        // Any tap after a pinch should not open a bubble.
        draggedRef.current = true
        setGrabbing(false)
      }
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const pr = pinchRef.current
      if (pr) {
        const p1 = pointersRef.current.get(pr.id1)
        const p2 = pointersRef.current.get(pr.id2)
        if (!p1 || !p2) return
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        if (dist < 1) return
        const targetZ = clamp(
          pr.startZoom * (dist / pr.startDist),
          MIN_ZOOM,
          MAX_ZOOM,
        )
        // Find the content point that was under the start midpoint, and
        // re-pan so that point lands under the CURRENT midpoint at the
        // new zoom. So the canvas tracks the fingers naturally — moving
        // the midpoint pans, spreading/pinching scales. Both at once.
        const startRx = (pr.midX - pr.rect.left) / pr.rect.width
        const startRy = (pr.midY - pr.rect.top) / pr.rect.height
        const anchorX = pr.baseX + startRx * (width / pr.startZoom)
        const anchorY = pr.baseY + startRy * (height / pr.startZoom)
        const curMidX = (p1.x + p2.x) / 2
        const curMidY = (p1.y + p2.y) / 2
        const curRx = (curMidX - pr.rect.left) / pr.rect.width
        const curRy = (curMidY - pr.rect.top) / pr.rect.height
        const nx = anchorX - curRx * (width / targetZ)
        const ny = anchorY - curRy * (height / targetZ)
        commitView(() => ({
          x: clamp(nx, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(ny, -PAN_MAX_Y, PAN_MAX_Y),
          z: targetZ,
        }))
        return
      }

      const d = dragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      const rect = e.currentTarget.getBoundingClientRect()
      const dxClient = e.clientX - d.startX
      const dyClient = e.clientY - d.startY
      // Raised threshold (was 4 → 8) so a regular click with tiny mouse
      // jitter doesn't get mis-classified as a drag and have its click
      // swallowed by onClickCapture. 8 client-px is still well below
      // anyone's intended pan motion.
      if (!d.moved && Math.hypot(dxClient, dyClient) > 8) {
        d.moved = true
        draggedRef.current = true
      }
      commitView((v) => {
        const scaleX = rect.width > 0 ? (width / v.z) / rect.width : 1
        const scaleY = rect.height > 0 ? (height / v.z) / rect.height : 1
        return {
          x: clamp(d.baseX - dxClient * scaleX, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(d.baseY - dyClient * scaleY, -PAN_MAX_Y, PAN_MAX_Y),
          z: v.z,
        }
      })
    },
    [PAN_MAX_X, PAN_MAX_Y, width, height, reframeAt, commitView],
  )

  const endPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId)
    const pr = pinchRef.current
    if (pr && (pr.id1 === e.pointerId || pr.id2 === e.pointerId)) {
      pinchRef.current = null
      // Handoff back to single-finger pan with whoever is left.
      const remaining = Array.from(pointersRef.current.entries())[0]
      if (remaining) {
        const [pid, pos] = remaining
        const v = viewRef.current
        dragRef.current = {
          pointerId: pid,
          startX: pos.x,
          startY: pos.y,
          baseX: v.x,
          baseY: v.y,
          moved: true,
        }
        setGrabbing(true)
      }
    } else if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null
      setGrabbing(false)
    }
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  // (Wheel handling is attached as a native non-passive listener in the
  // useEffect above so preventDefault is honoured everywhere.)

  // +/− buttons zoom around the canvas centre.
  const zoomBy = useCallback((factor: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    commitView((v) => reframeAt(v, cx, cy, rect, v.z * factor))
  }, [commitView, reframeAt])

  const resetView = useCallback(() => {
    commitView(() => initialView)
  }, [commitView, initialView])

  // Block the synthesized click that follows a drag so bubbles don't open.
  const onClickCapture = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (draggedRef.current) {
      e.stopPropagation()
      e.preventDefault()
      draggedRef.current = false
    }
  }, [])

  // --- Artist drag with soft-body physics --------------------------------
  // User grabs a planet, drags it, and the rest of the cluster responds
  // via repulsion + anchor pull springs. Songs of every artist follow
  // their planet rigidly (offset preserved). Updates are imperative
  // (setAttribute on each bubble's <g>) so React isn't invoked per frame.
  const artistDragRef = useRef<{
    name: string
    pointerId: number
    grabDx: number
    grabDy: number
    targetCx: number
    targetCy: number
    artistEls: Map<string, SVGGElement>
    songEls: Map<string, SVGGElement[]>
    livePos: Map<string, { cx: number; cy: number; vx: number; vy: number }>
    origPos: Map<string, { cx: number; cy: number; orbitR: number }>
    moved: boolean
  } | null>(null)
  const dragRafRef = useRef<number | null>(null)
  // Persistent per-artist offsets that survive re-renders. After a drag
  // ends, the artist keeps the dx/dy we last applied. A layout effect
  // re-applies them after every React render so a view-mode switch or
  // hover-driven re-render doesn't snap planets back.
  const dragOffsetsRef = useRef<Map<string, { dx: number; dy: number }>>(new Map())
  // Reset the persistent offsets when the underlying layout changes
  // (view mode switch), since the new memoised positions are the new
  // baseline.
  useEffect(() => {
    dragOffsetsRef.current = new Map()
  }, [artistsPlaced])
  useLayoutEffect(() => {
    if (!svgRef.current) return
    for (const [name, delta] of dragOffsetsRef.current) {
      const safe = name.replace(/(["\\])/g, '\\$1')
      const aEl = svgRef.current.querySelector(`[data-artist-name="${safe}"]`)
      if (aEl) aEl.setAttribute('transform', `translate(${delta.dx} ${delta.dy})`)
      const sEls = svgRef.current.querySelectorAll(`[data-song-artist="${safe}"]`)
      sEls.forEach((el) => el.setAttribute('transform', `translate(${delta.dx} ${delta.dy})`))
    }
  })

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    // Use SVG's getScreenCTM so we correctly invert the CSS transform
    // (perspective + rotateX tilt) plus the content-group transform.
    const g = contentRef.current
    if (!g) return { x: 0, y: 0 }
    const ctm = g.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    return {
      x: clientX * inv.a + clientY * inv.c + inv.e,
      y: clientX * inv.b + clientY * inv.d + inv.f,
    }
  }, [])

  const stopArtistDragLoop = useCallback(() => {
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current)
      dragRafRef.current = null
    }
  }, [])

  const onArtistDragStart = useCallback(
    (e: React.PointerEvent, name: string) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      // Don't compete with the canvas pan handler.
      e.stopPropagation()

      const world = clientToWorld(e.clientX, e.clientY)
      const aOrig = artistsPlaced.find((a) => a.name === name)
      if (!aOrig) return
      const existing = dragOffsetsRef.current.get(name) ?? { dx: 0, dy: 0 }
      const curCx = aOrig.cx + existing.dx
      const curCy = aOrig.cy + existing.dy

      // Snapshot DOM element refs so we don't re-query each frame.
      const svg = svgRef.current
      if (!svg) return
      const artistEls = new Map<string, SVGGElement>()
      svg.querySelectorAll<SVGGElement>('[data-artist-name]').forEach((el) => {
        const n = el.getAttribute('data-artist-name')
        if (n) artistEls.set(n, el)
      })
      const songEls = new Map<string, SVGGElement[]>()
      svg.querySelectorAll<SVGGElement>('[data-song-artist]').forEach((el) => {
        const n = el.getAttribute('data-song-artist')
        if (!n) return
        if (!songEls.has(n)) songEls.set(n, [])
        songEls.get(n)!.push(el)
      })

      // Live positions per artist (start at last-known = orig + persisted offset).
      const livePos = new Map<string, { cx: number; cy: number; vx: number; vy: number }>()
      const origPos = new Map<string, { cx: number; cy: number; orbitR: number }>()
      for (const a of artistsPlaced) {
        const off = dragOffsetsRef.current.get(a.name) ?? { dx: 0, dy: 0 }
        livePos.set(a.name, { cx: a.cx + off.dx, cy: a.cy + off.dy, vx: 0, vy: 0 })
        origPos.set(a.name, { cx: a.cx, cy: a.cy, orbitR: a.orbitR })
      }

      artistDragRef.current = {
        name,
        pointerId: e.pointerId,
        grabDx: world.x - curCx,
        grabDy: world.y - curCy,
        targetCx: curCx,
        targetCy: curCy,
        artistEls,
        songEls,
        livePos,
        origPos,
        moved: false,
      }
      // Latch grab so a click immediately after a drag doesn't open the
      // accidentally-clicked song behind the planet.
      draggedRef.current = false  // start fresh; will set true once moved
      setGrabbing(true)

      function onMove(ev: PointerEvent) {
        const drag = artistDragRef.current
        if (!drag || drag.pointerId !== ev.pointerId) return
        const w = clientToWorld(ev.clientX, ev.clientY)
        drag.targetCx = w.x - drag.grabDx
        drag.targetCy = w.y - drag.grabDy
        if (!drag.moved) {
          drag.moved = true
          draggedRef.current = true
        }
      }
      function onUp(ev: PointerEvent) {
        const drag = artistDragRef.current
        if (!drag || drag.pointerId !== ev.pointerId) return
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
        document.removeEventListener('pointercancel', onUp)
        // Persist final offsets per artist so the planets stay where the
        // user left them across React re-renders.
        for (const a of artistsPlaced) {
          const live = drag.livePos.get(a.name)
          const orig = drag.origPos.get(a.name)
          if (!live || !orig) continue
          dragOffsetsRef.current.set(a.name, {
            dx: live.cx - orig.cx,
            dy: live.cy - orig.cy,
          })
        }
        artistDragRef.current = null
        setGrabbing(false)
        // Let the loop wind down gracefully (it'll see no drag and exit).
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
      document.addEventListener('pointercancel', onUp)

      // Kick off the rAF physics loop.
      if (dragRafRef.current == null) {
        const STEP = 0.55
        const DAMPING = 0.78
        const ANCHOR_PULL = 0.030
        const REPULSION_BUFFER = 60
        const step = () => {
          const drag = artistDragRef.current
          // No active drag? Run one more settle pass then stop.
          let stillBusy = drag !== null
          // Source of truth for this frame's positions.
          // (Use drag.livePos if available, else fall back to last snapshot.)
          const live = drag ? drag.livePos : null
          if (live) {
            // 1) Force step on every non-grabbed artist.
            const names = Array.from(live.keys())
            for (const n of names) {
              const p = live.get(n)!
              const o = drag!.origPos.get(n)!
              if (n === drag!.name) {
                // Grabbed planet — snap toward pointer target, no spring.
                p.cx = drag!.targetCx
                p.cy = drag!.targetCy
                p.vx = 0
                p.vy = 0
                continue
              }
              let fx = 0
              let fy = 0
              // Anchor spring back to original spot.
              fx += (o.cx - p.cx) * ANCHOR_PULL
              fy += (o.cy - p.cy) * ANCHOR_PULL
              // Pairwise repulsion only when overlapping the buffer.
              for (const m of names) {
                if (m === n) continue
                const q = live.get(m)!
                const dx = p.cx - q.cx
                const dy = p.cy - q.cy
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
                const minDist = o.orbitR + drag!.origPos.get(m)!.orbitR + REPULSION_BUFFER
                if (dist < minDist) {
                  const push = (minDist - dist) * 0.45
                  fx += (dx / dist) * push
                  fy += (dy / dist) * push
                }
              }
              p.vx = (p.vx + fx * STEP) * DAMPING
              p.vy = (p.vy + fy * STEP) * DAMPING
              p.cx += p.vx
              p.cy += p.vy
              if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) stillBusy = true
            }
            // 2) Imperative DOM update — transform each bubble by (cx - orig).
            for (const n of names) {
              const p = live.get(n)!
              const o = drag!.origPos.get(n)!
              const dx = p.cx - o.cx
              const dy = p.cy - o.cy
              const aEl = drag!.artistEls.get(n)
              if (aEl) aEl.setAttribute('transform', `translate(${dx} ${dy})`)
              const sEls = drag!.songEls.get(n)
              if (sEls) for (const el of sEls) {
                el.setAttribute('transform', `translate(${dx} ${dy})`)
              }
            }
          }
          if (stillBusy) {
            dragRafRef.current = requestAnimationFrame(step)
          } else {
            dragRafRef.current = null
          }
        }
        dragRafRef.current = requestAnimationFrame(step)
      }
    },
    [artistsPlaced, clientToWorld],
  )
  useEffect(() => () => { stopArtistDragLoop() }, [stopArtistDragLoop])

  return (
    <div className="jumap-page">
      {/* Soft drifting background blobs */}
      <div className="jumap-bg" aria-hidden="true">
        <span className="jumap-bg-blob blob-1" />
        <span className="jumap-bg-blob blob-2" />
        <span className="jumap-bg-blob blob-3" />
        <span className="jumap-bg-blob blob-4" />
      </div>

      <div className="jumap-stage jumap-stage-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={'jumap-svg jumap-svg-pannable' + (grabbing ? ' is-grabbing' : '')}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          onClickCapture={onClickCapture}
        >
          <g ref={contentRef} className="jumap-content">
            <JumapSvgInner
              artistsPlaced={artistsPlaced}
              songsPlaced={songsPlaced}
              territories={territories}
              countryTerritories={countryTerritories}
              orbits={orbits}
              bonds={bonds}
              focus={focus}
              openSong={openSong}
              ripples={ripples}
              setFocus={setFocus}
              setOpenSong={setOpenSong}
              addRipple={addRipple}
              onArtistDragStart={onArtistDragStart}
            />
          </g>
        </svg>

        <div className="jumap-view-modes" role="tablist" aria-label="View grouping">
          {(['country', 'genre', 'tier'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={viewMode === m}
              className={'jumap-mode-btn' + (viewMode === m ? ' active' : '')}
              onClick={() => setViewMode(m)}
            >
              {m === 'country' ? 'Country' : m === 'genre' ? 'Genre' : 'Tier'}
            </button>
          ))}
        </div>

        <div className="jumap-zoom-controls" aria-label="Zoom controls">
          <button
            type="button"
            className="jumap-zoom-btn"
            onClick={() => zoomBy(1.2)}
            disabled={view.z >= MAX_ZOOM - 1e-3}
            aria-label="Zoom in"
            title="Zoom in"
          >+</button>
          <button
            type="button"
            className="jumap-zoom-btn jumap-zoom-reset"
            onClick={resetView}
            aria-label="Reset view"
            title="Reset view"
          >{Math.round(view.z * 100)}%</button>
          <button
            type="button"
            className="jumap-zoom-btn"
            onClick={() => zoomBy(1 / 1.2)}
            disabled={view.z <= MIN_ZOOM + 1e-3}
            aria-label="Zoom out"
            title="Zoom out"
          >−</button>
        </div>

        <aside className="jumap-legend" aria-label="Tier legend">
          <div className="jumap-legend-section">
            <div className="jumap-legend-head">Tiers</div>
            {TIERS.map((t) => (
              <div key={t} className="jumap-legend-row jumap-legend-tier-row">
                <img
                  className="jumap-legend-tier-crown"
                  src={tierCrownSrc(t)}
                  alt=""
                  width={26}
                  height={Math.round((26 * 232) / 354)}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </aside>
      </div>

      {openSong && (
        <SongModal
          primaryArtist={openSong.primaryArtist}
          song={openSong.song}
          onClose={() => setOpenSong(null)}
        />
      )}
    </div>
  )
}
