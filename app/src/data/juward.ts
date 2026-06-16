// Juward — Jun's annual music awards, running on Naver Blog since 2017.
// Categories are kept consistent across years so the same award reads the
// same label every time. Recurring core awards are at the top of each year;
// one-off "Special:" categories below.

export interface AwardEntry {
  category: string
  winner?: string
  runnersUp?: string[]
  note?: string  // short blurb, HTML allowed
}

export interface YearAwards {
  year: number
  recapUrl?: string
  entries: AwardEntry[]
}

export const YOUTUBE_RECAPS: Record<number, string> = {
  2021: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbYu3jIXcNuI-ELq90H7y2F',
  2022: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbEKgYG4sM1Mbb0BBnPC5Bl',
  2023: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbA9X5NyxmGwRyvLbb4rqFp',
  2024: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbY82ZuZk4VDvlfBzq-zCINM',
  2025: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbKkLkM74Da7DEVm0GD5i97',
}

// Ordered list of recurring core categories (always shown first in 'By
// Category' view). Categories not in this list — typically prefixed
// 'Special:' — render after the core block.
export const CORE_CATEGORIES = [
  'Best Single (A-side)',
  'Best Coupling Song',
  'Best Album',
  'Best Album Song',
  'Best EP Song',
  'Best Duet',
  'Best Trio Song',
  'Voice of the Year',
] as const

