import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { awards, awardsByCategory, type YearAwards } from '../data/juward'

function YearCard({ y }: { y: YearAwards }) {
  return (
    <div className="juward-card">
      <header className="juward-card-head">
        <h2>{y.year}</h2>
        {y.recapUrl && (
          <div className="juward-card-links">
            <a href={y.recapUrl} target="_blank" rel="noopener noreferrer" className="juward-btn juward-btn-recap">
              🎧 YouTube Recap
            </a>
          </div>
        )}
      </header>
      {y.entries.length === 0 ? (
        <div className="juward-empty">No entries yet.</div>
      ) : (
        <ul className="juward-entries">
          {y.entries.map((e, i) => (
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
      )}
    </div>
  )
}

export function JuwardPage() {
  const years = awards.map((a) => a.year)
  const [activeYear, setActiveYear] = useState<number | 'all'>('all')
  const [view, setView] = useState<'year' | 'category'>('year')

  const filtered = activeYear === 'all'
    ? awards
    : awards.filter((a) => a.year === activeYear)

  const categoryRows = useMemo(() => awardsByCategory(), [])

  return (
    <div className="page-shell">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <h1 className="page-shell-title">Juward</h1>
        <p className="page-shell-lead">
          Annual music awards Jun has run since 2017. Categories grouped across
          years; YouTube Music Recap playlists where they exist.
        </p>
      </header>

      <div className="juward-toolbar">
        <div className="juward-view-toggle" role="tablist" aria-label="View toggle">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'year'}
            className={'juward-view-btn' + (view === 'year' ? ' active' : '')}
            onClick={() => setView('year')}
          >
            By Year
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'category'}
            className={'juward-view-btn' + (view === 'category' ? ' active' : '')}
            onClick={() => setView('category')}
          >
            By Category
          </button>
        </div>

        {view === 'year' && (
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
        )}
      </div>

      {view === 'year' ? (
        <div className="juward-grid">
          {filtered.map((y) => <YearCard key={y.year} y={y} />)}
        </div>
      ) : (
        <div className="juward-cat-list">
          {categoryRows.map((row) => (
            <section key={row.category} className="juward-cat-row">
              <h3 className="juward-cat-name">{row.category}</h3>
              <ul className="juward-cat-picks">
                {row.picks.map((p, i) => (
                  <li key={i}>
                    <span className="juward-cat-year">{p.year}</span>
                    {p.winner && <span className="juward-winner">{p.winner}</span>}
                    {p.runnersUp && p.runnersUp.length > 0 && (
                      <span className="juward-runners">{p.runnersUp.join(' · ')}</span>
                    )}
                    {p.note && <span className="juward-note" dangerouslySetInnerHTML={{ __html: p.note }} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
