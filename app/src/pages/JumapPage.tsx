import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

interface PlacedArtist extends Artist {
  cx: number
  cy: number
  r: number
  // Idle drift seeds (deterministic so the motion is stable per artist)
  driftDelay: number
  driftDuration: number
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
      // Tight hug around the bubble so distinct genres have visible gaps;
      // overlap only happens where two genres actually share an artist.
      ...primaries.map((m) => ({ cx: m.cx, cy: m.cy, r: m.r * 1.45 + 10, primary: true })),
      ...secondaries.map((m) => ({ cx: m.cx, cy: m.cy, r: m.r * 1.05 + 6, primary: false })),
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

function computeBonds(placed: PlacedArtist[]): Bond[] {
  const bonds: Bond[] = []
  // Intra-cluster bonds: connect artists who share a primary genre, weight by
  // proximity so close pairs draw a brighter line.
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j]
      const samePrimary = artistPrimaryGenre(a) === artistPrimaryGenre(b)
      const aSet = new Set(artistGenres(a))
      const sharedSecondary = artistGenres(b).some((g) => aSet.has(g))
      if (!samePrimary && !sharedSecondary) continue
      const dx = a.cx - b.cx, dy = a.cy - b.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Skip ultra-far cross-cluster bonds to keep the graph readable
      if (!samePrimary && dist > 320) continue
      const intensity = samePrimary
        ? Math.max(0.18, Math.min(0.5, 1 - dist / 320))
        : Math.max(0.08, Math.min(0.22, 1 - dist / 360))
      bonds.push({
        from: a.name, to: b.name,
        x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy,
        intensity,
      })
    }
  }
  return bonds
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
    const ringR = Math.min(width, height) * 0.95
    primaryGenres.forEach((g, i) => {
      const angle = (i / primaryGenres.length) * Math.PI * 2 - Math.PI / 2
      centres[g.key] = {
        x: cx + Math.cos(angle) * ringR,
        y: cy + Math.sin(angle) * ringR,
      }
    })
  }

  for (const g of primaryGenres) {
    const c = centres[g.key]
    const cluster = sortArtists(groups.get(g.key) ?? [])
    cluster.forEach((a, i) => {
      const r = bubbleRadius(a)
      const sd = seed(a.name)
      const seedAngle = sd * Math.PI * 2
      const localRadius = cluster.length === 1
        ? 0
        : Math.min(width, height) * 0.22 + i * 34

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
        pullX = (sx - c.x) * 0.32
        pullY = (sy - c.y) * 0.32
      }

      const angle = (i / Math.max(1, cluster.length)) * Math.PI * 2 + seedAngle
      out.push({
        ...a,
        cx: c.x + pullX + Math.cos(angle) * localRadius,
        cy: c.y + pullY + Math.sin(angle) * localRadius,
        r,
        driftDelay: -(sd * 12),                  // 0..-12s offset
        driftDuration: 8 + (sd * 6),             // 8..14s loop
      })
    })
  }

  return out
}

// Push overlapping bubbles apart with a few quick relaxation passes so the
// genre clusters breathe instead of stacking on top of each other.
function relaxOverlaps(
  items: PlacedArtist[],
  width: number,
  height: number,
  iterations = 80,
  pad = 10,
): void {
  for (let it = 0; it < iterations; it++) {
    let moved = false
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j]
        const dx = b.cx - a.cx, dy = b.cy - a.cy
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01
        const minDist = a.r + b.r + pad
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const ux = dx / dist, uy = dy / dist
          a.cx -= ux * push
          a.cy -= uy * push
          b.cx += ux * push
          b.cy += uy * push
          moved = true
        }
      }
    }
    if (!moved) break
  }
  // Keep everything inside the viewbox so bubbles don't drift off-canvas.
  for (const a of items) {
    a.cx = Math.max(a.r + 6, Math.min(width - a.r - 6, a.cx))
    a.cy = Math.max(a.r + 6, Math.min(height - a.r - 6, a.cy))
  }
}

interface Ripple { id: number; cx: number; cy: number; r: number }

