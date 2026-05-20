import { publications, equalContributionNote, type Publication } from '../data/publications'

function PubEntry({ p }: { p: Publication }) {
  return (
    <div className="pub-item">
      <div className="pub-title">{p.title}</div>
      <div className="pub-authors" dangerouslySetInnerHTML={{ __html: p.authors }} />
      <div className="pub-venue" dangerouslySetInnerHTML={{ __html: p.venue }} />
      {p.awards && <div className="pub-awards" dangerouslySetInnerHTML={{ __html: p.awards }} />}
      {p.links && p.links.length > 0 && (
        <div className="pub-links">
          {p.links.map((l, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">·</span>}
              <a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Publications() {
  return (
    <div>
      {publications.map((group) => (
        <div key={group.category}>
          <h3 className="subcategory">{group.category}</h3>
          {group.items.map((p, i) => <PubEntry key={i} p={p} />)}
        </div>
      ))}
      <div className="equal-contrib">{equalContributionNote}</div>
    </div>
  )
}
