import '../styles/y2k-fonts.css'
import { useEffect, useState } from 'react'

// Hard-coded "now playing" lines that aren't tied to the Riot API.
const NOW_PLAYING = {
  album: 'ARASHI — All the BEST! 1999–2009',
  game: 'League of Legends',
}

const YOUTUBE = {
  // User said channel name is 솔봉 / SOLBON. Hash-routed search URL works
  // even if the exact handle changes; replace with the canonical channel
  // URL when it's known.
  url: 'https://www.youtube.com/@SOLBON',
  fallbackSearchUrl: 'https://www.youtube.com/results?search_query=%EC%86%94%EB%B4%89+SOLBON',
  label: '솔봉 · SOLBON',
}

interface RiotData {
  fetchedAt: string | null
  ddragonVersion: string
  account: { gameName: string; tagLine: string }
  summoner: { profileIconId: number; summonerLevel: number }
  rank: Array<{
    queueType: string
    tier: string
    rank: string
    leaguePoints: number
    wins: number
    losses: number
  }>
  topChampions: Array<{
    championId: number
    championName: string
    championIdName: string | null
    championLevel: number
    championPoints: number
  }>
  recentMatches: Array<{
    matchId: string
    gameMode: string
    queueId: number
    gameStartTimestamp: number
    gameDuration: number
    championName: string
    championIdName: string | null
    kills: number
    deaths: number
    assists: number
    kda: number
    win: boolean
    position: string
    cs: number
    gold: number
  }>
  tft?: {
    rank: Array<{
      queueType: string
      tier: string
      rank: string
      leaguePoints: number
      wins: number
      losses: number
    }>
    recentMatches: Array<{
      matchId: string
      gameDatetime: number
      gameLength: number
      queueId: number
      tftSet: number
      placement: number
      level: number
      lastRound: number
      playersEliminated: number
      goldLeft: number
      traits: Array<{ name: string; numUnits: number; tier: number; style: number }>
      unitCount: number
    }>
  }
  placeholder?: boolean
}

function profileIconUrl(version: string, id: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${id}.png`
}
function championSquareUrl(version: string, idName: string | null | undefined) {
  if (!idName) return null
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${idName}.png`
}

