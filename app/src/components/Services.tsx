import { services } from '../data/services'

export function Services() {
  return (
    <div>
      {services.map((s, i) => (
        <div className="edu-item" key={i}>
          <div>
            <span className="institution">{s.role}</span>
            <span className="location">{', '}<span dangerouslySetInnerHTML={{ __html: s.detail }} /></span>
          </div>
          <div className="period">{s.period}</div>
        </div>
      ))}
    </div>
  )
}
