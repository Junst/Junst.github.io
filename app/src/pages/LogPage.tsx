import '../styles/y2k-fonts.css'
import { useEffect, useState } from 'react'

// Y2K-styled personal log / diary. Y2K display fonts are scoped to
// elements inside `.log-page` so the rest of the site's typography is
// untouched. Content placeholders are easy to swap — just edit the
// arrays below.

const NOW_PLAYING = {
  album: 'ARASHI — All the BEST! 1999–2009',
  book: '음악 추천 시스템 그 너머의 무엇',
  game: 'BALATRO',
  movie: 'PERFECT DAYS (2023)',
  paper: 'audio diffusion priors — survey',
}

const HOBBIES = [
  { tag: '☕', label: 'Specialty coffee (manual brew)' },
  { tag: '🎧', label: 'Late-night Apple Music marathons' },
  { tag: '🏃', label: 'Sunday long runs' },
  { tag: '📸', label: 'Film photography (mostly Tokyo)' },
  { tag: '✈️', label: 'Tokyo Domes whenever the lineup hits' },
  { tag: '🎹', label: 'Piano (covering jpop ballads badly)' },
]

const LOG_ENTRIES = [
  {
    date: '2026.06.21',
    title: 'AUDIO_DIFF_LAB ▸ new sampler dropped',
    body: 'tonight\'s build crossed a sample-quality threshold I\'ve been chasing for two months. set it to run overnight on the A100 and went home before midnight for the first time this week.',
  },
  {
    date: '2026.06.18',
    title: 'JUMAP ▸ 3D scene shipped',
    body: 'finally tore out the SVG renderer and rebuilt the whole map in three.js. drag-and-drop physics works on touch. genre families read at a glance. mom approved.',
  },
  {
    date: '2026.06.10',
    title: 'TOKYO ▸ TOKIO COUNTDOWN LIVE planning',
    body: 'tickets locked. flight booked. praying ARASHI dribbles even a partial reunion onto the setlist.',
  },
  {
    date: '2026.05.27',
    title: 'KRAFTON ▸ end of internship retrospective',
    body: 'shipped two papers, broke one prod pipeline, learned more about evaluation harnesses than I wanted to. taking the next two weeks to actually sleep.',
  },
]

const VIBE_TAGS = [
  'tokyo summer',
  'glass beads',
  'wired earbuds',
  '90s anime',
  'long bus rides',
  'CRT monitor light',
  'instant ramen at 2am',
  'film grain',
]

const STATS = [
  { k: 'hours coded this week', v: '47' },
  { k: 'songs added to jumap', v: '258' },
  { k: 'papers in queue', v: '12' },
  { k: 'untouched plants', v: '3' },
]

function Marquee({ children }: { children: string }) {
  // Three repeats so the loop stays visually filled even on wide screens.
  return (
    <div className="log-marquee" aria-hidden="true">
      <div className="log-marquee-track">
        {[0, 1, 2].map((i) => (
          <span key={i}>{children}</span>
        ))}
      </div>
    </div>
  )
}

export function LogPage() {
  // Live tick so the header clock + uptime feel alive.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const pad = (n: number) => n.toString().padStart(2, '0')
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`

  return (
    <div className="log-page">
      <div className="log-grid-bg" aria-hidden="true" />
      <div className="log-scanlines" aria-hidden="true" />

      <header className="log-header">
        <div className="log-header-row">
          <div className="log-id">JUN_LOG</div>
          <div className="log-id-meta">
            <span className="log-status">[ONLINE]</span>
            <span className="log-clock">{date} · {clock}</span>
          </div>
        </div>
        <h1 className="log-title">
          <span className="log-title-line">PERSONAL</span>
          <span className="log-title-line log-title-accent">_TRANSMISSIONS</span>
        </h1>
        <p className="log-sub">a y2k notebook · hobbies · log · what i'm on</p>
      </header>

      <Marquee>
        ★ since 2025 · still building little things · still listening to ARASHI · still answering DMs slowly ★&nbsp;
      </Marquee>

      <main className="log-main">
        {/* Now Playing block */}
        <section className="log-card log-card-now">
          <header className="log-card-head">
            <span className="log-card-tag">[karma]</span>
            <h2>NOW_PLAYING</h2>
          </header>
          <ul className="log-now-list">
            <li><span>album</span><b>{NOW_PLAYING.album}</b></li>
            <li><span>book</span><b>{NOW_PLAYING.book}</b></li>
            <li><span>game</span><b>{NOW_PLAYING.game}</b></li>
            <li><span>movie</span><b>{NOW_PLAYING.movie}</b></li>
            <li><span>paper</span><b>{NOW_PLAYING.paper}</b></li>
          </ul>
        </section>

        {/* Hobbies block */}
        <section className="log-card log-card-hobbies">
          <header className="log-card-head">
            <span className="log-card-tag">[overload]</span>
            <h2>HOBBIES_·_LIFE</h2>
          </header>
          <ul className="log-hobby-list">
            {HOBBIES.map((h, i) => (
              <li key={i}>
                <span className="log-hobby-tag">{h.tag}</span>
                <span className="log-hobby-label">{h.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Stats block */}
        <section className="log-card log-card-stats">
          <header className="log-card-head">
            <span className="log-card-tag">[bytebounce]</span>
            <h2>WEEK.STATS</h2>
          </header>
          <ul className="log-stats-list">
            {STATS.map((s, i) => (
              <li key={i}>
                <span className="log-stats-val">{s.v}</span>
                <span className="log-stats-key">{s.k}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vibe tags block */}
        <section className="log-card log-card-tags">
          <header className="log-card-head">
            <span className="log-card-tag">[granix]</span>
            <h2>VIBE_INDEX</h2>
          </header>
          <ul className="log-vibe-list">
            {VIBE_TAGS.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>

        {/* Log entries block */}
        <section className="log-card log-card-log">
          <header className="log-card-head">
            <span className="log-card-tag">[overload]</span>
            <h2>FIELD_LOG</h2>
          </header>
          <ol className="log-entries">
            {LOG_ENTRIES.map((e, i) => (
              <li key={i}>
                <div className="log-entry-meta">
                  <span className="log-entry-date">{e.date}</span>
                  <span className="log-entry-divider">::</span>
                  <span className="log-entry-title">{e.title}</span>
                </div>
                <p className="log-entry-body">{e.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="log-footer">
        <Marquee>
          ◢◤ end of transmission ◢◤ thanks for reading ◢◤ back to /jumap or just close this tab ◢◤&nbsp;
        </Marquee>
        <div className="log-footer-meta">
          v0.1 · powered by ByteBounce / Granix / Karma / Overload (1001fonts)
        </div>
      </footer>
    </div>
  )
}
