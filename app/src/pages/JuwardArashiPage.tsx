import { useState } from 'react'
import { JuwardNav } from '../components/JuwardNav'
import { JuwardAtmosphere } from '../components/JuwardAtmosphere'
import { arashiAnnual, YOUTUBE_RECAPS } from '../data/juward'
import { albumArtFor } from '../data/album-art'

// Strip streak annotations like "(2nd year in a row)" / "(2년 연속)" /
// "(2 years in a row)" / "(3 in a row)" — return the cleaned winner text
// plus the streak count to render as a small badge.
function parseStreak(text: string): { clean: string; streak?: number } {
  const patterns: RegExp[] = [
    /\s*\(\s*(\d+)\s*(?:nd|rd|th|st)?\s*years?\s+in\s+a\s+row\s*\)/i,
    /\s*\(\s*(\d+)\s*in\s+a\s+row\s*\)/i,
    /\s*\(\s*(\d+)\s*년\s*연속\s*\)/,
    /\s*\(\s*(\d+)\s*연속\s*\)/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      return { clean: text.replace(re, '').trim(), streak: parseInt(m[1], 10) }
    }
  }
  return { clean: text }
}

function pickWinnerArt(winner: string): string | undefined {
  const cleaned = winner.replace(/\s*\([^)]*\)\s*/g, '').trim()
  const m = cleaned.match(/^([^—]+?)\s+—\s+(.+)$/)
  if (m) {
    const art = albumArtFor(m[1].trim(), m[2].trim()) ?? albumArtFor('ARASHI', m[2].trim())
    if (art) return art
  }
  const first = cleaned.split(/\s*[\/,]\s*/)[0]
  return albumArtFor('ARASHI', first) ?? albumArtFor('ARASHI', cleaned)
}

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
          {current.entries.map((e, i) => {
            const { clean, streak } = parseStreak(e.winner)
            const art = pickWinnerArt(clean)
            return (
              <article
                className="juward-arashi-row"
                key={i}
                style={{ ['--row-i' as string]: i }}
              >
                <div className="juward-arashi-cat">{e.category}</div>
                <div className="juward-arashi-winner-block">
                  <div className="juward-arashi-winner">
                    {clean}
                    {streak && (
                      <span
                        className="juward-arashi-streak"
                        title={`${streak} years in a row`}
                        aria-label={`${streak} years in a row`}
                      >
                        🔥<span className="juward-arashi-streak-n">×{streak}</span>
                      </span>
                    )}
                  </div>
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
                {art && (
                  <img
                    className="juward-arashi-art"
                    src={art}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="juward-empty">No entries logged for {year}.</p>
      )}
    </div>
  )
}
