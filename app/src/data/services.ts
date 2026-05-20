export interface ServiceItem {
  role: string
  detail: string  // HTML allowed
  period: string  // year only
}

export const services: ServiceItem[] = [
  { role: 'Conference Reviewer', detail: 'ISMIR / AAAI / NeurIPS',                  period: '2025 –' },
  { role: 'Leader',              detail: 'Modulabs MAAP (Music AI Assemble People)', period: '2025 –' },
  { role: 'Journal Reviewer',    detail: 'IEEE Access (SCI)',                       period: '2023 –' },
  { role: 'IT Volunteer Service',detail: 'World Friends Korea Paraguay',            period: '2018' },
]
