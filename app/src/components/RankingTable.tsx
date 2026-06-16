import type { RankingPick, NomineeEntry } from '../data/juward'
import { NOTATION_LEGEND } from '../data/juward'

export function RankingTable({ rows, highlightYear }: {
  rows: RankingPick[]
  highlightYear?: number
}) {
  return (
    <ol className="juward-ranking">
      {rows.map((r) => (
        <li
          key={r.year}
          className={r.year === highlightYear ? 'juward-ranking-now' : undefined}
        >
          {r.streamingStartHere && (
            <div className="juward-streaming-divider">
              <span>Streaming era begins</span>
            </div>
          )}
          <span className="juward-ranking-year">{r.year}</span>
          <span className="juward-ranking-winner">
            {r.picks.map((p, i) => (
              <span key={i} className="juward-ranking-pick">
                {i > 0 && <span className="juward-ranking-sep"> / </span>}
                <span className="juward-ranking-artist">{p.artist}</span>
                {p.title && (
                  <>
                    {' '}
                    <span className="juward-ranking-title">{p.title}</span>
                  </>
                )}
              </span>
            ))}
            {r.notation && <span className="juward-ranking-notation"> ({r.notation})</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Deterministic pastel tint per artist so each card has its own colour.
const PASTEL_PALETTE = [
  '#ffd6e7', '#cfeff7', '#ffe5b4', '#d6f5d6',
  '#d6d6ff', '#f0d6ff', '#fff5b8', '#ffc4b8',
]
function pastelFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return PASTEL_PALETTE[Math.abs(h) % PASTEL_PALETTE.length]
}

function NomineeAvatar({ n }: { n: NomineeEntry }) {
  if (n.image) {
    return (
      <img
        className="nominee-photo"
        src={n.image}
        alt={n.artist}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <div
      className="nominee-photo-placeholder"
      style={{ background: pastelFor(n.artist) }}
      aria-hidden="true"
    >
      {initials(n.artist)}
    </div>
  )
}

export function Nominees({ list }: { list: NomineeEntry[] }) {
  if (list.length === 0) {
    return <div className="juward-nominees-empty">No nominees logged yet.</div>
  }
  return (
    <ul className="juward-nominees-grid">
      {list.map((n, i) => (
        <li className="nominee-card" key={i}>
          <NomineeAvatar n={n} />
          <div className="nominee-body">
            <div className="nominee-artist">{n.artist}</div>
            {n.songs.length > 0 && (
              <div className="nominee-songs">{n.songs.join(' · ')}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export function NotationLegend() {
  return (
    <section className="juward-section juward-notation-section">
      <h2 className="juward-section-title">Notation Guide</h2>
      <ul className="juward-notation-list">
        {NOTATION_LEGEND.map((n) => (
          <li key={n.code}>
            <span className="juward-notation-code">{n.code}</span>
            <span className="juward-notation-meaning">{n.meaning}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
