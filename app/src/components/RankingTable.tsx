import type { RankingPick, NomineeEntry, SongPick } from '../data/juward'
import { NOTATION_LEGEND } from '../data/juward'
import { useAlbumArt } from './AlbumArt'

function PickRow({ p, isFirst }: { p: SongPick; isFirst: boolean }) {
  const { src, color } = useAlbumArt(p.artist, p.title)
  return (
    <span
      className="juward-ranking-pick"
      style={color ? { ['--pick-tint' as string]: color } : undefined}
    >
      {!isFirst && <span className="juward-ranking-sep"> / </span>}
      {src && (
        <img
          className="juward-ranking-art"
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="juward-ranking-artist">{p.artist}</span>
      {p.title && (
        <>
          {' '}
          <span className="juward-ranking-title">{p.title}</span>
        </>
      )}
    </span>
  )
}

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
              <PickRow key={i} p={p} isFirst={i === 0} />
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

function NomineeSongChip({ artist, title }: { artist: string; title: string }) {
  const { src, color } = useAlbumArt(artist, title)
  return (
    <span
      className="nominee-song-chip"
      style={color ? { ['--chip-tint' as string]: color } : undefined}
    >
      {src && (
        <img
          className="nominee-song-art"
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      )}
      <span className="nominee-song-title">{title}</span>
    </span>
  )
}

function NomineeCard({ n }: { n: NomineeEntry }) {
  // Pick the first song's album-art colour as the card's accent tint when
  // available so the card softly inherits the lead song's mood.
  const lead = n.songs[0] ?? ''
  const { color } = useAlbumArt(n.artist, lead)
  return (
    <li
      className="nominee-card"
      style={color ? { ['--card-tint' as string]: color } : undefined}
    >
      <NomineeAvatar n={n} />
      <div className="nominee-body">
        <div className="nominee-artist">{n.artist}</div>
        {n.songs.length > 0 && (
          <div className="nominee-song-chips">
            {n.songs.map((s, i) => (
              <NomineeSongChip key={i} artist={n.artist} title={s} />
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

export function Nominees({ list }: { list: NomineeEntry[] }) {
  if (list.length === 0) {
    return <div className="juward-nominees-empty">No nominees logged yet.</div>
  }
  return (
    <ul className="juward-nominees-grid">
      {list.map((n, i) => <NomineeCard key={i} n={n} />)}
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
