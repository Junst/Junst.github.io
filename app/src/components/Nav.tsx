interface NavItem {
  label: string
  href: string
  external?: boolean
}

const items: NavItem[] = [
  { label: 'About',     href: '#top' },
  { label: 'News',      href: '#news' },
  { label: 'Publications', href: '#publications' },
  { label: 'Projects',  href: '#projects' },
  { label: 'Gallery',   href: '/legacy/2025/gallery/', external: true },
  { label: 'Blog',      href: 'https://blog.naver.com/solbon1212', external: true },
  { label: 'Legacy',    href: '/legacy/2025/', external: true },
]

export function Nav() {
  return (
    <nav className="top-nav" aria-label="Primary">
      <ul>
        {items.map((it) => (
          <li key={it.label}>
            <a
              href={it.href}
              target={it.external ? '_blank' : undefined}
              rel={it.external ? 'noopener noreferrer' : undefined}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
