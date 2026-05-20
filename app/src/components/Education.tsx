import { education } from '../data/education'

export function Education() {
  return (
    <div>
      {education.map((e, i) => (
        <div className="edu-item" key={i}>
          <div>
            <span className="institution">{e.institution}</span>
            {e.location && <span className="location">, {e.location}</span>}
          </div>
          <div className="period">{e.period}</div>
          <div className="detail">{e.detail}</div>
        </div>
      ))}
    </div>
  )
}
