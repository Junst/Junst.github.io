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
  TIERS,
  bubbleRadius,
  bestTier,
  genreFor,
  groupArtistsByGenre,
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

interface Bond { from: string; to: string; x1: number; y1: number; x2: number; y2: number; intensity: number }

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

function place(items: Artist[], width: number, height: number): PlacedArtist[] {
  const groups = groupArtistsByGenre(items)
  const primaryGenres = GENRES.filter((g) => groups.has(g.key))
  const out: PlacedArtist[] = []
  const cx = width / 2
  const cy = height / 2

  const centres: Record<string, { x: number; y: number }> = {}
  if (primaryGenres.length === 1) {
    centres[primaryGenres[0].key] = { x: cx, y: cy }
  } else {
    // Wider ring so distinct genres have visible breathing room between
    // their territories; cross-genre overlap still happens via the
    // secondary-genre pull below.
    const ringR = Math.min(width, height) * 1.05
    primaryGenres.forEach((g, i) => {
      const angle = (i / primaryGenres.length) * Math.PI * 2 - Math.PI / 2
      centres[g.key] = {
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
      }
    })
  }

  // Phyllotaxis (sunflower spiral): angle_i = i · golden_angle, radius
  // grows with sqrt(i). Naturally produces a near-uniform packing for any
  // cluster size without paired bubbles ever landing on top of each other.
  for (const g of primaryGenres) {
    const c = centres[g.key]
    const cluster = sortArtists(groups.get(g.key) ?? [])
    cluster.forEach((a, i) => {
      const r = bubbleRadius(a)
      const sd = seed(a.name)
      // Per-cluster phase rotation derived from the first artist's seed so
      // the spirals don't all point the same way.
      const phase = seed(cluster[0].name) * Math.PI * 2
      const angle = i * GOLDEN_ANGLE + phase
      const localRadius = cluster.length === 1
        ? 0
        : Math.sqrt(i + 0.6) * 120

      // Pull toward the average of this artist's *secondary* genre centroids,
      // so cross-genre artists (e.g. Travis Scott rage+hiphop) sit between
      // territories instead of fully inside their primary one. The shared
      // genre's coloured footprint then bridges into the neighbour's blob.
      let pullX = 0, pullY = 0
      const secondaries = artistGenres(a).filter((k) => k !== g.key && centres[k])
      if (secondaries.length > 0) {
        let sx = 0, sy = 0
        for (const sk of secondaries) { sx += centres[sk].x; sy += centres[sk].y }
        sx /= secondaries.length; sy /= secondaries.length
        pullX = (sx - c.x) * 0.30
        pullY = (sy - c.y) * 0.30
      }

      out.push({
        ...a,
        kind: 'artist',
        cx: c.x + pullX + Math.cos(angle) * localRadius,
        cy: c.y + pullY + Math.sin(angle) * localRadius,
        r,
        // Predicted orbit reach so the artist-only force pass has something
        // to enforce against. placeSongsAround refines this later.
        orbitR: estimateOrbitR(a),
        driftDelay: -(sd * 12),                  // 0..-12s offset
        driftDuration: 8 + (sd * 6),             // 8..14s loop
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

  // Extra padding once the two orbits clear each other.
  const GAP_AA_BUFFER = 90
  const GAP_AA_MIN = 220
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
          minDist = Math.max(
            2 * Math.max(a.orbitR, b.orbitR) + 60,
            a.orbitR + b.orbitR + GAP_AA_BUFFER,
            a.r + b.r + GAP_AA_MIN,
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
  a, focus, onFocus,
}: {
  a: PlacedArtist
  focus: string | null
  onFocus: (key: string | null) => void
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
      style={{
        ['--drift-delay' as string]: `${a.driftDelay}s`,
        ['--drift-duration' as string]: `${a.driftDuration}s`,
      }}
      onMouseEnter={() => onFocus(a.name)}
      onMouseLeave={() => onFocus(null)}
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

// Heavy SVG inner — everything that's expensive to reconcile (territories,
// orbit halos, feature bonds, all bubble nodes, ripples). Memoised so the
// pan / zoom re-renders of JumapPage skip this entire subtree as long as
// the data + focus + ripples haven't changed. Only the <svg> viewBox
// attribute updates per frame during drag.
const JumapSvgInner = memo(function JumapSvgInner({
  artistsPlaced, songsPlaced, territories, orbits, bonds,
  focus, openSong, ripples,
  setFocus, setOpenSong, addRipple,
}: {
  artistsPlaced: PlacedArtist[]
  songsPlaced: PlacedSong[]
  territories: Territory[]
  orbits: Orbit[]
  bonds: Bond[]
  focus: string | null
  openSong: PlacedSong | null
  ripples: Ripple[]
  setFocus: (k: string | null) => void
  setOpenSong: (s: PlacedSong | null) => void
  addRipple: (r: Ripple) => void
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
            <stop offset="0%"   stopColor={g.color} stopOpacity="0.62" />
            <stop offset="55%"  stopColor={g.color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={g.color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
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
          return (
            <line
              key={`${b.from}|${b.to}`}
              className={'jumap-bond' + (active ? ' jumap-bond-active' : '')}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke={active ? 'url(#bond-grad)' : 'currentColor'}
              strokeOpacity={dim ? 0.05 : b.intensity * (active ? 1.4 : 1)}
              strokeWidth={active ? 1.6 : 0.9}
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
  const { artistsPlaced, songsPlaced } = useMemo(() => {
    // Two-pass layout:
    //   (1) Place artists from genre rings + phyllotaxis, then run the force
    //       sim on just the artists with their *predicted* orbit radii so
    //       gaps are enforced before any songs are committed to positions.
    //   (2) Lay songs out around the now-settled artists, then run the sim
    //       again with artists frozen — songs anchor to their primary
    //       planet's actual final position, so a small-orbit artist (e.g.
    //       ILLIT) doesn't end up with its songs marooned next to a bigger
    //       neighbour like NewJeans.
    const a = place(artists, width, height)
    forceLayoutNodes(a, 700)
    const s = placeSongsAround(a)
    forceLayoutNodes([...a, ...s], 500, { freezeArtists: true })
    return { artistsPlaced: a, songsPlaced: s }
  }, [])
  const territories = useMemo(() => computeTerritories(artistsPlaced), [artistsPlaced])
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
          intensity: 0.5,
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
    const z = Math.max(MIN_ZOOM, Math.min(1, Math.min(zX, zY)))
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

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }

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
      if (!d.moved && Math.hypot(dxClient, dyClient) > 4) {
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

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (e.deltaX === 0 && e.deltaY === 0) return
      e.preventDefault()
      // Browsers surface trackpad pinch as a wheel event with ctrlKey set.
      if (e.ctrlKey || e.metaKey) {
        // Clamp single-event delta to keep chunky mouse wheels from
        // teleporting; a smaller per-event step (0.0009) makes both
        // mouse wheels and trackpads feel like fine-grained zoom.
        const dy = Math.max(-80, Math.min(80, e.deltaY))
        const factor = Math.exp(-dy * 0.0009)
        const rect = e.currentTarget.getBoundingClientRect()
        commitView((v) => reframeAt(v, e.clientX, e.clientY, rect, v.z * factor))
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      commitView((v) => {
        const scaleX = rect.width > 0 ? (width / v.z) / rect.width : 1
        const scaleY = rect.height > 0 ? (height / v.z) / rect.height : 1
        return {
          x: clamp(v.x + e.deltaX * scaleX, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(v.y + e.deltaY * scaleY, -PAN_MAX_Y, PAN_MAX_Y),
          z: v.z,
        }
      })
    },
    [PAN_MAX_X, PAN_MAX_Y, width, height, reframeAt, commitView],
  )

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
          overflow="visible"
          className={'jumap-svg jumap-svg-pannable' + (grabbing ? ' is-grabbing' : '')}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          onWheel={onWheel}
          onClickCapture={onClickCapture}
        >
          <g ref={contentRef} className="jumap-content">
            <JumapSvgInner
              artistsPlaced={artistsPlaced}
              songsPlaced={songsPlaced}
              territories={territories}
              orbits={orbits}
              bonds={bonds}
              focus={focus}
              openSong={openSong}
              ripples={ripples}
              setFocus={setFocus}
              setOpenSong={setOpenSong}
              addRipple={addRipple}
            />
          </g>
        </svg>

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
