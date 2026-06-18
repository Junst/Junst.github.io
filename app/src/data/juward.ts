// Juward — Jun's annual music awards. There are several parallel tracks:
//   - ARASHI annual ceremony (per-year categories + winners)
//   - Voice of the Year (Arashi member of the year, 2017 -> present)
//   - Other Genres Ranking (cumulative non-Arashi pick, 2015 -> present)
//   - J-Pop Grand Prize (cumulative non-Arashi J-Pop pick, 2008 -> present)

export interface ArashiEntry {
  category: string
  winner: string
  runnersUp?: string[]
  note?: string
}

export interface ArashiAnnual {
  year: number
  recapUrl?: string
  entries: ArashiEntry[]
}

export type Notation = '-' | 'Tie #1' | 'Tie #2' | 'Tie =' | 'Tie +'

export interface SongPick {
  artist: string
  title: string
}

export interface RankingPick {
  year: number
  picks: SongPick[]              // one entry = solo winner; multiple = tied
  notation?: Notation
  streamingStartHere?: boolean
}

// Official Arashi member colors.
export const MEMBER_COLOR: Record<string, string> = {
  'Masaki Aiba':       '#b8e6c8', // green
  'Sho Sakurai':       '#ffb3b3', // red
  'Jun Matsumoto':     '#c9bfff', // purple
  'Satoshi Ohno':      '#b3d4ff', // blue
  'Kazunari Ninomiya': '#ffeb99', // yellow
}

export interface VoicePick {
  year: number
  member: string  // English form
  reason: string
}

export interface NomineeEntry {
  artist: string
  songs: string[]
  // Optional artist photo. Paste a hot-linkable URL from the artist's official
  // site, an open Wikipedia Commons URL, or a public CDN avatar. Leave empty
  // and the card shows pastel initials instead.
  image?: string
}

export const NOTATION_LEGEND: { code: string; meaning: string }[] = [
  { code: '(-)',      meaning: 'Doesn’t quite deserve the award, but the best of what’s available.' },
  { code: '(Tie #1)', meaning: 'Tied at the top — if forced to rank, this is the top pick.' },
  { code: '(Tie #2)', meaning: 'Tied at the top — if forced to rank, this is the runner-up.' },
  { code: '(Tie =)',  meaning: 'Tied at the top — genuinely indistinguishable.' },
  { code: '(Tie +)',  meaning: 'Tied at the top — same artist, so ranking is meaningless.' },
]

export const YOUTUBE_RECAPS: Record<number, string> = {
  2021: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbYu3jIXcNuI-ELq90H7y2F',
  2022: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbEKgYG4sM1Mbb0BBnPC5Bl',
  2023: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbA9X5NyxmGwRyvLbb4rqFp',
  2024: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbY82ZuZk4VDvlfBzq-zCINM',
  2025: 'https://www.youtube.com/playlist?list=PLhkRvC3RCDbbKkLkM74Da7DEVm0GD5i97',
}

