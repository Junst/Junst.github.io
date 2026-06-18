import type { Tier } from '../data/jumap'

interface TierMeta {
  name: string
  short: string
  // Pre-rendered metallic crown PNG. Lives under /public/assets/tiers/ so
  // it's hot-link safe and works inside an SVG <image href=…> too.
  image: string
}

export const TIER_META: Record<Tier, TierMeta> = {
  1: { name: 'Diamond',  short: 'DIA', image: '/assets/tiers/diamond.png' },
  2: { name: 'Platinum', short: 'PLT', image: '/assets/tiers/platinum.png' },
  3: { name: 'Gold',     short: 'GLD', image: '/assets/tiers/gold.png' },
  4: { name: 'Silver',   short: 'SLV', image: '/assets/tiers/silver.png' },
  5: { name: 'Bronze',   short: 'BRZ', image: '/assets/tiers/bronze.png' },
}

export function tierCrownSrc(tier: Tier): string {
  return TIER_META[tier].image
}

// Compact badge that just shows the metallic crown PNG.
export function TierBadge({ tier, size = 'sm' }: { tier: Tier; size?: 'sm' | 'lg' }) {
  const m = TIER_META[tier]
  const w = size === 'lg' ? 36 : 24
  const h = Math.round((w * 232) / 354)
  return (
    <span
      className={`tier-badge tier-badge-${size} tier-${tier}`}
      title={`Tier ${tier} — ${m.name}`}
      aria-label={m.name}
    >
      <img
        src={m.image}
        alt=""
        width={w}
        height={h}
        className="tier-crown-img"
        loading="lazy"
        draggable={false}
      />
    </span>
  )
}