function fmtPoints(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`
  return String(n)
}
function fmtTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86_400_000)
  if (days >= 365) return `${Math.floor(days / 365)}y ago`
  if (days >= 30) return `${Math.floor(days / 30)}mo ago`
  if (days >= 1) return `${days}d ago`
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 1) return `${hours}h ago`
  const mins = Math.floor(diff / 60_000)
  return `${Math.max(1, mins)}m ago`
}
function queueLabel(id: number): string {
  if (id === 420) return 'RANKED SOLO'
  if (id === 440) return 'RANKED FLEX'
  if (id === 430) return 'NORMAL BLIND'
  if (id === 400) return 'NORMAL DRAFT'
  if (id === 450) return 'ARAM'
  if (id === 700) return 'CLASH'
  if (id === 900) return 'URF'
  return `Q ${id}`
}
function tftQueueLabel(id: number): string {
  if (id === 1100) return 'RANKED'
  if (id === 1090) return 'NORMAL'
  if (id === 1130) return 'HYPER ROLL'
  if (id === 1160) return 'DOUBLE UP'
  if (id === 1170) return 'CHONCC'
  return `Q ${id}`
}
function placementOrdinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}
function placementClass(n: number): string {
  if (n === 1) return 'first'
  if (n <= 4) return 'top'
  return 'bot'
}
function traitStyleClass(style: number): string {
  if (style >= 5) return 'unique'
  if (style >= 4) return 'chromatic'
  if (style >= 3) return 'gold'
  if (style >= 2) return 'silver'
  return 'bronze'
}
function cleanTraitName(raw: string): string {
  // Strip Riot's internal "UniqueTrait" / "Trait" suffix and split CamelCase.
  return raw
    .replace(/UniqueTrait$/, '')
    .replace(/Trait$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
}

function Marquee({ children }: { children: string }) {
  return (
    <div className="log-marquee" aria-hidden="true">
      <div className="log-marquee-track">
        {[0, 1, 2].map((i) => (
          <span key={i}>{children}</span>
        ))}
      </div>
    </div>
  )
}

export function LogPage() {
  const [now, setNow] = useState(() => new Date())
  const [data, setData] = useState<RiotData | null>(null)
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    fetch('/data/riot.json')
      .then((r) => r.json())
      .then((d: RiotData) => setData(d))
      .catch((err) => console.warn('riot data fetch failed', err))
  }, [])

  const pad = (n: number) => n.toString().padStart(2, '0')
  const clock = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`

  const soloRank = data?.rank.find((r) => r.queueType === 'RANKED_SOLO_5x5')
  const flexRank = data?.rank.find((r) => r.queueType === 'RANKED_FLEX_SR')
  const tftRank = data?.tft?.rank.find((r) => r.queueType === 'RANKED_TFT')
  const tftMatches = data?.tft?.recentMatches ?? []
  const hasRiot = data && !data.placeholder

  return (
    <div className="log-page">
      <div className="log-grid-bg" aria-hidden="true" />
      <div className="log-scanlines" aria-hidden="true" />

      <header className="log-header">
        <div className="log-header-row">
          <div className="log-id">JUN_LOG</div>
          <div className="log-id-meta">
            <span className="log-status">[ONLINE]</span>
            <span className="log-clock">{date} · {clock}</span>
          </div>
        </div>
        <p className="log-sub">now playing · league log · video signal</p>
      </header>

      <Marquee>
        ★ now playing: ARASHI on shuffle · League of Legends grind continues · catch me on YouTube ★&nbsp;
      </Marquee>

      <main className="log-main">
        {/* Now Playing */}
        <section className="log-card log-card-now">
          <header className="log-card-head">
            <span className="log-card-tag">[karma]</span>
            <h2>NOW_PLAYING</h2>
          </header>
          <ul className="log-now-list">
            <li><span>album</span><b>{NOW_PLAYING.album}</b></li>
            <li><span>game</span><b>{NOW_PLAYING.game}</b></li>
          </ul>
        </section>

        {/* YouTube CTA */}
        <section className="log-card log-card-youtube">
          <header className="log-card-head">
            <span className="log-card-tag">[overload]</span>
            <h2>VIDEO_FEED</h2>
          </header>
          <a
            href={YOUTUBE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="log-yt-link"
          >
            <div className="log-yt-logo" aria-hidden="true">▶</div>
            <div className="log-yt-text">
              <div className="log-yt-handle">{YOUTUBE.label}</div>
              <div className="log-yt-sub">youtube.com/@SOLBON</div>
            </div>
            <div className="log-yt-arrow" aria-hidden="true">→</div>
          </a>
          <a
            href={YOUTUBE.fallbackSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="log-yt-fallback"
          >
            (or search youtube for "솔봉 SOLBON")
          </a>
        </section>

        {/* LoL profile */}
        <section className="log-card log-card-profile">
          <header className="log-card-head">
            <span className="log-card-tag">[overload]</span>
            <h2>SUMMONER.STATS</h2>
          </header>
          {data ? (
            <div className="log-summoner">
              {data.summoner.profileIconId > 0 && (
                <img
                  className="log-summoner-icon"
                  src={profileIconUrl(data.ddragonVersion, data.summoner.profileIconId)}
                  alt=""
                />
              )}
              <div className="log-summoner-body">
                <div className="log-summoner-name">
                  {data.account.gameName}
                  <span className="log-summoner-tag">#{data.account.tagLine}</span>
                </div>
                <div className="log-summoner-level">Lv {data.summoner.summonerLevel || '—'}</div>
                <div className="log-rank-rows">
                  <div className="log-rank-row">
                    <span className="log-rank-q">SOLO/DUO</span>
                    {soloRank ? (
                      <span className="log-rank-v">
                        {soloRank.tier} {soloRank.rank} · {soloRank.leaguePoints} LP
                        <em> · {soloRank.wins}W / {soloRank.losses}L</em>
                      </span>
                    ) : (
                      <span className="log-rank-v log-rank-unranked">UNRANKED</span>
                    )}
                  </div>
                  <div className="log-rank-row">
                    <span className="log-rank-q">FLEX</span>
                    {flexRank ? (
                      <span className="log-rank-v">
                        {flexRank.tier} {flexRank.rank} · {flexRank.leaguePoints} LP
                        <em> · {flexRank.wins}W / {flexRank.losses}L</em>
                      </span>
                    ) : (
                      <span className="log-rank-v log-rank-unranked">UNRANKED</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="log-loading">[loading riot data…]</div>
          )}
        </section>

        {/* Top mastery champions */}
        <section className="log-card log-card-champs">
          <header className="log-card-head">
            <span className="log-card-tag">[bytebounce]</span>
            <h2>TOP_CHAMPS</h2>
          </header>
          {hasRiot && data.topChampions.length > 0 ? (
            <ul className="log-champ-list">
              {data.topChampions.map((c) => {
                const img = championSquareUrl(data.ddragonVersion, c.championIdName)
                return (
                  <li key={c.championId}>
                    {img && <img src={img} alt="" className="log-champ-icon" />}
                    <div className="log-champ-meta">
                      <div className="log-champ-name">{c.championName}</div>
                      <div className="log-champ-mastery">
                        M{c.championLevel} · {fmtPoints(c.championPoints)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="log-loading">[loading…]</div>
          )}
        </section>

        {/* Recent matches */}
        <section className="log-card log-card-matches">
          <header className="log-card-head">
            <span className="log-card-tag">[overload]</span>
            <h2>RECENT_MATCHES</h2>
            {data?.fetchedAt && (
              <span className="log-fetched-at">
                synced {fmtTimeAgo(new Date(data.fetchedAt).getTime())}
              </span>
            )}
          </header>
          {hasRiot && data.recentMatches.length > 0 ? (
            <ol className="log-match-list">
              {data.recentMatches.map((m) => {
                const img = championSquareUrl(data.ddragonVersion, m.championIdName)
                return (
                  <li key={m.matchId} className={m.win ? 'win' : 'loss'}>
                    {img && <img src={img} alt="" className="log-match-champ" />}
                    <div className="log-match-meta">
                      <div className="log-match-head">
                        <span className={m.win ? 'log-match-result win' : 'log-match-result loss'}>
                          {m.win ? 'WIN' : 'LOSS'}
                        </span>
                        <span className="log-match-queue">{queueLabel(m.queueId)}</span>
                        <span className="log-match-when">{fmtTimeAgo(m.gameStartTimestamp)}</span>
                      </div>
                      <div className="log-match-body">
                        <span className="log-match-champ-name">{m.championName}</span>
                        <span className="log-match-kda">{m.kills} / {m.deaths} / {m.assists}</span>
                        <span className="log-match-kda-num">{m.kda} KDA</span>
                        <span className="log-match-cs">{m.cs} cs</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="log-loading">
              {data?.placeholder
                ? '[no data yet — run `npm run riot` with a fresh RIOT_API_KEY]'
                : '[loading…]'}
            </div>
          )}
        </section>

        {/* TFT ladder + recent placements */}
        <section className="log-card log-card-tft">
          <header className="log-card-head">
            <span className="log-card-tag">[granix]</span>
            <h2>TFT.LADDER</h2>
            {tftRank && (
              <span className="log-tft-rank-chip">
                {tftRank.tier} {tftRank.rank} · {tftRank.leaguePoints} LP
                <em> · {tftRank.wins}W / {tftRank.losses}L</em>
              </span>
            )}
            {!tftRank && data && (
              <span className="log-tft-rank-chip log-tft-rank-unranked">UNRANKED</span>
            )}
          </header>
          {hasRiot && tftMatches.length > 0 ? (
            <ol className="log-tft-list">
              {tftMatches.map((m) => (
                <li key={m.matchId} className={`tft-${placementClass(m.placement)}`}>
                  <div className={`log-tft-placement tft-${placementClass(m.placement)}`}>
                    <span className="log-tft-placement-num">{placementOrdinal(m.placement)}</span>
                    <span className="log-tft-placement-set">set {m.tftSet}</span>
                  </div>
                  <div className="log-tft-meta">
                    <div className="log-tft-head">
                      <span className="log-tft-queue">{tftQueueLabel(m.queueId)}</span>
                      <span className="log-tft-level">lvl {m.level}</span>
                      <span className="log-tft-units">{m.unitCount} units</span>
                      <span className="log-tft-when">{fmtTimeAgo(m.gameDatetime)}</span>
                    </div>
                    {m.traits.length > 0 && (
                      <ul className="log-tft-traits">
                        {m.traits.map((t, i) => (
                          <li key={`${m.matchId}-${i}`} className={`trait-${traitStyleClass(t.style)}`}>
                            <b>{t.numUnits}</b>
                            <span>{cleanTraitName(t.name)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="log-loading">[no tft data]</div>
          )}
        </section>
      </main>

      <footer className="log-footer">
        <Marquee>
          ◢◤ end of transmission ◢◤ thanks for reading ◢◤ back to /jumap or just close this tab ◢◤&nbsp;
        </Marquee>
        <div className="log-footer-meta">
          v0.2 · powered by ByteBounce / Granix / Karma / Overload · league data via Riot API
        </div>
      </footer>
    </div>
  )
}