// ----- ARASHI annual ceremony, year by year -----
export const arashiAnnual: ArashiAnnual[] = [
  {
    year: 2025,
    recapUrl: YOUTUBE_RECAPS[2025],
    entries: [
      { category: 'Best Single',      winner: 'Love so sweet' },
      { category: 'Best Coupling Song',        winner: 'Sky Again' },
      { category: 'Best Album',                winner: 'Do you... ?' },
      { category: 'Best Album Song',           winner: 'ココロチラリ, 空高く' },
      { category: 'Best Music Video',          winner: 'Do you... ? (2 years in a row)' },
      { category: 'Special: Song of the Year', winner: 'Kazunari Ninomiya — あの夢をなぞって' },
      { category: 'Special: Bonus Tracks',     winner: 'Troublemaker / One Love / GUTS! / Daylight / カイト / 僕が僕のすべて' },
      { category: 'Special: Album Tracks',     winner: "Don't you get it?" },
    ],
  },
  {
    year: 2024,
    recapUrl: YOUTUBE_RECAPS[2024],
    entries: [
      { category: 'Best Single',          winner: 'Turning Up' },
      { category: 'Best Coupling Song',            winner: 'Still…' },
      { category: 'Best Album',                    winner: '5x20' },
      { category: 'Best Album Song',               winner: '5x20' },
      { category: 'Special: Song of the Year',     winner: 'Troublemaker / GUTS!' },
      { category: 'Special: Honourable Mention',   winner: '復活LOVE / 愛を叫べ' },
      { category: 'Special: Bonus Tracks',         winner: 'Love so sweet / A.RA.SHI / Happiness / Monster / 感謝カンゲキ雨嵐 / One Love' },
      { category: 'Special: Album Tracks',         winner: 'Oh Yeah!' },
      { category: 'Special: Solo Track',           winner: 'm-flo loves Sho Sakurai — come again', runnersUp: ['Kazunari Ninomiya — メリークリスマス'] },
    ],
  },
  {
    year: 2023,
    recapUrl: YOUTUBE_RECAPS[2023],
    entries: [
      { category: 'Best Single',          winner: 'Love so sweet (2nd year in a row)' },
      { category: 'Best Coupling Song',            winner: '抱きしめたい' },
      { category: 'Best Album',                    winner: 'Oh Yeah! (3rd year in a row)', runnersUp: ['Do you?'] },
      { category: 'Best Album Song',               winner: 'Only Love' },
      { category: 'Special: Album Solo',           winner: '虹' },
      { category: 'Special: Song of the Year',     winner: 'Super Shy + Zero + 可愛くてごめん — Kazunari Ninomiya (AI)', runnersUp: ['Turning Up'] },
      { category: 'Special: Bonus Tracks',         winner: 'Love Rainbow, 街角の恋人たち, Turning Up, Happiness, Whenever you call, WISH' },
      { category: 'Special: Album Tracks',         winner: '抱擁, Asterisk, SHOW TIME, Days' },
    ],
  },
  {
    year: 2022,
    recapUrl: YOUTUBE_RECAPS[2022],
    entries: [
      { category: 'Best Single',          winner: 'Love so sweet' },
      { category: 'Best Coupling Song',            winner: 'Monochrome' },
      { category: 'Best Album',                    winner: 'Oh Yeah! (2 in a row)' },
      { category: 'Best Album Song',               winner: 'Rock You', runnersUp: ['身長差のない恋人 (revised)'] },
      { category: 'Special: Album Solo',           winner: 'Hip Pop Boogie' },
      { category: 'Special: Song of the Year',     winner: 'Pretender — Kazunari Ninomiya' },
      { category: 'Special: Tearful Song',         winner: 'step and go' },
      { category: 'Special: Album Tracks',         winner: 'キャラメル・ソング, 愛を歌おう, Let Me Down' },
      { category: 'Special: Solo Track',           winner: 'Attitude — Kazunari Ninomiya', runnersUp: ['Walking with You — Kazunari Ninomiya'] },
    ],
  },
  {
    year: 2021,
    recapUrl: YOUTUBE_RECAPS[2021],
    entries: [
      { category: 'Best Single',          winner: 'Turning Up' },
      { category: 'Best Coupling Song',            winner: 'Kissからはじめようよ' },
      { category: 'Best Album',                    winner: 'Oh Yeah!' },
      { category: 'Best Album Song',               winner: '夏の名前' },
      { category: 'Special: Song of the Year',     winner: 'Love so sweet' },
      { category: 'Special: Tearful Song',         winner: '感謝カンゲキ雨嵐' },
      { category: 'Special: Bonus Tracks',         winner: 'Affection, 白が舞う, お気に召すまま, Monster, 台風ジェネレーション -Typhoon Generation-' },
      { category: 'Special: Rediscovered Song',    winner: '花, Japonesque' },
      { category: 'Special: Album Tracks',         winner: 'JAM, ONLY LOVE, 身長差のない恋人' },
      { category: 'Special: Band Song',            winner: '言葉よりも大切なもの' },
    ],
  },
  {
    year: 2020,
    entries: [
      { category: 'Best Single',          winner: 'カイト' },
      { category: 'Best Coupling Song',            winner: 'Journey to Harmony' },
      { category: 'Best Album',                    winner: 'Do you?' },
      { category: 'Best Album Song',               winner: 'SHOW TIME' },
      { category: 'Best EP Song',                  winner: 'A.RA.SHI : Reborn' },
      { category: 'Special: Song of the Year',     winner: 'Love so sweet' },
      { category: 'Special: Tearful Song',         winner: 'The Music Never Ends' },
      { category: 'Special: Remix',                winner: 'Turning Up (R3HAB remix)' },
      { category: 'Special: Reborn Mix',           winner: 'One Love : Reborn' },
      { category: 'Special: Bonus Tracks',         winner: 'Turning Up, 台風ジェネレーション -Typhoon Generation-' },
    ],
  },
  {
    year: 2019,
    entries: [
      { category: 'Best Single',           winner: 'Turning Up' },
      { category: 'Best Coupling Song',             winner: 'TBD' },
      { category: 'Best Album',                     winner: '5x20' },
      { category: 'Best Album Song',                winner: '5x20' },
      { category: 'Special: Song of the Year',      winner: 'Ray of Water' },
      { category: 'Special: Tearful Song',          winner: '5x20' },
      { category: 'Special: Lifetime Achievement',  winner: 'Jun Matsumoto & Gen Hoshino', note: 'Inaugural award.' },
    ],
  },
  {
    year: 2018,
    entries: [
      { category: 'Best Single',          winner: 'Find The Answer' },
      { category: 'Best Coupling Song',            winner: '白が舞う' },
      { category: 'Best Album',                    winner: 'TBD' },
      { category: 'Best Album Song',               winner: 'TBD' },
      { category: 'Special: Song of the Year',     winner: '5x20' },
      { category: 'Special: Tearful Song',         winner: 'アオゾラペダル' },
    ],
  },
  {
    year: 2017,
    entries: [
      { category: 'Best Single',          winner: 'つなぐ' },
      { category: 'Best Coupling Song',            winner: 'お気に召すまま' },
      { category: 'Best Album',                    winner: '「未完」' },
      { category: 'Best Album Song',               winner: 'Song for you' },
      { category: 'Best Duet',                     winner: 'UB' },
      { category: 'Best Trio Song',                winner: '夜の影' },
      { category: 'Special: Gospel of the Year',   winner: '光' },
      { category: 'Special: Bonus Tracks',         winner: 'カンパイ・ソング, Sugar, Treasure of Life' },
    ],
  },
]

