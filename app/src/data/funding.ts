export interface Funding {
  org: string         // HTML allowed
  description: string // HTML allowed
  period: string
}

export const funding: Funding[] = [
  {
    org: 'National Research Foundation of Korea (Ministry of Science and ICT)',
    description: 'Ph.D. Research Fellowship (Project: <em>Multi-Pitch Estimation Model Based on Synthetic Polyphonic Vocal Data</em>). Grant No. RS-2025-25422688 · USD 20K (KRW 25M) for 1 year',
    period: 'Sep 2025 – Aug 2026',
  },
  {
    org: 'Brian Impact Foundation (Kakao)',
    description: 'Publication support program — research funding of USD 1.5K (KRW 2M) per accepted paper',
    period: '2025',
  },
]
