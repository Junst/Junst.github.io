export interface ExperienceItem {
  company: string
  role: string
  period: string
  logo?: string
}

export const experience: ExperienceItem[] = [
  {
    company: 'Krafton',
    role: 'AI Researcher Internship',
    period: 'Aug 2025 – Current',
    logo: '/assets/company/KRAFTON.jpg.avif',
  },
  {
    company: 'Onoma AI',
    role: 'AI Team Leader & AI Researcher',
    period: 'Aug 2023 – Feb 2025',
  },
]
