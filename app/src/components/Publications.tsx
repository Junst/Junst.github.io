import { useState } from 'react'
import {
  allPapers,
  equalContributionNote,
  filterTabs,
  linkIcons,
  statusLabel,
  type Publication,
  type FilterTab,
} from '../data/publications'

function PubEntry({ p }: { p: Publication }) {
  return (
    <div className="pub-item">
      <div className="pub-title">{p.title}</div>
      <div className="pub-authors" dangerouslySetInnerHTML={{ __html: p.authors }} />
      <div className="pub-venue">
        <span dangerouslySetInnerHTML={{ __html: p.venue }} />
        {p.status && p.venue !== statusLabel[p.status] && (
          <span className="pub-status"> [{statusLabel[p.status]}]</span>
        )}
      </div>
      {p.awards && <div className="pub-awards" dangerouslySetInnerHTML={{ __html: p.awards }} />}
      {p.links && p.links.length > 0 && (
        <div className="pub-links">
          {p.links.map((l, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">·</span>}
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                <span className="link-icon" aria-hidden="true">{linkIcons[l.label]}</span>
                <span className="link-label">{l.label}</span>
              </a>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Publications() {
  const [activeTab, setActiveTab] = useState<FilterTab['key']>('selected')
  const active = filterTabs.find((t) => t.key === activeTab) ?? filterTabs[0]
  const filtered = allPapers.filter(active.filter)

  return (
    <div>
      <div className="pub-tabs" role="tablist" aria-label="Publication filter">
        {filterTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === activeTab}
            className={'pub-tab' + (t.key === activeTab ? ' active' : '')}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="pub-empty">No papers in this category yet.</div>
      ) : (
        filtered.map((p, i) => <PubEntry key={i} p={p} />)
      )}
      <div className="equal-contrib">{equalContributionNote}</div>
    </div>
  )
}
