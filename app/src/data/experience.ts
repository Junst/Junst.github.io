export interface ExperienceItem {
  company: string
  role: string
  period: string
  logo?: string       // used in light mode (or always if no logoDark)
  logoDark?: string   // used in dark mode
}

export const experience: ExperienceItem[] = [
  {
    company: 'Krafton',
    role: 'AI Researcher Internship',
    period: 'Aug 2025 – Current',
    logo:     '/assets/company/krafton-black.png',
    logoDark: '/assets/company/krafton-red.png',
  },
  {
    company: 'Onoma AI',
    role: 'AI Team Leader & AI Researcher',
    period: 'Aug 2023 – Feb 2025',
    logo: '/assets/company/onoma.png',
  },
]
