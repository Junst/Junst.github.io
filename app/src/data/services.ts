export interface ServiceItem {
  role: string
  detail: string  // HTML allowed
  period: string
}

export const services: ServiceItem[] = [
  { role: 'Conference Reviewer', detail: 'ISMIR / AAAI / NeurIPS',              period: 'Aug 2025 – Present' },
  { role: 'Leader',              detail: 'Modulabs MAAP (Music AI Assemble People)', period: 'May 2025 – Present' },
  { role: 'Journal Reviewer',    detail: 'IEEE Access (SCI)',                   period: 'Aug 2023 – Present' },
  { role: 'IT Volunteer Service',detail: 'World Friends Korea Paraguay',        period: 'Aug 2018 – Sep 2018' },
]
