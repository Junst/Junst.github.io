import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  artists,
  GENRES,
  TIERS,
  TIER_LABEL,
  bubbleRadius,
  bestTier,
  genreFor,
  groupArtistsByGenre,
  presentGenres,
  artistPrimaryGenre,
  artistGenres,
  sortArtists,
  artistFaceFor,
  type Artist,
  type Song,
} from '../data/jumap'
import { useAlbumArt } from '../components/AlbumArt'
import { albumArtFor } from '../data/album-art'

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
    const ringR = Math.min(width, height) * 0.27
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
        : Math.min(width, height) * 0.09 + i * 10
      const angle = (i / Math.max(1, cluster.length)) * Math.PI * 2 + seedAngle
      out.push({
        ...a,
        cx: c.x + Math.cos(angle) * localRadius,
        cy: c.y + Math.sin(angle) * localRadius,
        r,
        driftDelay: -(sd * 12),                  // 0..-12s offset
        driftDuration: 8 + (sd * 6),             // 8..14s loop
      })
    })
  }

  return out
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
  const face = artistFaceFor(a, albumArtFor)
  const clipId = `bubble-face-${a.name.replace(/[^a-z0-9]/gi, '_')}`
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
          <circle cx={a.cx} cy={a.cy} r={a.r} />
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
      {/* Artist face — clipped to circle, frosted */}
      {face && (
        <image
          href={face}
          x={a.cx - a.r}
          y={a.cy - a.r}
          width={a.r * 2}
          height={a.r * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
          opacity={(focused ? 0.92 : 0.78) * shapeOpacity}
          style={{ filter: focused ? 'saturate(1.05)' : 'saturate(0.92) brightness(1.02)' }}
        />
      )}
      {/* Frosted pastel overlay sitting on top of the face */}
      <circle
        cx={a.cx}
        cy={a.cy}
        r={a.r}
        fill={`url(#bubble-${primary.key})`}
        opacity={(focused ? 0.55 : 0.7) * shapeOpacity}
        stroke={secondary?.color ?? primary.color}
        strokeOpacity={(secondary ? 0.55 : 0.42) * shapeOpacity}
        strokeWidth={secondary ? 2.5 : 1.4}
        strokeDasharray={secondary ? '5 4' : undefined}
      />
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
      {/* Artist name + tier label — always full opacity */}
      <text
        x={a.cx}
        y={a.cy + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="jumap-artist"
        opacity="1"
      >
        {a.name}
      </text>
      <text
        x={a.cx}
        y={a.cy + a.r * 0.55}
        textAnchor="middle"
        className="jumap-tier"
        opacity="1"
      >
        {TIER_LABEL[bestTier(a)]}
      </text>
    </g>
  )
}

function SongRow({ artist, song }: { artist: string; song: Song }) {
  const { src, color } = useAlbumArt(artist, song.title)
  return (
    <li
      className="jumap-modal-song"
      style={color ? { ['--song-tint' as string]: color } : undefined}
    >
      <span className="jumap-modal-song-tier">{TIER_LABEL[song.tier]}</span>
      {src ? (
        <img
          className="jumap-modal-song-art"
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="jumap-modal-song-art-placeholder" aria-hidden="true">♪</span>
      )}
      <div className="jumap-modal-song-body">
        <div className="jumap-modal-song-title">{song.title}</div>
        {(song.year || song.note) && (
          <div className="jumap-modal-song-meta">
            {song.year && <span className="jumap-modal-song-year">{song.year}</span>}
            {song.note && (
              <span
                className="jumap-modal-song-note"
                dangerouslySetInnerHTML={{ __html: song.note }}
              />
            )}
          </div>
        )}
      </div>
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
    (a, b) => a.tier - b.tier || a.title.localeCompare(b.title),
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
          <span
            className="jumap-modal-tier"
            style={{ background: primary.color }}
          >
            {TIER_LABEL[bestTier(artist)]}
          </span>
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
  const placed = useMemo(() => place(artists, width, height), [])

  function addRipple(r: Ripple) {
    setRipples((cur) => [...cur, r])
    window.setTimeout(() => {
      setRipples((cur) => cur.filter((x) => x.id !== r.id))
    }, 900)
  }

  return (
    <div className="jumap-page">
      {/* Soft drifting background blobs */}
      <div className="jumap-bg" aria-hidden="true">
        <span className="jumap-bg-blob blob-1" />
        <span className="jumap-bg-blob blob-2" />
        <span className="jumap-bg-blob blob-3" />
        <span className="jumap-bg-blob blob-4" />
      </div>
      <Link to="/" className="back-link jumap-back">← back</Link>

      <div className="jumap-stage jumap-stage-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="jumap-svg" preserveAspectRatio="xMidYMid meet">
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
          </defs>
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

        <aside className="jumap-legend" aria-label="Genre legend">
          <div className="jumap-legend-section">
            <div className="jumap-legend-head">Genres</div>
            {presentGenres(artists).map((g) => (
              <div key={g.key} className="jumap-legend-row">
                <span className="jumap-swatch" style={{ background: g.color }} />
                <span className="jumap-legend-label">{g.label}</span>
              </div>
            ))}
          </div>
          <div className="jumap-legend-section">
            <div className="jumap-legend-head">Tiers</div>
            {TIERS.map((t) => (
              <div key={t} className="jumap-legend-row">
                <span className="jumap-tier-chip">{TIER_LABEL[t]}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {open && <ArtistModal artist={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
