import type { Tier } from '../data/jumap'

interface TierMeta {
  name: string
  short: string
  bgFrom: string
  bgTo: string
  crown: string  // CSS colour for the crown silhouette
}

export const TIER_META: Record<Tier, TierMeta> = {
  1: { name: 'Diamond',  short: 'DIA', bgFrom: '#bef0ff', bgTo: '#4dd0e1', crown: '#006978' },
  2: { name: 'Platinum', short: 'PLT', bgFrom: '#f0f1f6', bgTo: '#b5bcc6', crown: '#455a64' },
  3: { name: 'Gold',     short: 'GLD', bgFrom: '#fff3a0', bgTo: '#f6b73c', crown: '#8c6900' },
  4: { name: 'Silver',   short: 'SLV', bgFrom: '#f7f7f7', bgTo: '#bdbdbd', crown: '#555555' },
  5: { name: 'Bronze',   short: 'BRZ', bgFrom: '#ffd6b0', bgTo: '#c98a4f', crown: '#8c4a00' },
}

function Crown({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg
      className="tier-crown"
      viewBox="0 0 32 22"
      width={size}
      height={(size * 22) / 32}
      aria-hidden="true"
    >
      <path
        d="M2 19 L4 5 L11 12 L16 2 L21 12 L28 5 L30 19 Z"
        fill={color}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="12" r="1.6" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
      <circle cx="21" cy="12" r="1.6" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
      <circle cx="16" cy="3"  r="1.9" fill={color} stroke="rgba(0,0,0,0.18)" strokeWidth="0.4" />
    </svg>
  )
}

export function TierBadge({ tier, size = 'sm' }: { tier: Tier; size?: 'sm' | 'lg' }) {
  const m = TIER_META[tier]
  return (
    <span
      className={`tier-badge tier-badge-${size} tier-${tier}`}
      style={{
        background: `linear-gradient(135deg, ${m.bgFrom}, ${m.bgTo})`,
      }}
      title={`Tier ${tier} — ${m.name}`}
    >
      <Crown color={m.crown} size={size === 'lg' ? 18 : 13} />
      <span className="tier-badge-name">{m.name}</span>
    </span>
  )
}
