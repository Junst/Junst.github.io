import { useState } from 'react'
import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { RankingTable, Nominees, NotationLegend } from '../components/RankingTable'
import { otherRanking, otherNominees } from '../data/juward'

export function JuwardOtherPage() {
  const rows = [...otherRanking].sort((a, b) => a.year - b.year)
  const latestYear = rows[rows.length - 1]?.year
  const years = rows.map((r) => r.year).reverse()  // newest first for tab strip
  const defaultYear = years.find((y) => (otherNominees[y]?.length ?? 0) > 0) ?? years[0]
  const [nominationYear, setNominationYear] = useState<number>(defaultYear)
  const list = otherNominees[nominationYear] ?? []

  return (
    <div className="page-shell juward-track-page">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <h1 className="page-shell-title">Other Genres Ranking</h1>
        <p className="page-shell-lead">
          Cumulative pick of the year outside ARASHI — K-Pop, Western hip-hop, anything that
          isn't J-Pop. Running since 2015.
        </p>
      </header>

      <section className="juward-section">
        <h2 className="juward-section-title">Cumulative Picks</h2>
        <RankingTable rows={rows} highlightYear={latestYear} />
      </section>

      <section className="juward-section">
        <h2 className="juward-section-title">Nominees</h2>
        <nav className="juward-year-strip" role="tablist" aria-label="Nominee year selector">
          {years.map((y) => {
            const hasData = (otherNominees[y]?.length ?? 0) > 0
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={y === nominationYear}
                className={
                  'juward-year-pill'
                  + (y === nominationYear ? ' active' : '')
                  + (hasData ? '' : ' empty')
                }
                onClick={() => setNominationYear(y)}
              >
                {y}
              </button>
            )
          })}
        </nav>
        <Nominees list={list} />
      </section>

      <NotationLegend />
    </div>
  )
}
