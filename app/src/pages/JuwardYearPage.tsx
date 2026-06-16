import { Link, useParams } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import {
  arashiForYear,
  otherRankingUpTo,
  otherNominees,
  jpopRankingUpTo,
  jpopNominees,
  yearsCovered,
  NOTATION_LEGEND,
  YOUTUBE_RECAPS,
  type RankingPick,
  type NomineeEntry,
} from '../data/juward'

function RankingTable({
  rows,
  highlightYear,
}: {
  rows: RankingPick[]
  highlightYear: number
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
              <span>스트리밍 시작</span>
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

function Nominees({ list }: { list: NomineeEntry[] }) {
  return (
    <ul className="juward-nominees">
      {list.map((n, i) => (
        <li key={i}>
          <span className="juward-nominee-artist">{n.artist}</span>
          {n.songs.length > 0 && (
            <span className="juward-nominee-songs">
              {' — '}
              {n.songs.join(', ')}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function JuwardYearPage() {
  const { year: yParam } = useParams<{ year: string }>()
  const year = Number(yParam)
  const arashi = arashiForYear(year)
  const otherList = otherRankingUpTo(year)
  const jpopList = jpopRankingUpTo(year)
  const otherNoms = otherNominees[year]
  const jpopNoms = jpopNominees[year]
  const recap = YOUTUBE_RECAPS[year]

  const years = yearsCovered()
  const idx = years.indexOf(year)
  const prevYear = idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null
  const nextYear = idx > 0 ? years[idx - 1] : null

  if (!isFinite(year)) {
    return (
      <div className="page-shell">
        <Link to="/juward" className="back-link">← Juward</Link>
        <p>Unknown year.</p>
      </div>
    )
  }

  return (
    <div className="page-shell juward-year-page">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <div className="juward-year-nav">
          {prevYear && <Link to={`/juward/${prevYear}`} className="juward-year-nav-link">← {prevYear}</Link>}
          <div className="juward-year-nav-spacer" />
          {nextYear && <Link to={`/juward/${nextYear}`} className="juward-year-nav-link">{nextYear} →</Link>}
        </div>
        <h1 className="page-shell-title juward-year-title">{year} Juward</h1>
        {recap && (
          <p className="page-shell-lead">
            <a href={recap} target="_blank" rel="noopener noreferrer" className="juward-btn juward-btn-recap">
              🎧 YouTube Music Recap
            </a>
          </p>
        )}
      </header>

      {/* ARASHI annual ceremony */}
      {arashi && arashi.entries.length > 0 && (
        <section className="juward-section">
          <h2 className="juward-section-title">아라시 시상식 {year}</h2>
          <ul className="juward-entries-grid">
            {arashi.entries.map((e, i) => (
              <li key={i}>
                <span className="juward-category">{e.category}</span>
                {e.winner && <span className="juward-winner">{e.winner}</span>}
                {e.runnersUp && e.runnersUp.length > 0 && (
                  <span className="juward-runners">{e.runnersUp.join(' · ')}</span>
                )}
                {e.note && <span className="juward-note" dangerouslySetInnerHTML={{ __html: e.note }} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 기타 타악 순위 */}
      {otherList.length > 0 && (
        <section className="juward-section">
          <h2 className="juward-section-title">기타 타악 순위</h2>
          <RankingTable rows={otherList} highlightYear={year} />
          {otherNoms && otherNoms.length > 0 && (
            <div className="juward-subsection">
              <h3 className="juward-subsection-title">{year} 후보</h3>
              <Nominees list={otherNoms} />
            </div>
          )}
        </section>
      )}

      {/* J-POP 대상 */}
      {jpopList.length > 0 && (
        <section className="juward-section">
          <h2 className="juward-section-title">J-POP 대상 (아라시 제외)</h2>
          <RankingTable rows={jpopList} highlightYear={year} />
          {jpopNoms && jpopNoms.length > 0 && (
            <div className="juward-subsection">
              <h3 className="juward-subsection-title">{year} 후보</h3>
              <Nominees list={jpopNoms} />
            </div>
          )}
        </section>
      )}

      <section className="juward-section juward-notation-section">
        <h2 className="juward-section-title">표기 규칙</h2>
        <ul className="juward-notation-list">
          {NOTATION_LEGEND.map((n) => (
            <li key={n.code}>
              <span className="juward-notation-code">{n.code}</span>
              <span className="juward-notation-meaning">{n.meaning}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
