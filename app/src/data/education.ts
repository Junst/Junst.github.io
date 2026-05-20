export interface EducationItem {
  institution: string
  location?: string
  period: string
  detail: string
}

export const education: EducationItem[] = [
  {
    institution: 'University of Michigan',
    location: 'Ann Arbor, Michigan, USA',
    period: 'Aug 2026 – Dec 2026',
    detail: 'Visiting Student, School of Music, Theatre & Dance (SMTD)',
  },
  {
    institution: 'University of Southern California',
    period: 'Jul 2025 – Aug 2025',
    detail: 'Summer Session, Artificial Intelligence',
  },
  {
    institution: 'Yonsei University',
    location: 'Seoul, Republic of Korea',
    period: 'Mar 2023 – Present',
    detail: 'Ph.D. Student, Department of Artificial Intelligence',
  },
  {
    institution: 'Soongsil University',
    location: 'Seoul, Republic of Korea',
    period: 'Mar 2017 – Feb 2023',
    detail: 'B.S., Major in Media',
  },
]
