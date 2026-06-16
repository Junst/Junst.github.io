// Juward — Jun's annual music awards. There are several parallel tracks:
//   - ARASHI annual ceremony (per-year categories + winners)
//   - Voice of the Year (cumulative, runs 2017 -> present)
//   - 기타 타악 순위 (cumulative non-Arashi pick, 2015 -> present)
//   - J-POP 대상 (cumulative non-Arashi J-Pop pick, 2008 -> present)
//
// Each year page displays the slice of these tracks up to and including
// that year, plus any nominees / shortlist relevant to that year.

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

// '-' = "수상하기 미흡하나 그나마 뽑은 곡"
// '공동 1' = "공동이나 1등을 굳이 뽑자면 1번째 곡"
// '공동 2' = "공동이나 1등을 굳이 뽑자면 2번째 곡"
// '공동 =' = "공동이나 우열을 가릴 수 없이 똑같음"
// '공동 +' = "공동이나 가수가 같아서 우열을 가리는 것이 의미가 없음"
export type Notation = '-' | '공동 1' | '공동 2' | '공동 =' | '공동 +'

export interface RankingPick {
  year: number
  winner: string
  notation?: Notation
  streamingStartHere?: boolean  // render the divider before this row
}

export interface VoicePick {
  year: number
  member: string
  reason: string
}

export interface NomineeEntry {
  artist: string
  songs: string[]
}

