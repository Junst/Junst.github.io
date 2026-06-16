import { useState } from 'react'
import { Link } from 'react-router-dom'
import { awards, type YearAwards } from '../data/juward'

function YearCard({ y }: { y: YearAwards }) {
  return (
    <div className="juward-card">
      <header className="juward-card-head">
        <h2>{y.year}</h2>
        <div className="juward-card-links">
          {y.blogUrl && (
            <a href={y.blogUrl} target="_blank" rel="noopener noreferrer" className="juward-btn juward-btn-blog">
              📝 Naver Blog
            </a>
          )}
          {y.recapUrl && (
            <a href={y.recapUrl} target="_blank" rel="noopener noreferrer" className="juward-btn juward-btn-recap">
              🎧 YouTube Recap
            </a>
          )}
        </div>
      </header>
      {y.entries.length === 0 ? (
        <div className="juward-empty">
          Categories &amp; winners not transcribed yet. Tap the Naver Blog button for the full write-up.
        </div>
      ) : (
        <ul className="juward-entries">
          {y.entries.map((e, i) => (
            <li key={i}>
              <span className="juward-category">{e.category}</span>
              {e.winner && <span className="juward-winner">{e.winner}</span>}
              {e.runnersUp && e.runnersUp.length > 0 && (
                <span className="juward-runners">
                  {e.runnersUp.map((r, j) => (j === 0 ? r : ' · ' + r))}
                </span>
              )}
              {e.note && <span className="juward-note" dangerouslySetInnerHTML={{ __html: e.note }} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function JuwardPage() {
  const years = awards.map((a) => a.year)
  const [activeYear, setActiveYear] = useState<number | 'all'>('all')
  const filtered = activeYear === 'all'
    ? awards
    : awards.filter((a) => a.year === activeYear)

  return (
    <div className="page-shell">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <h1 className="page-shell-title">Juward</h1>
        <p className="page-shell-lead">
          Annual music awards Jun has run on Naver Blog since 2017. Fixed core
          categories plus the year's one-off specials. YouTube Music Recap
          playlists for the year-end mood pile, where they exist.
        </p>
      </header>

      <nav className="juward-years" aria-label="Year filter">
        <button
          type="button"
          className={'juward-year-btn' + (activeYear === 'all' ? ' active' : '')}
          onClick={() => setActiveYear('all')}
        >
          All
        </button>
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={'juward-year-btn' + (activeYear === y ? ' active' : '')}
            onClick={() => setActiveYear(y)}
          >
            {y}
          </button>
        ))}
      </nav>

      <div className="juward-grid">
        {filtered.map((y) => <YearCard key={y.year} y={y} />)}
      </div>
    </div>
  )
}
