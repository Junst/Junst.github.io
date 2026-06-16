import { useState } from 'react'
import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { arashiAnnual, YOUTUBE_RECAPS } from '../data/juward'

export function JuwardArashiPage() {
  const years = arashiAnnual.map((a) => a.year).sort((a, b) => a - b)
  const defaultYear = years[years.length - 1]
  const [year, setYear] = useState<number>(defaultYear)
  const current = arashiAnnual.find((a) => a.year === year)
  const recap = YOUTUBE_RECAPS[year]

  return (
    <div className="page-shell juward-arashi-page">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <h1 className="page-shell-title">ARASHI Awards</h1>
        <p className="page-shell-lead">
          Per-year ceremony for ARASHI singles, albums, MVs, and the special prizes I invented that year.
        </p>
      </header>

      <nav className="juward-year-strip" role="tablist" aria-label="Year selector">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={y === year}
            className={'juward-year-pill' + (y === year ? ' active' : '')}
            onClick={() => setYear(y)}
          >
            {y}
          </button>
        ))}
      </nav>

      {recap && (
        <div className="juward-recap-row">
          <a href={recap} target="_blank" rel="noopener noreferrer" className="juward-btn juward-btn-recap">
            🎧 YouTube Music Recap
          </a>
        </div>
      )}

      {current && current.entries.length > 0 ? (
        <ul className="juward-entries-grid">
          {current.entries.map((e, i) => (
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
      ) : (
        <p className="juward-empty">No entries logged for {year}.</p>
      )}
    </div>
  )
}
