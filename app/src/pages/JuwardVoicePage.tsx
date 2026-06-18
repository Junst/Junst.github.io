import { useState } from 'react'
import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { JuwardAtmosphere } from '../components/JuwardAtmosphere'
import { voiceOfTheYear, MEMBER_COLOR } from '../data/juward'

export function JuwardVoicePage() {
  const sorted = [...voiceOfTheYear].sort((a, b) => a.year - b.year)
  const defaultYear = sorted[sorted.length - 1]?.year
  const [year, setYear] = useState<number>(defaultYear)
  const pick = sorted.find((v) => v.year === year)
  const tint = pick ? MEMBER_COLOR[pick.member] ?? '#eaeaea' : '#eaeaea'

  return (
    <div className="page-shell juward-voice-page">
      <JuwardAtmosphere />
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <span className="juward-arashi-eyebrow">Voice of the Year</span>
        <h1 className="page-shell-title juward-voice-title">{pick?.year ?? ''}</h1>
      </header>

      <nav className="juward-voice-tabs" role="tablist" aria-label="Year selector">
        {sorted.map((v) => {
          const memberTint = MEMBER_COLOR[v.member] ?? '#eaeaea'
          const active = v.year === year
          return (
            <button
              key={v.year}
              type="button"
              role="tab"
              aria-selected={active}
              className={'juward-voice-tab' + (active ? ' active' : '')}
              style={{
                ['--tab-tint' as string]: memberTint,
              }}
              onClick={() => setYear(v.year)}
              title={v.member}
            >
              <span className="juward-voice-tab-year">{v.year}</span>
              <span className="juward-voice-tab-chip" aria-hidden="true" />
            </button>
          )
        })}
      </nav>

      {pick && (
        <article
          className="juward-voice-card"
          style={{ ['--tint' as string]: tint }}
        >
          <div className="juward-voice-card-year">{pick.year}</div>
          <div className="juward-voice-card-body">
            <h2 className="juward-voice-card-member">{pick.member}</h2>
            <p className="juward-voice-card-reason">{pick.reason}</p>
          </div>
        </article>
      )}
    </div>
  )
}
