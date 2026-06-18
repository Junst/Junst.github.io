import type { RankingPick } from '../data/juward'
import { useAlbumArt } from './AlbumArt'

function PickArt({ artist, title }: { artist: string; title: string }) {
  const { src } = useAlbumArt(artist, title)
  if (!src) return null
  return (
    <img
      className="juward-editorial-art"
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}

export function EditorialRanking({ rows, highlightYear }: {
  rows: RankingPick[]
  highlightYear?: number
}) {
  return (
    <div className="juward-editorial-list">
      {rows.map((r, i) => (
        <article
          key={r.year}
          className={'juward-editorial-row' + (r.year === highlightYear ? ' juward-editorial-now' : '')}
          style={{ ['--row-i' as string]: i }}
        >
          {r.streamingStartHere && (
            <div className="juward-streaming-tag">Streaming era begins</div>
          )}
          <div className="juward-editorial-year-cell">
            <div className="juward-editorial-year">{r.year}</div>
            {r.notation && (
              <div className="juward-editorial-notation">({r.notation})</div>
            )}
          </div>
          <div
            className={
              'juward-editorial-picks juward-editorial-picks-' +
              Math.min(r.picks.length, 3)
            }
          >
            {r.picks.map((p, j) => (
              <div className="juward-editorial-pick" key={j}>
                <PickArt artist={p.artist} title={p.title} />
                <div className="juward-editorial-pick-text">
                  <span className="juward-editorial-artist">{p.artist}</span>
                  {p.title && (
                    <span className="juward-editorial-title">{p.title}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