// ----- Voice of the Year (Arashi member of the year) -----
export const voiceOfTheYear: VoicePick[] = [
  { year: 2017, member: 'Masaki Aiba',       reason: "Impression of Aiba's voice at my very first concert." },
  { year: 2018, member: 'Masaki Aiba',       reason: 'Same as 2017, plus his birthday concert.' },
  { year: 2019, member: 'Sho Sakurai',       reason: '"Hey Everybody (Omataase)" and the "National Diet mild yankee" moment — I thought about him more than any other member this year.' },
  { year: 2020, member: 'Jun Matsumoto',     reason: 'The Music Never Ends, Netflix, Love so sweet.' },
  { year: 2021, member: 'Satoshi Ohno',      reason: 'Melancholy, nostalgia, longing.' },
  { year: 2022, member: 'Kazunari Ninomiya', reason: 'Post-hiatus physical & digital cover album release and steady output.' },
  { year: 2023, member: 'Kazunari Ninomiya', reason: 'Wide range of activity, agency independence, and the year the presenter made AI artwork himself, lol.' },
  { year: 2024, member: 'Sho Sakurai',       reason: 'Rapping himself post-hiatus, plus the short collab performance.' },
  { year: 2025, member: 'Kazunari Ninomiya', reason: 'Released a physical album, digital covers, AND a single!' },
]

// ----- Other Genres Ranking (cumulative non-Arashi pick) -----
export const otherRanking: RankingPick[] = [
  { year: 2015, picks: [{ artist: 'BIGBANG', title: 'BANG BANG BANG' }, { artist: 'Girls’ Generation', title: 'PARTY' }], notation: 'Tie #1' },
  { year: 2016, picks: [{ artist: 'Beenzino', title: 'Time Travel' }] },
  { year: 2017, picks: [{ artist: 'BTS', title: 'DNA' }], notation: '-' },
  { year: 2018, picks: [{ artist: 'TWICE', title: 'Dance The Night Away' }], notation: '-' },
  { year: 2019, picks: [{ artist: 'Official髭男dism', title: 'Pretender' }, { artist: 'Billie Eilish', title: 'Bad Guy' }], notation: 'Tie #1' },
  { year: 2020, picks: [{ artist: 'BTS', title: 'Dynamite' }, { artist: 'ReoNa', title: 'ANIMA' }], notation: 'Tie =', streamingStartHere: true },
  { year: 2021, picks: [{ artist: 'Red Velvet', title: 'Queendom' }] },
  { year: 2022, picks: [{ artist: 'NewJeans', title: 'Hype Boy' }, { artist: 'NewJeans', title: 'Attention' }], notation: 'Tie +' },
  { year: 2023, picks: [{ artist: 'NewJeans', title: 'OMG' }, { artist: 'NewJeans', title: 'GODS' }], notation: 'Tie +' },
  { year: 2024, picks: [{ artist: 'ILLIT', title: 'Magnetic' }, { artist: 'Number_i', title: 'GOAT' }], notation: 'Tie #1' },
  { year: 2025, picks: [{ artist: 'Drake', title: 'NOKIA' }, { artist: 'Effie', title: 'CAN I SIP 담배' }], notation: 'Tie #1' },
]

