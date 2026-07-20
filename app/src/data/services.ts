export interface ServiceBadge {
  name: string       // conference / venue short name (big text inside circle)
  years: string      // year(s) (small text under name)
  role?: string      // optional role hint, shown as tooltip
}

// Grouped so we can render each row as its own circular-badge grid.
export interface ServiceGroup {
  category: string
  items: ServiceBadge[]
}

export const serviceGroups: ServiceGroup[] = [
  {
    category: 'Conference Reviewer',
    items: [
      { name: 'ISMIR',   years: "'25–'26" },
      { name: 'AAAI',    years: "'25" },
      { name: 'NeurIPS', years: "'25–'26" },
      { name: 'ICASSP',  years: "'25–'26" },
    ],
  },
  {
    category: 'Journal Reviewer',
    items: [
      { name: 'IEEE Access', years: "'23–" },
    ],
  },
  {
    category: 'Leadership',
    items: [
      { name: 'MAAP', years: "'25–", role: 'Leader · Modulabs Music AI Assemble People' },
    ],
  },
  {
    category: 'Volunteer',
    items: [
      { name: 'WFK Paraguay', years: "'18", role: 'IT Volunteer · World Friends Korea' },
    ],
  },
]
