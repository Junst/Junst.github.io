import { Link } from 'react-router-dom'
import { JuwardNav } from '../components/JuwardNav'
import { voiceOfTheYear } from '../data/juward'

// Member → soft pastel tint band; keeps the timeline easy to scan at a glance.
const MEMBER_TINT: Record<string, string> = {
  '아이바 마사키':     '#ffd6e7',
  '사쿠라이 쇼':       '#cfeff7',
  '마츠모토 준':       '#dcf5dc',
  '오노 사토시':       '#fff5b8',
  '니노미야 카즈나리': '#f0d6ff',
}

export function JuwardVoicePage() {
  const sorted = [...voiceOfTheYear].sort((a, b) => b.year - a.year)
  return (
    <div className="page-shell juward-year-page">
      <header className="page-shell-header">
        <Link to="/" className="back-link">← junst.github.io</Link>
        <JuwardNav />
        <h1 className="page-shell-title">올해의 목소리</h1>
        <p className="page-shell-lead">
          매년 아라시 멤버 중 그 해의 목소리를 뽑는 트랙. 2017년부터.
        </p>
      </header>

      <ol className="juward-voice-timeline">
        {sorted.map((v) => (
          <li
            key={v.year}
            className="juward-voice-row"
            style={{ ['--tint' as string]: MEMBER_TINT[v.member] ?? '#eaeaea' }}
          >
            <div className="juward-voice-year-cell">{v.year}</div>
            <div className="juward-voice-body">
              <div className="juward-voice-member-row">
                <span className="juward-voice-chip" style={{ background: MEMBER_TINT[v.member] ?? '#eaeaea' }} />
                <span className="juward-voice-member">{v.member}</span>
              </div>
              <div className="juward-voice-reason">{v.reason}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
