import { serviceGroups } from '../data/services'

export function Services() {
  return (
    <div className="service-groups">
      {serviceGroups.map((group) => (
        <div className="service-group" key={group.category}>
          <div className="service-group-label">{group.category}</div>
          <div className="service-badge-grid">
            {group.items.map((item) => (
              <div className="service-badge" key={item.name} title={item.role ?? `${item.name} (${item.years})`}>
                <span className="service-badge-name">{item.name}</span>
                <span className="service-badge-years">{item.years}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