function ArtistBubble({
  a, focus, onFocus, onOpen, onRipple,
}: {
  a: PlacedArtist
  focus: string | null
  onFocus: (key: string | null) => void
  onOpen: (a: Artist) => void
  onRipple: (r: Ripple) => void
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
      className={'jumap-bubble' + (focused ? ' focused' : '')}
      style={{
        ['--drift-delay' as string]: `${a.driftDelay}s`,
        ['--drift-duration' as string]: `${a.driftDuration}s`,
      }}
      onMouseEnter={() => onFocus(a.name)}
      onMouseLeave={() => onFocus(null)}
      onClick={() => {
        onRipple({ id: Date.now() + Math.random(), cx: a.cx, cy: a.cy, r: a.r })
        onOpen(a)
      }}
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
}

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

function ArtistModal({ artist, onClose }: { artist: Artist; onClose: () => void }) {
  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Lock body scroll while modal open
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const primary = genreFor(artistPrimaryGenre(artist))
  const sorted = [...artist.songs].sort(
    (a, b) =>
      a.tier - b.tier ||
      (b.subTier ?? 0) - (a.subTier ?? 0) ||
      a.title.localeCompare(b.title),
  )

  return (
    <div className="jumap-modal-backdrop" onClick={onClose}>
      <div
        className="jumap-modal"
        role="dialog"
        aria-label={artist.name}
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
        <header className="jumap-modal-head">
          <img
            className="jumap-modal-tier-crown"
            src={tierCrownSrc(bestTier(artist))}
            alt=""
            width={32}
            height={Math.round((32 * 232) / 354)}
          />
          <h2 className="jumap-modal-name">{artist.name}</h2>
          <div className="jumap-modal-genres">
            {artistGenres(artist).map((k) => genreFor(k).label).join(' · ')}
          </div>
        </header>
        {sorted.length === 0 ? (
          <p className="jumap-modal-empty">No songs logged yet.</p>
        ) : (
          <ol className="jumap-modal-songs">
            {sorted.map((s, i) => (
              <SongRow key={i} artist={artist.name} song={s} />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export function JumapPage() {
  const [focus, setFocus] = useState<string | null>(null)
  const [open, setOpen] = useState<Artist | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const width = 960
  const height = 640
  const placed = useMemo(() => {
    const p = place(artists, width, height)
    relaxOverlaps(p, width, height, 220, 120)
    return p
  }, [])
  const bonds = useMemo(() => computeBonds(placed), [placed])
  const territories = useMemo(() => computeTerritories(placed), [placed])
  const focusedBond = (b: Bond) => focus === b.from || focus === b.to

  function addRipple(r: Ripple) {
    setRipples((cur) => [...cur, r])
    window.setTimeout(() => {
      setRipples((cur) => cur.filter((x) => x.id !== r.id))
    }, 900)
  }

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
  // Wide pan envelope — about ±2× the virtual canvas in either axis so the
  // user can drift far outside the now-larger territory cluster before
  // hitting a wall.
  const PAN_MAX_X = Math.round(width * 2.5)
  const PAN_MAX_Y = Math.round(height * 2.5)
  const MIN_ZOOM = 0.3
  const MAX_ZOOM = 4
  const clamp = (n: number, lo: number, hi: number) =>
    n < lo ? lo : n > hi ? hi : n

  const [view, setView] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 1,
  })
  const svgRef = useRef<SVGSVGElement | null>(null)
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

      if (pointersRef.current.size === 1) {
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          baseX: view.x,
          baseY: view.y,
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
          startZoom: view.z,
          midX: (p1.x + p2.x) / 2,
          midY: (p1.y + p2.y) / 2,
          baseX: view.x,
          baseY: view.y,
          rect: e.currentTarget.getBoundingClientRect(),
        }
        dragRef.current = null
        // Any tap after a pinch should not open a bubble.
        draggedRef.current = true
        setGrabbing(false)
      }
    },
    [view.x, view.y, view.z],
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
        const targetZ = pr.startZoom * (dist / pr.startDist)
        setView(() => reframeAt(
          { x: pr.baseX, y: pr.baseY, z: pr.startZoom },
          pr.midX,
          pr.midY,
          pr.rect,
          targetZ,
        ))
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
      setView((v) => {
        const scaleX = rect.width > 0 ? (width / v.z) / rect.width : 1
        const scaleY = rect.height > 0 ? (height / v.z) / rect.height : 1
        return {
          x: clamp(d.baseX - dxClient * scaleX, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(d.baseY - dyClient * scaleY, -PAN_MAX_Y, PAN_MAX_Y),
          z: v.z,
        }
      })
    },
    [PAN_MAX_X, PAN_MAX_Y, width, height, reframeAt],
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
        setView((v) => {
          dragRef.current = {
            pointerId: pid,
            startX: pos.x,
            startY: pos.y,
            baseX: v.x,
            baseY: v.y,
            moved: true,
          }
          return v
        })
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
        setView((v) => reframeAt(v, e.clientX, e.clientY, rect, v.z * factor))
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      setView((v) => {
        const scaleX = rect.width > 0 ? (width / v.z) / rect.width : 1
        const scaleY = rect.height > 0 ? (height / v.z) / rect.height : 1
        return {
          x: clamp(v.x + e.deltaX * scaleX, -PAN_MAX_X, PAN_MAX_X),
          y: clamp(v.y + e.deltaY * scaleY, -PAN_MAX_Y, PAN_MAX_Y),
          z: v.z,
        }
      })
    },
    [PAN_MAX_X, PAN_MAX_Y, width, height, reframeAt],
  )

  // +/− buttons zoom around the canvas centre.
  const zoomBy = useCallback((factor: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setView((v) => reframeAt(v, cx, cy, rect, v.z * factor))
  }, [reframeAt])

  const resetView = useCallback(() => {
    setView({ x: 0, y: 0, z: 1 })
  }, [])

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
          viewBox={`${view.x} ${view.y} ${width / view.z} ${height / view.z}`}
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
            {/* Metaball goo filter — fuses individual circle footprints inside
                a single <g> into one organic blob with crisp soft edges. */}
            <filter id="jumap-goo" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
                result="goo"
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
          {/* Genre territories — drawn first, so bonds + bubbles render on top.
              Each genre is its own goo group so it fuses internally but blends
              with neighbouring genres via mix-blend-mode. */}
          <g className="jumap-territories" aria-hidden="true">
            {territories.map((t) => (
              <g
                key={t.key}
                className="jumap-territory"
                filter="url(#jumap-goo)"
                style={{ ['--genre-tint' as string]: t.color }}
              >
                {t.blobs.map((b, i) => (
                  <circle
                    key={i}
                    cx={b.cx}
                    cy={b.cy}
                    r={b.r}
                    fill={t.color}
                    fillOpacity={b.primary ? 0.32 : 0.18}
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
          {/* Connective bonds — drawn first so bubbles sit on top */}
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
          {placed.map((a) => (
            <ArtistBubble
              key={a.name}
              a={a}
              focus={focus}
              onFocus={setFocus}
              onOpen={setOpen}
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

      {open && <ArtistModal artist={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
