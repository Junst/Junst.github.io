import { projects } from '../data/projects'

export function Projects() {
  return (
    <div>
      {projects.map((p, i) => (
        <div className="project-item" key={i}>
          <div>
            <div className="project-title">{p.title}</div>
            {p.authors && <div className="project-authors">{p.authors}</div>}
            <div className="project-blurb">{p.blurb}</div>
            <div className="project-links">
              {p.links.map((l, j) => (
                <span key={j}>
                  {j > 0 && ' · '}
                  <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
                </span>
              ))}
            </div>
          </div>
          {p.image && <img src={p.image} alt={p.title} />}
        </div>
      ))}
    </div>
  )
}
