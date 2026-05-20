import { funding } from '../data/funding'

export function Funding() {
  return (
    <div>
      {funding.map((f, i) => (
        <div className="funding-item" key={i}>
          <div className="funding-org" dangerouslySetInnerHTML={{ __html: f.org }} />
          <div className="funding-desc" dangerouslySetInnerHTML={{ __html: f.description }} />
          <div className="funding-period">{f.period}</div>
        </div>
      ))}
    </div>
  )
}
