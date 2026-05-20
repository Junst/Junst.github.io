import { experience } from '../data/experience'

export function Experience() {
  return (
    <div>
      {experience.map((e, i) => (
        <div className="exp-item" key={i}>
          {e.logo ? (
            <img className="exp-logo" src={e.logo} alt={e.company} />
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
