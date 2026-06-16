import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { RankingTable, Nominees, NotationLegend } from '../components/RankingTable'
import { otherRanking, otherNominees } from '../data/juward'

export function JuwardOtherPage() {
  const rows = [...otherRanking].sort((a, b) => a.year - b.year)
  const latestYear = rows[rows.length - 1]?.year
  const nomineeYears = Object.keys(otherNominees).map(Number).sort((a, b) => b - a)

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

      {nomineeYears.map((y) => {
        const list = otherNominees[y]
        if (!list || list.length === 0) return null
        return (
          <section className="juward-section" key={y}>
            <h2 className="juward-section-title">{y} Nominees</h2>
            <Nominees list={list} />
          </section>
        )
      })}

      <NotationLegend />
    </div>
  )
}
