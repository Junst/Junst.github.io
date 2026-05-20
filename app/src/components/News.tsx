import { newsGroups } from '../data/news'

export function News() {
  const current = newsGroups.find((g) => g.year === 'current')
  const archives = newsGroups.filter((g) => g.year !== 'current')

  return (
    <div className="news">
      {current && (
        <ul>
          {current.items.map((item, i) => (
            <li key={i}>
              <span className="news-date">{item.date}</span>
              {' : '}
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </li>
          ))}
        </ul>
      )}
      {archives.map((group) => (
        <details key={group.year}>
          <summary>{group.year} News</summary>
          <ul>
            {group.items.map((item, i) => (
              <li key={i}>
                <span className="news-date">{item.date}</span>
                {' : '}
                <span dangerouslySetInnerHTML={{ __html: item.text }} />
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
