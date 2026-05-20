import { experience } from '../data/experience'

export function Experience() {
  return (
    <div>
      {experience.map((e, i) => (
        <div className="exp-item" key={i}>
          {e.logo || e.logoDark ? (
            <span className="exp-logo-wrap" aria-hidden="true">
              {e.logo && (
                <img className="exp-logo exp-logo-light" src={e.logo} alt={e.company} />
              )}
              {e.logoDark && (
                <img className="exp-logo exp-logo-dark" src={e.logoDark} alt={e.company} />
              )}
            </span>
          ) : (
            <div className="exp-logo-placeholder" />
          )}
          <span className="exp-company">{e.company}</span>
          <span className="exp-period">{e.period}</span>
          <span className="exp-role">{e.role}</span>
        </div>
      ))}
    </div>
  )
}