// Nominees per year for the Other Genres track. Empty years render an
// 'No nominees logged yet' card so the tab strip still works.
export const otherNominees: Record<number, NomineeEntry[]> = {
  2025: [
    { artist: 'Drake',               songs: ['NOKIA'] },
    { artist: 'BOYNEXTDOOR',         songs: ['오늘만 I LOVE YOU'] },
    { artist: 'Number_i',            songs: ['未確認領域', 'GOD_i', 'Numbers', 'Ur Zone'] },
    { artist: 'aespa',               songs: ['Dark Arts'] },
    { artist: 'Effie',               songs: ['down', 'CAN I SIP 담배', 'MAKGEOLLI BANGER'] },
    { artist: 'Hearts2Hearts',       songs: ['STYLE'] },
    { artist: 'TVXQ',                songs: ['Psycho'] },
    { artist: 'ILLIT',               songs: ['빌려온 고양이 (Do the Dance)'] },
    { artist: 'Sik-K & Lil Moshpit', songs: ['LOV3'] },
    { artist: 'Noducksoon (노덕순)',  songs: ['Fancy Car'] },
    { artist: 'Snow Man',            songs: ['カリスマックス'] },
    { artist: 'Hey! Say! JUMP',      songs: ['encore'] },
    { artist: 'King & Prince',       songs: ['HEART'] },
    { artist: 'SYSTEM SEOUL',        songs: ['SS'] },
    { artist: 'Zico & Lilas',        songs: ['DUET'] },
    { artist: 'LE SSERAFIM',         songs: ['SPAGHETTI'] },
    { artist: 'Playboi Carti',       songs: ['EVIL J0RDAN'] },
  ],
}

// ----- J-Pop Grand Prize (cumulative non-Arashi J-Pop pick) -----
export const jpopRanking: RankingPick[] = [
  { year: 2008, picks: [{ artist: 'Buono!', title: 'Kiss! Kiss! Kiss!' }] },
  { year: 2009, picks: [{ artist: 'TVXQ', title: 'share the world' }, { artist: 'Buono!', title: '消失点 -Vanishing Point-' }], notation: 'Tie #1' },
  { year: 2010, picks: [{ artist: '— (TBD)', title: '' }] },
  { year: 2011, picks: [{ artist: 'Perfume', title: 'ねぇ (in Album JPN)' }] },
  { year: 2012, picks: [{ artist: 'Ikimonogakari', title: 'ハルウタ' }] },
  { year: 2013, picks: [{ artist: 'SMAP', title: 'JOY' }, { artist: 'SEKAI NO OWARI', title: 'RPG' }], notation: 'Tie #1' },
  { year: 2014, picks: [{ artist: 'SEKAI NO OWARI', title: 'Dragon Night' }], notation: '-' },
  { year: 2015, picks: [{ artist: '— (TBD)', title: '' }] },
  { year: 2016, picks: [{ artist: 'RADWIMPS', title: '前前前世' }], notation: '-' },
  { year: 2017, picks: [{ artist: 'Hoshino Gen', title: '恋' }] },
  { year: 2018, picks: [{ artist: 'King & Prince', title: 'シンデレラガール' }] },
  { year: 2019, picks: [{ artist: 'Official髭男dism', title: 'Pretender' }], streamingStartHere: true },
  { year: 2020, picks: [{ artist: 'ReoNa', title: 'ANIMA' }] },
  { year: 2021, picks: [{ artist: 'Naniwa Danshi', title: '初心LOVE (うぶらぶ)' }], notation: '-' },
  { year: 2022, picks: [{ artist: 'King & Prince', title: 'Trace&Trace' }] },
  { year: 2023, picks: [{ artist: 'Hey! Say! JUMP', title: 'DEAR MY LOVER' }, { artist: 'Naniwa Danshi', title: 'Poppin’ Hoppin’ Lovin’' }], notation: 'Tie =' },
  { year: 2024, picks: [{ artist: 'Number_i', title: 'GOAT' }], notation: '-' },
  { year: 2025, picks: [{ artist: 'King & Prince', title: 'HEART' }, { artist: 'Zico & Lilas', title: 'DUET' }], notation: '-' },
]

export const jpopNominees: Record<number, NomineeEntry[]> = {
  2025: [
    { artist: 'King & Prince', songs: ['HEART'] },
    { artist: 'Zico & Lilas',  songs: ['DUET'] },
    { artist: 'Number_i',      songs: ['未確認領域'] },
  ],
}

// ----- Helpers -----
export function yearsCovered(): number[] {
  const set = new Set<number>()
  for (const a of arashiAnnual) set.add(a.year)
  for (const v of voiceOfTheYear) set.add(v.year)
  for (const r of otherRanking) set.add(r.year)
  for (const r of jpopRanking) set.add(r.year)
  return [...set].sort((a, b) => b - a)
}

export function arashiForYear(y: number): ArashiAnnual | undefined {
  return arashiAnnual.find((a) => a.year === y)
}

export function voiceForYear(y: number): VoicePick | undefined {
  return voiceOfTheYear.find((v) => v.year === y)
}

export function otherRankingUpTo(y: number): RankingPick[] {
  return otherRanking.filter((r) => r.year <= y).sort((a, b) => a.year - b.year)
}

export function jpopRankingUpTo(y: number): RankingPick[] {
  return jpopRanking.filter((r) => r.year <= y).sort((a, b) => a.year - b.year)
}