export const NOTATION_LEGEND: { code: string; meaning: string }[] = [
  { code: '(-)',     meaning: '수상하기 미흡하나 그나마 뽑은 곡.' },
  { code: '(공동 1)', meaning: '공동이나 1등을 굳이 뽑자면 1번째 곡.' },
  { code: '(공동 2)', meaning: '공동이나 1등을 굳이 뽑자면 2번째 곡.' },
  { code: '(공동 =)', meaning: '공동이나 우열을 가릴 수 없이 똑같음.' },
  { code: '(공동 +)', meaning: '공동이나 가수가 같아서 우열을 가리는 것이 의미가 없음.' },
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
      { category: '올해의 싱글 타이틀',     winner: 'Love so sweet' },
      { category: '올해의 싱글 커플링송',   winner: 'Sky Again' },
      { category: '올해의 앨범 타이틀',     winner: 'Do you... ?' },
      { category: '올해의 앨범송',          winner: 'ココロチラリ, 空高く' },
      { category: '(특별) 올해의 곡',       winner: '니노미야 카즈나리 — あの夢をなぞって' },
      { category: '(특별) 특별송',          winner: 'Troublemaker / One Love / GUTS! / Daylight / カイト / 僕が僕のすべて' },
      { category: '(특별) 앨범 송',         winner: "Don't you get it?" },
      { category: '올해의 뮤직비디오',      winner: 'Do you... ? (2년 연속)' },
      { category: '올해의 목소리',          winner: '니노미야 카즈나리' },
    ],
  },
  {
    year: 2024,
    recapUrl: YOUTUBE_RECAPS[2024],
    entries: [
      { category: '올해의 싱글 타이틀',           winner: 'Turning Up' },
      { category: '올해의 싱글 커플링송',         winner: '미정 (Still…)' },
      { category: '올해의 앨범 타이틀',           winner: '5x20' },
      { category: '올해의 앨범송',                winner: '5x20' },
      { category: '(특별) 올해의 곡',             winner: 'Troublemaker / GUTS!' },
      { category: '(특별) 올해의 곡 아쉬운 2등',  winner: '復活LOVE / 愛を叫べ' },
      { category: '(특별) 특별송',                winner: 'Love so sweet / A.RA.SHI / Happiness / Monster / 感謝カンゲキ雨嵐 / One Love' },
      { category: '(특별) 앨범 송',               winner: 'Oh Yeah!' },
      { category: '(특별) 특별 솔로곡',           winner: 'm-flo loves 櫻井翔 — come again', runnersUp: ['니노미야 카즈나리 — メリークリスマス'] },
      { category: '올해의 목소리',                winner: '사쿠라이 쇼', note: 'come again 콜라보 공연 영향.' },
    ],
  },
  {
    year: 2023,
    recapUrl: YOUTUBE_RECAPS[2023],
    entries: [
      { category: '올해의 싱글 타이틀',       winner: 'Love so sweet (2년 연속)' },
      { category: '올해의 싱글 커플링송',     winner: '抱きしめたい' },
      { category: '올해의 앨범 타이틀',       winner: 'Oh Yeah! (3년 연속)', runnersUp: ['Do you?'] },
      { category: '올해의 앨범송',            winner: 'Only Love' },
      { category: '(특별) 올해의 앨범솔로송', winner: '虹' },
      { category: '(특별) 올해의 곡',         winner: 'Super Shy + Zero + 可愛くてごめん — 니노미야 카즈나리 AI', runnersUp: ['Turning Up'] },
      { category: '(특별) 특별송',            winner: 'Love Rainbow, 街角の恋人たち, Turning Up, Happiness, Whenever you call, WISH' },
      { category: '(특별) 앨범 송',           winner: '抱擁, Asterisk, SHOW TIME, Days' },
      { category: '올해의 목소리',            winner: '니노미야 카즈나리', note: '222시간 듣고, 전세계 아라시 송 리스너 상위 0.1%.' },
    ],
  },
  {
    year: 2022,
    recapUrl: YOUTUBE_RECAPS[2022],
    entries: [
      { category: '올해의 싱글 타이틀',       winner: 'Love so sweet' },
      { category: '올해의 싱글 커플링송',     winner: 'Monochrome' },
      { category: '올해의 앨범 타이틀',       winner: 'Oh Yeah! (2연속)' },
      { category: '올해의 앨범송',            winner: 'Rock You', runnersUp: ['身長差のない恋人 (변경)'] },
      { category: '(특별) 올해의 앨범솔로송', winner: 'Hip Pop Boogie' },
      { category: '(특별) 올해의 곡',         winner: 'Pretender — 니노미야 카즈나리' },
      { category: '(특별) 눈물의 곡',         winner: 'step and go' },
      { category: '(특별) 앨범 송',           winner: 'キャラメル・ソング, 愛を歌おう, Let Me Down' },
      { category: '(특별) 솔로곡',            winner: 'Attitude — 니노미야 카즈나리', runnersUp: ['Walking with You — 니노미야 카즈나리'] },
      { category: '올해의 목소리',            winner: '니노미야 카즈나리', note: '4,151분 듣기.' },
    ],
  },
  {
    year: 2021,
    recapUrl: YOUTUBE_RECAPS[2021],
    entries: [
      { category: '올해의 싱글 타이틀',     winner: 'Turning Up' },
      { category: '올해의 싱글 커플링송',   winner: 'Kissからはじめようよ' },
      { category: '올해의 앨범 타이틀',     winner: 'Oh Yeah!' },
      { category: '올해의 앨범송',          winner: '夏の名前' },
      { category: '(특별) 올해의 곡',       winner: 'Love so sweet' },
      { category: '(특별) 눈물의 곡',       winner: '感謝カンゲキ雨嵐' },
      { category: '(특별) 특별송',          winner: 'affection, 白が舞う, お気に召すまま, Monster, 台風ジェネレーション -Typhoon Generation-' },
      { category: '(특별) 다시보게된 곡',   winner: '花, Japonesque' },
      { category: '(특별) 앨범 송',         winner: 'JAM, ONLY LOVE, 身長差のない恋人' },
      { category: '(특별) 밴드송',          winner: '言葉よりも大切なもの' },
      { category: '올해의 목소리',          winner: '오노 사토시' },
    ],
  },
  {
    year: 2020,
    entries: [
      { category: '올해의 싱글 타이틀',     winner: 'カイト' },
      { category: '올해의 싱글 커플링송',   winner: 'Journey to Harmony' },
      { category: '올해의 앨범 타이틀',     winner: 'Do you?' },
      { category: '올해의 앨범송',          winner: 'SHOW TIME' },
      { category: '올해의 EP송',            winner: 'A.RA.SHI : Reborn' },
      { category: '(특별) 올해의 곡',       winner: 'Love so sweet' },
      { category: '(특별) 눈물의 곡',       winner: 'The Music Never Ends' },
      { category: '(특별) 리믹스송',        winner: 'Turning Up (R3HAB remix)' },
      { category: '(특별) 리본송',          winner: 'One Love : Reborn' },
      { category: '(특별) 특별송',          winner: 'Turning Up, 台風ジェネレーション -Typhoon Generation-' },
      { category: '올해의 목소리',          winner: '마츠모토 준' },
    ],
  },
  {
    year: 2019,
    entries: [
      { category: '올해의 싱글 타이틀',       winner: 'Turning Up' },
      { category: '올해의 싱글 커플링송',     winner: '미정' },
      { category: '올해의 앨범 타이틀',       winner: '5x20' },
      { category: '올해의 앨범송',            winner: '5x20' },
      { category: '(특별) 올해의 곡',         winner: 'Ray of water' },
      { category: '(특별) 눈물의 곡',         winner: '5x20' },
      { category: '(특별) 공로상 신설',       winner: '마츠모토 준 & 호시노 겐', note: '초회 시상.' },
      { category: '올해의 목소리',            winner: '사쿠라이 쇼' },
    ],
  },
  {
    year: 2018,
    entries: [
      { category: '올해의 싱글 타이틀',     winner: 'Find The Answer' },
      { category: '올해의 싱글 커플링송',   winner: '白が舞う' },
      { category: '올해의 앨범 타이틀',     winner: '미정' },
      { category: '올해의 앨범송',          winner: '미정' },
      { category: '(특별) 올해의 곡',       winner: '5x20' },
      { category: '(특별) 눈물의 곡',       winner: 'アオゾラペダル' },
      { category: '올해의 목소리',          winner: '아이바 마사키' },
    ],
  },
  {
    year: 2017,
    entries: [
      { category: '올해의 싱글 타이틀',     winner: 'つなぐ' },
      { category: '올해의 싱글 커플링송',   winner: 'お気に召すまま' },
      { category: '올해의 앨범 타이틀',     winner: '「未完」' },
      { category: '올해의 앨범송',          winner: 'Song for you' },
      { category: '올해의 듀엣송',          winner: 'UB' },
      { category: '올해의 트리오곡',        winner: '夜の影' },
      { category: '(특별) 올해의 가스펠',   winner: '光' },
      { category: '(특별) 특별송',          winner: 'カンパイ・ソング, Sugar, Treasure of Life' },
      { category: '올해의 목소리',          winner: '아이바 마사키' },
    ],
  },
]

