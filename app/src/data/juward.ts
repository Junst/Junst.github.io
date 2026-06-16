// Juward — Jun's annual music awards, running on Naver Blog since 2017.
// Each year has fixed core categories plus one-off "special" ones invented
// for that year. Winners stay open-ended until Jun fills them in.

export interface AwardEntry {
  category: string
  winner?: string       // can stay empty until filled in
  runnersUp?: string[]  // optional ranked alternates
  note?: string         // short blurb, HTML allowed
}

export interface YearAwards {
  year: number
  blogUrl?: string      // Naver blog post for this year's ceremony
  recapUrl?: string     // YouTube Music Recap playlist for this year
  entries: AwardEntry[]
}

// Naver blog post URLs Jun shared, in case we want to deep-link from a card.
export const NAVER_AWARDS: Record<number, string> = {
  2017: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=221174048977',
  2018: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=221430151014',
  2019: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=221754749626',
  2020: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=222820950096',
  2021: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=222821030059',
  2022: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=222975314665',
  2023: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=223302311887',
  2024: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=223714992957',
  2025: 'https://blog.naver.com/solbon1212?Redirect=Log&logNo=224129729398',
}

export const YOUTUBE_RECAPS: Record<number, string> = {
  2021: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbYu3jIXcNuI-ELq90H7y2F',
  2022: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbEKgYG4sM1Mbb0BBnPC5Bl',
  2023: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbA9X5NyxmGwRyvLbb4rqFp',
  2024: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbY82ZuZk4VDvlfBzq-zCINM',
  2025: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbKkLkM74Da7DEVm0GD5i97',
}

// One YearAwards entry per year. `entries` starts empty so Jun can fill it
// year-by-year. Cards still render with the Naver / YouTube buttons.
export const awards: YearAwards[] = Object.keys(NAVER_AWARDS)
  .map(Number)
  .sort((a, b) => b - a)
  .map((year) => ({
    year,
    blogUrl: NAVER_AWARDS[year],
    recapUrl: YOUTUBE_RECAPS[year],
    entries: [],
  }))
