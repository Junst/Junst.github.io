import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  songs,
  GENRES,
  TIERS,
  TIER_LABEL,
  bubbleRadius,
  genreFor,
  groupByGenre,
  presentGenres,
  primaryGenre,
  sortByTier,
  type Song,
} from '../data/jumap'

interface PlacedSong extends Song {
  cx: number
  cy: number
  r: number
}

function seed(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return (h >>> 0) / 0xffffffff
}

// Lay each genre out in its own "continent" — a soft cluster of bubbles
// arranged around a genre centre. Continents are scattered across the canvas.
function place(items: Song[], width: number, height: number): PlacedSong[] {
  const groups = groupByGenre(items)
  const primaryGenres = GENRES.filter((g) => groups.has(g.key))
  const out: PlacedSong[] = []

  const centres: Record<string, { x: number; y: number }> = {}
  const gcx = width / 2
  const gcy = height / 2
  if (primaryGenres.length === 1) {
    centres[primaryGenres[0].key] = { x: gcx, y: gcy }
  } else {
    const ringR = Math.min(width, height) * 0.27
    primaryGenres.forEach((g, i) => {
      const angle = (i / primaryGenres.length) * Math.PI * 2 - Math.PI / 2
      centres[g.key] = {
        x: gcx + Math.cos(angle) * ringR,
        y: gcy + Math.sin(angle) * ringR,
      }
    })
  }

  for (const g of primaryGenres) {
    const c = centres[g.key]
    const cluster = sortByTier(groups.get(g.key) ?? [])
    cluster.forEach((s, i) => {
      const r = bubbleRadius(s)
      const seedAngle = seed(s.title + s.artist) * Math.PI * 2
      // Local ring around the genre centre, scaled by cluster size
      const localRadius = cluster.length === 1
        ? 0
        : Math.min(width, height) * 0.08 + i * 6
      const angle = (i / Math.max(1, cluster.length)) * Math.PI * 2 + seedAngle
      out.push({
        ...s,
        cx: c.x + Math.cos(angle) * localRadius,
        cy: c.y + Math.sin(angle) * localRadius,
        r,
      })
    })
  }

  return out
}

interface Ripple { id: number; cx: number; cy: number; r: number }

function Bubble({
  s, focus, onFocus, onRipple,
}: {
  s: PlacedSong
  focus: string | null
  onFocus: (key: string | null) => void
  onRipple: (r: Ripple) => void
}) {
  const primary = genreFor(primaryGenre(s))
  const secondary = s.genres[1] ? genreFor(s.genres[1]) : null
  const key = s.artist + '—' + s.title
  const focused = focus === key
  const dim = focus != null && !focused
  return (
    <g
      className="jumap-bubble"
      style={{ opacity: dim ? 0.22 : 1 }}
      onMouseEnter={() => onFocus(key)}
      onMouseLeave={() => onFocus(null)}
      onClick={() => {
        onRipple({ id: Date.now() + Math.random(), cx: s.cx, cy: s.cy, r: s.r })
        onFocus(focused ? null : key)
      }}
    >
      {/* Soft shadow under the bubble for floating feel */}
      <ellipse
        cx={s.cx}
        cy={s.cy + s.r * 0.92}
        rx={s.r * 0.78}
        ry={s.r * 0.18}
        fill="#000"
        opacity={focused ? 0.18 : 0.1}
      />
      {/* Main bubble — radial gradient */}
      <circle
        cx={s.cx}
        cy={s.cy}
        r={s.r}
        fill={`url(#bubble-${primary.key})`}
        stroke={secondary?.color ?? primary.color}
        strokeOpacity={0.85}
        strokeWidth={secondary ? 4 : 2}
        strokeDasharray={secondary ? '6 4' : undefined}
      />
      {/* Specular highlight (top-left sheen) */}
      <ellipse
        cx={s.cx - s.r * 0.32}
        cy={s.cy - s.r * 0.42}
        rx={s.r * 0.42}
        ry={s.r * 0.26}
        fill="url(#bubble-highlight)"
        opacity={focused ? 0.95 : 0.8}
        pointerEvents="none"
      />
      <text x={s.cx} y={s.cy - 4} textAnchor="middle" dominantBaseline="middle" className="jumap-artist">
        {s.artist}
      </text>
      <text x={s.cx} y={s.cy + 12} textAnchor="middle" dominantBaseline="middle" className="jumap-title">
        {s.title}
      </text>
      <text x={s.cx} y={s.cy + s.r * 0.55} textAnchor="middle" className="jumap-tier">
        {TIER_LABEL[s.tier]}
      </text>
    </g>
  )
}

export function JumapPage() {
  const [focus, setFocus] = useState<string | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const ripplesRef = useRef<number[]>([])
  const width = 960
  const height = 640
  const placed = useMemo(() => place(songs, width, height), [])

  function addRipple(r: Ripple) {
    setRipples((cur) => [...cur, r])
    const id = window.setTimeout(() => {
      setRipples((cur) => cur.filter((x) => x.id !== r.id))
    }, 900)
    ripplesRef.current.push(id)
  }

  const focused = focus
    ? songs.find((s) => s.artist + '—' + s.title === focus)
    : null

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
                <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.92" />
                <stop offset="40%" stopColor={g.color} stopOpacity="0.85" />
                <stop offset="100%" stopColor={g.color} stopOpacity="0.55" />
              </radialGradient>
            ))}
            <radialGradient id="bubble-highlight" cx="32%" cy="22%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {placed.map((s) => (
            <Bubble
              key={s.artist + '—' + s.title}
              s={s}
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
            {presentGenres(songs).map((g) => (
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
              style={{ background: genreFor(primaryGenre(focused)).color }}
            >
              {TIER_LABEL[focused.tier]}
            </span>
            <h2>{focused.artist} <span className="jumap-detail-dash">—</span> {focused.title}</h2>
            <span className="jumap-detail-genre">
              {focused.genres.map((k) => genreFor(k).label).join(' · ')}
            </span>
          </div>
          {focused.note ? (
            <p className="jumap-detail-note" dangerouslySetInnerHTML={{ __html: focused.note }} />
          ) : (
            <p className="jumap-empty">No review written yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