// ----- Voice of the Year — Arashi member of the year + Jun's reason -----
export const voiceOfTheYear: VoicePick[] = [
  { year: 2017, member: '아이바 마사키',     reason: '나의 첫 콘서트에서의 아이바 목소리에 대한 인상.' },
  { year: 2018, member: '아이바 마사키',     reason: '2017년과 동일 + 생일콘.' },
  { year: 2019, member: '사쿠라이 쇼',       reason: 'Hey Everybody 오마타세 / 기타 다른 멤버보다 생각이 많이 났다. / 국회 마일드 양키.' },
  { year: 2020, member: '마츠모토 준',       reason: 'The Music Never Ends / Netflix / Love so sweet.' },
  { year: 2021, member: '오노 사토시',       reason: '애수감과 향수, 그리움.' },
  { year: 2022, member: '니노미야 카즈나리', reason: '활중 이후 실물/디지털 커버 앨범 발매 및 꾸준한 활동.' },
  { year: 2023, member: '니노미야 카즈나리', reason: '다양한 활동 / 소속사 독립 / AI 창작물을 시상자가 만들어봄 ㅎ.' },
  { year: 2024, member: '사쿠라이 쇼',       reason: '활중 이후 랩을 직접 하면서 짧은 콜라보 공연.' },
  { year: 2025, member: '니노미야 카즈나리', reason: '실물 앨범/디지털 커버 + 싱글까지 발매!' },
]

// ----- 기타 타악 순위 (cumulative non-Arashi pick) -----
export const otherRanking: RankingPick[] = [
  { year: 2015, winner: '빅뱅 BANG BANG BANG / 소녀시대 PARTY', notation: '공동 1' },
  { year: 2016, winner: '빈지노 Time Travel' },
  { year: 2017, winner: '방탄소년단 DNA',  notation: '-' },
  { year: 2018, winner: 'TWICE Dance The Night Away', notation: '-' },
  { year: 2019, winner: 'Official髭男dism Pretender / 빌리 아일리쉬 Bad Guy', notation: '공동 1' },
  { year: 2020, winner: '방탄소년단 Dynamite / ReoNa ANIMA', notation: '공동 =', streamingStartHere: true },
  { year: 2021, winner: '레드벨벳 Queendom' },
  { year: 2022, winner: '뉴진스 Hype Boy / Attention', notation: '공동 +' },
  { year: 2023, winner: '뉴진스 OMG / GODS', notation: '공동 +' },
  { year: 2024, winner: 'ILLIT Magnetic / Number_i GOAT', notation: '공동 1' },
  { year: 2025, winner: 'Drake NOKIA / Effie CAN I SIP 담배', notation: '공동 1' },
]

