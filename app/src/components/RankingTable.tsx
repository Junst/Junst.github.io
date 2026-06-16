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
            {r.winner}
            {r.notation && <span className="juward-ranking-notation"> ({r.notation})</span>}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function Nominees({ list }: { list: NomineeEntry[] }) {
  return (
    <ul className="juward-nominees">
      {list.map((n, i) => (
        <li key={i}>
          <span className="juward-nominee-artist">{n.artist}</span>
          {n.songs.length > 0 && (
            <span className="juward-nominee-songs">{' — '}{n.songs.join(', ')}</span>
          )}
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
