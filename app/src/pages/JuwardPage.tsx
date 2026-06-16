import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { arashiAnnual, yearsCovered, YOUTUBE_RECAPS } from '../data/juward'

export function JuwardPage() {
  const years = yearsCovered()
  return (
    <div className="page-shell">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <h1 className="page-shell-title">Juward</h1>
        <p className="page-shell-lead">Annual music ceremonies — pick a year.</p>
      </header>

      <div className="juward-year-grid">
        {years.map((y) => {
          const arashi = arashiAnnual.find((a) => a.year === y)
          const recap = YOUTUBE_RECAPS[y]
          return (
            <Link key={y} to={`/juward/${y}`} className="juward-year-tile">
              <span className="juward-year-tile-num">{y}</span>
              <span className="juward-year-tile-meta">
                {arashi ? `${arashi.entries.length} categories` : '—'}
                {recap && <span className="juward-year-tile-recap"> · 🎧 Recap</span>}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
