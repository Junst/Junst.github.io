import { useState } from 'react'
import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { JuwardAtmosphere } from '../components/JuwardAtmosphere'
import { arashiAnnual, YOUTUBE_RECAPS } from '../data/juward'

export function JuwardArashiPage() {
  const years = arashiAnnual.map((a) => a.year).sort((a, b) => a - b)
  const defaultYear = years[years.length - 1]
  const [year, setYear] = useState<number>(defaultYear)
  const current = arashiAnnual.find((a) => a.year === year)
  const recap = YOUTUBE_RECAPS[year]

  return (
    <div className="page-shell juward-arashi-page">
      <JuwardAtmosphere />
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
      </header>

      <section className="juward-arashi-hero">
        <span className="juward-arashi-eyebrow">ARASHI Awards</span>
        <h1 key={year} className="juward-arashi-year">{year}</h1>
        <div className="juward-arashi-hero-meta">
          {current && (
            <span className="juward-arashi-hero-count">
              {current.entries.length} categor{current.entries.length === 1 ? 'y' : 'ies'}
            </span>
          )}
          {recap && (
            <a
              href={recap}
              target="_blank"
              rel="noopener noreferrer"
              className="juward-recap-pill"
            >
              🎧 YouTube Recap →
            </a>
          )}
        </div>
      </section>

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

      {current && current.entries.length > 0 ? (
        <div key={year} className="juward-arashi-editorial">
          {current.entries.map((e, i) => (
            <article
              className="juward-arashi-row"
              key={i}
              style={{ ['--row-i' as string]: i }}
            >
              <div className="juward-arashi-cat">{e.category}</div>
              <div className="juward-arashi-winner-block">
                <div className="juward-arashi-winner">{e.winner}</div>
                {e.runnersUp && e.runnersUp.length > 0 && (
                  <div className="juward-arashi-runners">
                    {e.runnersUp.map((r, j) => (j === 0 ? r : ' · ' + r))}
                  </div>
                )}
                {e.note && (
                  <div
                    className="juward-arashi-note"
                    dangerouslySetInnerHTML={{ __html: e.note }}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="juward-empty">No entries logged for {year}.</p>
      )}
    </div>
  )
}