export const awards: YearAwards[] = [
  {
    year: 2025,
    recapUrl: YOUTUBE_RECAPS[2025],
    entries: [
      {
        category: 'Retrospective Note',
        note: '2025 was written up as an ARASHI ALL SINGLE / ALL ALBUM / ALL ETC career-spanning retrospective rather than a year-only ceremony.',
      },
    ],
  },
  {
    year: 2024,
    recapUrl: YOUTUBE_RECAPS[2024],
    entries: [
      { category: 'Best Single (A-side)',         winner: 'Turning Up' },
      { category: 'Best Coupling Song',           winner: 'TBD (Still…)' },
      { category: 'Best Album',                   winner: '5x20' },
      { category: 'Best Album Song',              winner: '5x20' },
      { category: 'Special: Song of the Year',    winner: 'Troublemaker / GUTS!' },
      { category: 'Special: Honourable Mention',  winner: '復活LOVE / 愛を叫べ' },
      { category: 'Special: Bonus Tracks',        winner: 'Love so sweet / A.RA.SHI / Happiness / Monster / 感謝カンゲキ雨嵐 / One Love' },
      { category: 'Special: Album Tracks',        winner: 'Oh Yeah!' },
      { category: 'Special: Solo Track',          winner: 'm-flo loves 櫻井翔 — come again', runnersUp: ['Ninomiya Kazunari — メリークリスマス'] },
      { category: 'Voice of the Year',            winner: 'Sho Sakurai', note: 'For the come again collaboration performance.' },
    ],
  },
  {
    year: 2023,
    recapUrl: YOUTUBE_RECAPS[2023],
    entries: [
      { category: 'Best Single (A-side)',         winner: 'Love so sweet (2nd year in a row)' },
      { category: 'Best Coupling Song',           winner: '抱きしめたい' },
      { category: 'Best Album',                   winner: 'Oh Yeah! (3rd year in a row)', runnersUp: ['Do you?'] },
      { category: 'Best Album Song',              winner: 'Only Love' },
      { category: 'Special: Album Solo',          winner: '虹' },
      { category: 'Special: Song of the Year',    winner: 'Super Shy + Zero + 可愛くてごめん — Ninomiya Kazunari (AI)', runnersUp: ['Turning Up'] },
      { category: 'Special: Bonus Tracks',        winner: 'Love Rainbow, 街角の恋人たち, Turning Up, Happiness, Whenever you call, WISH' },
      { category: 'Special: Album Tracks',        winner: '抱擁, Asterisk, SHOW TIME, Days' },
      { category: 'Voice of the Year',            winner: 'Ninomiya Kazunari', note: '222 hours listened — top 0.1% of ARASHI listeners worldwide.' },
    ],
  },
  {
    year: 2022,
    recapUrl: YOUTUBE_RECAPS[2022],
    entries: [
      { category: 'Best Single (A-side)',         winner: 'Love so sweet' },
      { category: 'Best Coupling Song',           winner: 'Monochrome' },
      { category: 'Best Album',                   winner: 'Oh Yeah! (2 in a row)' },
      { category: 'Best Album Song',              winner: 'Rock You', runnersUp: ['身長差のない恋人 (revised)'] },
      { category: 'Special: Album Solo',          winner: 'Hip Pop Boogie' },
      { category: 'Special: Song of the Year',    winner: 'Pretender — Ninomiya Kazunari' },
      { category: 'Special: Tearful Song',        winner: 'Step and Go' },
      { category: 'Special: Album Tracks',        winner: 'キャラメル・ソング, 愛を歌おう, Let Me Down' },
      { category: 'Special: Solo Track',          winner: 'Attitude — Ninomiya Kazunari', runnersUp: ['Walking with You — Ninomiya Kazunari'] },
      { category: 'Voice of the Year',            winner: 'Ninomiya Kazunari', note: '4,151 minutes of ARASHI on rotation.' },
    ],
  },
  {
    year: 2021,
    recapUrl: YOUTUBE_RECAPS[2021],
    entries: [
      { category: 'Best Single (A-side)',         winner: 'Turning Up' },
      { category: 'Best Coupling Song',           winner: 'Kissからはじめようよ' },
      { category: 'Best Album',                   winner: 'Oh Yeah!' },
      { category: 'Best Album Song',              winner: '夏の名前' },
      { category: 'Special: Song of the Year',    winner: 'Love so sweet' },
      { category: 'Special: Tearful Song',        winner: '感謝カンゲキ雨嵐' },
      { category: 'Special: Bonus Tracks',        winner: 'Affection, 白が舞う, お気に召すまま, Monster, 台風ジェネレーション -Typhoon Generation-' },
      { category: 'Special: Rediscovered Song',   winner: '花, Japonesque' },
      { category: 'Special: Album Tracks',        winner: 'JAM, ONLY LOVE, 身長差のない恋人' },
      { category: 'Special: Band Song',           winner: '言葉よりも大切なもの' },
      { category: 'Voice of the Year',            winner: 'Satoshi Ohno' },
    ],
  },
  {
    year: 2020,
    entries: [
      { category: 'Best Single (A-side)',         winner: 'カイト' },
      { category: 'Best Coupling Song',           winner: 'Journey to Harmony' },
      { category: 'Best Album',                   winner: 'Do you?' },
      { category: 'Best Album Song',              winner: 'SHOW TIME' },
      { category: 'Best EP Song',                 winner: 'A.RA.SHI : Reborn' },
      { category: 'Special: Song of the Year',    winner: 'Love so sweet' },
      { category: 'Special: Tearful Song',        winner: 'The Music Never Ends' },
      { category: 'Special: Remix',               winner: 'Turning Up (R3HAB remix)' },
      { category: 'Special: Reborn Mix',          winner: 'One Love : Reborn' },
      { category: 'Special: Bonus Tracks',        winner: 'Turning Up, 台風ジェネレーション -Typhoon Generation-' },
      { category: 'Voice of the Year',            winner: 'Jun Matsumoto' },
    ],
  },
  {
    year: 2019,
    entries: [
      { category: 'Best Single (A-side)',           winner: 'Turning Up' },
      { category: 'Best Coupling Song',             winner: 'TBD' },
      { category: 'Best Album',                     winner: '5x20' },
      { category: 'Best Album Song',                winner: '5x20' },
      { category: 'Special: Song of the Year',      winner: 'Ray of Water' },
      { category: 'Special: Tearful Song',          winner: '5x20' },
      { category: 'Special: Best Collaboration',    note: 'Highlighted Kaito × Hoshino Gen.' },
      { category: 'Special: Lifetime Achievement',  winner: 'Jun Matsumoto & Gen Hoshino', note: 'Inaugural award.' },
      { category: 'Voice of the Year',              winner: 'Sho Sakurai' },
    ],
  },
  {
    year: 2018,
    entries: [
      { category: 'Best Single (A-side)',         winner: 'Find The Answer' },
      { category: 'Best Coupling Song',           winner: '白が舞う' },
      { category: 'Best Album',                   winner: 'TBD' },
      { category: 'Best Album Song',              winner: 'TBD' },
      { category: 'Special: Song of the Year',    winner: '5x20' },
      { category: 'Special: Tearful Song',        winner: 'アオゾラペダル' },
      { category: 'Voice of the Year',            winner: 'Masaki Aiba' },
    ],
  },
  {
    year: 2017,
    entries: [
      { category: 'Best Single (A-side)',         winner: 'つなぐ' },
      { category: 'Best Coupling Song',           winner: 'お気に召すまま' },
      { category: 'Best Album',                   winner: '「未完」' },
      { category: 'Best Album Song',              winner: 'Song for you' },
      { category: 'Best Duet',                    winner: 'UB' },
      { category: 'Best Trio Song',               winner: '夜の影' },
      { category: 'Special: Gospel of the Year',  winner: '光' },
      { category: 'Special: Bonus Tracks',        winner: 'カンパイ・ソング, Sugar, Treasure of Life' },
      { category: 'Voice of the Year',            winner: 'Masaki Aiba' },
    ],
  },
]

// Pivoted view: { category -> [(year, winner) ...] }, ordered with CORE
// categories first then specials.
export interface CategoryRow {
  category: string
  picks: { year: number; winner?: string; runnersUp?: string[]; note?: string }[]
}

export function awardsByCategory(): CategoryRow[] {
  const map = new Map<string, CategoryRow>()
  for (const y of awards) {
    for (const e of y.entries) {
      const row = map.get(e.category) ?? { category: e.category, picks: [] }
      row.picks.push({ year: y.year, winner: e.winner, runnersUp: e.runnersUp, note: e.note })
      map.set(e.category, row)
    }
  }
  // Sort picks within row, most recent year first
  for (const row of map.values()) row.picks.sort((a, b) => b.year - a.year)
  const core = CORE_CATEGORIES.map((c) => map.get(c)).filter((r): r is CategoryRow => !!r)
  const specials = [...map.values()]
    .filter((r) => !(CORE_CATEGORIES as readonly string[]).includes(r.category))
    .sort((a, b) => a.category.localeCompare(b.category))
  return [...core, ...specials]
}
