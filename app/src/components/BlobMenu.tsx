import { Link, useLocation } from 'react-router-dom'

interface BlobLink {
  to: string
  label: string
  icon: string  // emoji
}

const links: BlobLink[] = [
  { to: '/jumap',  label: 'Jumap',  icon: '🫧' },
  { to: '/juward', label: 'Juward', icon: '🏆' },
]

export function BlobMenu() {
  const loc = useLocation()
  return (
    <nav className="blob-menu" aria-label="Junst extras">
      <ul>
        {links.map((l) => {
          const active = loc.pathname === l.to
          return (
            <li key={l.to}>
              <Link
                to={l.to}
                className={'blob-pill' + (active ? ' active' : '')}
                aria-label={l.label}
                title={l.label}
              >
                <span className="blob-icon" aria-hidden="true">{l.icon}</span>
                <span className="blob-label">{l.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
