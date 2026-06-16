import { useMemo, useState } from 'react'
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
  type Artist,
} from '../data/jumap'

interface PlacedArtist extends Artist {
  cx: number
  cy: number
  r: number
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
      const seedAngle = seed(a.name) * Math.PI * 2
      const localRadius = cluster.length === 1
        ? 0
        : Math.min(width, height) * 0.09 + i * 10
      const angle = (i / Math.max(1, cluster.length)) * Math.PI * 2 + seedAngle
      out.push({
        ...a,
        cx: c.x + Math.cos(angle) * localRadius,
        cy: c.y + Math.sin(angle) * localRadius,
        r,
      })
    })
  }

  return out
}

interface Ripple { id: number; cx: number; cy: number; r: number }

function ArtistBubble({
  a, focus, onFocus, onRipple,
}: {
  a: PlacedArtist
  focus: string | null
  onFocus: (key: string | null) => void
  onRipple: (r: Ripple) => void
}) {
  const primary = genreFor(artistPrimaryGenre(a))
  const genres = artistGenres(a)
  const secondary = genres.length > 1 ? genreFor(genres.find((g) => g !== primary.key) ?? '') : null
  const focused = focus === a.name
  const dim = focus != null && !focused
  return (
    <g
      className={'jumap-bubble' + (focused ? ' focused' : '')}
      style={{ opacity: dim ? 0.18 : 1 }}
      onMouseEnter={() => onFocus(a.name)}
      onMouseLeave={() => onFocus(null)}
      onClick={() => {
        onRipple({ id: Date.now() + Math.random(), cx: a.cx, cy: a.cy, r: a.r })
        onFocus(focused ? null : a.name)
      }}
    >
      {/* Shadow ellipse underneath */}
      <ellipse
        cx={a.cx}
        cy={a.cy + a.r * 0.94}
        rx={a.r * 0.74}
        ry={a.r * 0.14}
        fill="#000"
        opacity={focused ? 0.14 : 0.07}
      />
      {/* Bubble — radial gradient through pastel band, soft transparent */}
      <circle
        cx={a.cx}
        cy={a.cy}
        r={a.r}
        fill={`url(#bubble-${primary.key})`}
        opacity={focused ? 0.95 : 0.72}
        stroke={secondary?.color ?? primary.color}
        strokeOpacity={secondary ? 0.6 : 0.45}
        strokeWidth={secondary ? 3 : 1.5}
        strokeDasharray={secondary ? '5 4' : undefined}
      />
      {/* Specular sheen */}
      <ellipse
        cx={a.cx - a.r * 0.34}
        cy={a.cy - a.r * 0.42}
        rx={a.r * 0.4}
        ry={a.r * 0.22}
        fill="url(#bubble-highlight)"
        opacity={focused ? 0.85 : 0.7}
        pointerEvents="none"
      />
      {/* Artist name centred */}
      <text
        x={a.cx}
        y={a.cy + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="jumap-artist"
      >
        {a.name}
      </text>
      <text
        x={a.cx}
        y={a.cy + a.r * 0.55}
        textAnchor="middle"
        className="jumap-tier"
      >
        {TIER_LABEL[bestTier(a)]}
      </text>
    </g>
  )
}

export function JumapPage() {
  const [focus, setFocus] = useState<string | null>(null)
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

  const focused = focus ? artists.find((a) => a.name === focus) : null

  return (
    <div className="jumap-page">
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
                r="80%"
              >
                <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="55%" stopColor={g.color} stopOpacity="0.75" />
                <stop offset="100%" stopColor={g.color} stopOpacity="0.45" />
              </radialGradient>
            ))}
            <radialGradient id="bubble-highlight" cx="32%" cy="22%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {placed.map((a) => (
            <ArtistBubble
              key={a.name}
              a={a}
              focus={focus}
              onFocus={setFocus}
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

      {focused && (
        <div className="jumap-detail">
          <div className="jumap-detail-head">
            <span
              className="jumap-detail-tier"
              style={{ background: genreFor(artistPrimaryGenre(focused)).color }}
            >
              {TIER_LABEL[bestTier(focused)]}
            </span>
            <h2>{focused.name}</h2>
            <span className="jumap-detail-genre">
              {artistGenres(focused).map((k) => genreFor(k).label).join(' · ')}
            </span>
          </div>
          {focused.songs.length === 0 ? (
            <p className="jumap-empty">No songs logged yet.</p>
          ) : (
            <ul className="jumap-songs">
              {[...focused.songs]
                .sort((x, y) => x.tier - y.tier || x.title.localeCompare(y.title))
                .map((s, i) => (
                  <li key={i}>
                    <span className="jumap-song-tier">{TIER_LABEL[s.tier]}</span>
                    <span className="jumap-song-title">{s.title}</span>
                    {s.year && <span className="jumap-song-year">{s.year}</span>}
                    {s.note && <span className="jumap-song-note" dangerouslySetInnerHTML={{ __html: s.note }} />}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
