import { profile } from '../data/profile'

export function Hero() {
  return (
    <header className="hero">
      <div className="hero-text">
        <h1>{profile.name}</h1>
        <div className="subtitle">Ph.D. Student · Yonsei University · KRAFTON</div>
        {profile.intro.map((para, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: para }} />
        ))}
        <div className="hero-links">
          {profile.links.map((l) => (
            <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
              <i className={l.icon} aria-hidden="true" />
              <span>{l.label}</span>
            </a>
          ))}
        </div>
      </div>
      <div className="hero-photo">
        <img src={profile.photo} alt={profile.name} />
      </div>
    </header>
  )
}