// 기타 타악 nominees per year (when the user logged them)
export const otherNominees: Record<number, NomineeEntry[]> = {
  2024: [
    { artist: 'Drake',         songs: ['NOKIA'] },
    { artist: 'BOYNEXTDOOR',   songs: ['오늘만 I LOVE YOU'] },
    { artist: 'Number_i',      songs: ['未確認領域', 'GOD_i', 'Numbers', 'Ur Zone'] },
    { artist: 'aespa',         songs: ['Dark Arts'] },
    { artist: 'Effie',         songs: ['down', 'CAN I SIP 담배', 'MAKGEOLLI BANGER'] },
    { artist: 'Hearts2Hearts', songs: ['STYLE'] },
    { artist: '동방신기',       songs: ['Psycho'] },
    { artist: 'ILLIT',         songs: ['빌려온 고양이 (Do the Dance)'] },
    { artist: 'Sik-K & Lil Moshpit', songs: ['LOV3'] },
    { artist: 'Noducksoon (노덕순)', songs: ['Fancy Car'] },
    { artist: 'Snow Man',      songs: ['カリスマックス'] },
    { artist: 'Hey! Say! JUMP', songs: ['encore'] },
    { artist: 'King & Prince', songs: ['HEART'] },
    { artist: 'SYSTEM SEOUL',  songs: ['SS'] },
    { artist: '지코 & Lilas',   songs: ['DUET'] },
    { artist: 'LE SSERAFIM',   songs: ['SPAGHETTI'] },
    { artist: 'Playboi Carti', songs: ['EVIL J0RDAN'] },
  ],
}

// ----- J-POP 대상 (cumulative non-Arashi J-Pop pick) -----
export const jpopRanking: RankingPick[] = [
  { year: 2008, winner: 'Buono! Kiss! Kiss! Kiss!' },
  { year: 2009, winner: '동방신기 share the world / Buono! 消失点-Vanishing Point', notation: '공동 1' },
  { year: 2010, winner: '? (미정)' },
  { year: 2011, winner: 'Perfume ねぇ (in Album JPN)' },
  { year: 2012, winner: '이키모노가카리 ハルウタ' },
  { year: 2013, winner: 'SMAP JOY / SEKAI NO OWARI RPG', notation: '공동 1' },
  { year: 2014, winner: 'SEKAI NO OWARI Dragon Night', notation: '-' },
  { year: 2015, winner: '? (미정)' },
  { year: 2016, winner: 'RADWIMPS 「前前前世」', notation: '-' },
  { year: 2017, winner: '호시노겐 恋' },
  { year: 2018, winner: 'King & Prince シンデレラガール' },
  { year: 2019, winner: 'Official髭男dism Pretender', streamingStartHere: true },
  { year: 2020, winner: 'ReoNa ANIMA' },
  { year: 2021, winner: 'なにわ男子 初心LOVE (うぶらぶ)', notation: '-' },
  { year: 2022, winner: 'King & Prince Trace&Trace' },
  { year: 2023, winner: 'Hey! Say! JUMP DEAR MY LOVER / なにわ男子 Poppin’ Hoppin’ Lovin’', notation: '공동 =' },
  { year: 2024, winner: 'Number_i GOAT', notation: '-' },
  { year: 2025, winner: 'King & Prince HEART / 지코 & Lilas DUET', notation: '-' },
]

export const jpopNominees: Record<number, NomineeEntry[]> = {
  2025: [
    { artist: 'King & Prince', songs: ['HEART'] },
    { artist: '지코 & Lilas',   songs: ['DUET'] },
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

export function voiceUpTo(y: number): VoicePick[] {
  return voiceOfTheYear.filter((v) => v.year <= y).sort((a, b) => a.year - b.year)
}

export function otherRankingUpTo(y: number): RankingPick[] {
  return otherRanking.filter((r) => r.year <= y).sort((a, b) => a.year - b.year)
}

export function jpopRankingUpTo(y: number): RankingPick[] {
  return jpopRanking.filter((r) => r.year <= y).sort((a, b) => a.year - b.year)
}
