/**
 * Pull League of Legends profile data for the LogPage.
 *
 *   RIOT_API_KEY=... RIOT_GAME_NAME=솔봉 RIOT_TAG_LINE=KR1 npx tsx scripts/fetch-riot-data.ts
 *
 * Riot's API does NOT send CORS headers, so we can't fetch from the
 * browser. Instead we fetch at build time and write a static JSON file
 * the LogPage reads. The dev API key expires every 24h, so re-run this
 * script (with a fresh key from developer.riotgames.com) whenever the
 * page goes stale.
 */
import { writeFileSync } from 'fs'

const API_KEY = process.env.RIOT_API_KEY
if (!API_KEY) {
  console.error('RIOT_API_KEY env var is required')
  process.exit(1)
}

const GAME_NAME = process.env.RIOT_GAME_NAME ?? '솔봉'
const TAG_LINE = process.env.RIOT_TAG_LINE ?? 'KR1'
const ROUTE = process.env.RIOT_ROUTE ?? 'asia' // account/match v5 routing
const PLATFORM = process.env.RIOT_PLATFORM ?? 'kr' // summoner/league/mastery

const HDR = { 'X-Riot-Token': API_KEY }

async function fetchJson<T>(url: string, label: string): Promise<T> {
  const r = await fetch(url, { headers: HDR })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`${label} ${r.status}: ${body.slice(0, 200)}`)
  }
  return r.json() as Promise<T>
}

interface Account { puuid: string; gameName: string; tagLine: string }
interface Summoner { id: string; profileIconId: number; summonerLevel: number; revisionDate: number }
interface LeagueEntry {
  queueType: string
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}
interface MasteryEntry {
  championId: number
  championLevel: number
  championPoints: number
  lastPlayTime: number
}
interface MatchDto {
  metadata: { matchId: string; participants: string[] }
  info: {
    gameMode: string
    gameType: string
    gameDuration: number
    gameStartTimestamp: number
    queueId: number
    participants: Array<{
      puuid: string
      championName: string
      championId: number
      kills: number
      deaths: number
      assists: number
      win: boolean
      teamPosition: string
      summonerName: string
      totalMinionsKilled: number
      neutralMinionsKilled: number
      goldEarned: number
    }>
  }
}

async function main() {
  console.log(`[riot] Looking up ${GAME_NAME}#${TAG_LINE} on ${ROUTE}/${PLATFORM}`)

  // 1. Riot account → puuid
  const account = await fetchJson<Account>(
    `https://${ROUTE}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(GAME_NAME)}/${encodeURIComponent(TAG_LINE)}`,
    'Account',
  )
  console.log(`[riot] puuid ${account.puuid.slice(0, 16)}…`)

  // 2. Summoner by puuid (for icon, level, summonerId)
  const summoner = await fetchJson<Summoner>(
    `https://${PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
    'Summoner',
  )

  // 3. Ranked entries (Solo / Flex) — try by-puuid first (current API),
  //    fall back to by-summoner for older dev keys.
  let leagues: LeagueEntry[]
  try {
    leagues = await fetchJson<LeagueEntry[]>(
      `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`,
      'League(puuid)',
    )
  } catch {
    leagues = await fetchJson<LeagueEntry[]>(
      `https://${PLATFORM}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
      'League(summoner)',
    )
  }

  // 4. Top champion masteries
  const masteries = await fetchJson<MasteryEntry[]>(
    `https://${PLATFORM}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/top?count=5`,
    'Mastery',
  )

  // 5. Recent matches
  const matchIds = await fetchJson<string[]>(
    `https://${ROUTE}.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=5`,
    'MatchIds',
  )
  const matches: MatchDto[] = []
  for (const id of matchIds) {
    try {
      matches.push(await fetchJson<MatchDto>(
        `https://${ROUTE}.api.riotgames.com/lol/match/v5/matches/${id}`,
        `Match ${id}`,
      ))
    } catch (e) {
      console.warn(`[riot] skipping ${id}: ${(e as Error).message}`)
    }
  }

  // 6. DDragon — latest version + champion ID → name map
  const ddVersions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json() as string[]
  const ddVersion = ddVersions[0]
  const ddChamps = await (
    await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/en_US/champion.json`)
  ).json() as { data: Record<string, { key: string; name: string; id: string; title: string }> }
  const championNameById = new Map<number, { name: string; id: string }>()
  for (const c of Object.values(ddChamps.data)) {
    championNameById.set(parseInt(c.key, 10), { name: c.name, id: c.id })
  }

  // Build a focused view of each match centred on our player.
  const myMatches = matches
    .map((m) => {
      const me = m.info.participants.find((p) => p.puuid === account.puuid)
      if (!me) return null
      const kda = me.deaths === 0 ? me.kills + me.assists : ((me.kills + me.assists) / me.deaths)
      return {
        matchId: m.metadata.matchId,
        gameMode: m.info.gameMode,
        queueId: m.info.queueId,
        gameStartTimestamp: m.info.gameStartTimestamp,
        gameDuration: m.info.gameDuration,
        championName: me.championName,
        championId: me.championId,
        championIdName: championNameById.get(me.championId)?.id ?? null,
        kills: me.kills,
        deaths: me.deaths,
        assists: me.assists,
        kda: Number(kda.toFixed(2)),
        win: me.win,
        position: me.teamPosition,
        cs: me.totalMinionsKilled + me.neutralMinionsKilled,
        gold: me.goldEarned,
      }
    })
    .filter(Boolean)

  // Champion mastery with names attached.
  const topChampions = masteries.map((m) => {
    const champ = championNameById.get(m.championId)
    return {
      championId: m.championId,
      championName: champ?.name ?? `#${m.championId}`,
      championIdName: champ?.id ?? null,
      championLevel: m.championLevel,
      championPoints: m.championPoints,
    }
  })

  const out = {
    fetchedAt: new Date().toISOString(),
    ddragonVersion: ddVersion,
    account: { gameName: account.gameName, tagLine: account.tagLine },
    summoner: {
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
    },
    rank: leagues,
    topChampions,
    recentMatches: myMatches,
  }

  writeFileSync('public/data/riot.json', JSON.stringify(out, null, 2))
  console.log(`[riot] wrote public/data/riot.json — level ${summoner.summonerLevel}, ${leagues.length} queues, ${myMatches.length} matches`)
}

main().catch((err) => {
  console.error('[riot] Error:', err.message)
  process.exit(1)
})
