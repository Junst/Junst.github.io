import { useState } from 'react'
import {
  conferenceAndWorkshopPapers,
  preprints,
  technicalReports,
  equalContributionNote,
  filterTabs,
  type Publication,
  type FilterTab,
} from '../data/publications'

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

function PubList({ items, emptyMsg }: { items: Publication[]; emptyMsg?: string }) {
  if (items.length === 0) return <div className="pub-empty">{emptyMsg ?? 'No papers in this category yet.'}</div>
  return <>{items.map((p, i) => <PubEntry key={i} p={p} />)}</>
}

export function Publications() {
  const [activeTab, setActiveTab] = useState<FilterTab['key']>('selected')
  const active = filterTabs.find((t) => t.key === activeTab) ?? filterTabs[0]
  const filtered = conferenceAndWorkshopPapers.filter(active.filter)

  return (
    <div>
      <h3 className="subcategory">Conference &amp; Workshop Papers</h3>
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
      <PubList items={filtered} emptyMsg="No papers in this category yet." />

      <h3 className="subcategory">Preprints &amp; Under Review</h3>
      <PubList items={preprints} />

      <h3 className="subcategory">Technical Reports</h3>
      <PubList items={technicalReports} />

      <div className="equal-contrib">{equalContributionNote}</div>
    </div>
  )
}
