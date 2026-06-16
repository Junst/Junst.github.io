import { Link, useLocation } from 'react-router-dom'

interface Item { to: string; label: string }

const items: Item[] = [
  { to: '/juward/arashi', label: 'ARASHI' },
  { to: '/juward/voice',  label: 'Voice of the Year' },
  { to: '/juward/other',  label: 'Other Genres' },
  { to: '/juward/jpop',   label: 'J-Pop Grand Prize' },
]

export function JuwardNav() {
  const loc = useLocation()
  // /juward and /juward/ both fall under the ARASHI tab.
  const active = (to: string) => {
    if (to === '/juward/arashi') return loc.pathname === '/juward' || loc.pathname.startsWith('/juward/arashi')
    return loc.pathname.startsWith(to)
  }
  return (
    <nav className="juward-nav" aria-label="Juward sections">
      <ul>
        {items.map((it) => (
          <li key={it.to}>
            <Link
              to={it.to}
              className={'juward-nav-link' + (active(it.to) ? ' active' : '')}
            >
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
