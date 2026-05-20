import { awards } from '../data/awards'

export function Awards() {
  return (
    <ul className="awards-list">
      {awards.map((a, i) => (
        <li key={i}>
          <span dangerouslySetInnerHTML={{ __html: a.title }} />
          {' '}<span className="award-year">{a.year}</span>
        </li>
      ))}
    </ul>
  )
}
