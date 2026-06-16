import { Link, useLocation } from 'react-router-dom'

interface Item { to: string; label: string }

const items: Item[] = [
  { to: '/juward',       label: 'Years' },
  { to: '/juward/voice', label: 'Voice of the Year' },
]

export function JuwardNav() {
  const loc = useLocation()
  return (
    <nav className="juward-nav" aria-label="Juward sections">
      <ul>
        {items.map((it) => {
          // Highlight the Years tab on /juward and any /juward/{number}
          const isVoice = it.to === '/juward/voice'
          const onVoice = loc.pathname.startsWith('/juward/voice')
          const onYears = loc.pathname.startsWith('/juward') && !onVoice
          const active = isVoice ? onVoice : onYears
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={'juward-nav-link' + (active ? ' active' : '')}
              >
                {it.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
