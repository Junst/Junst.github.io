import { useDominantColor } from '../hooks/useDominantColor'
import { albumArtFor } from '../data/album-art'

interface BaseProps {
  artist: string
  title: string
  size?: number          // px square; defaults differ per use site
  className?: string
}

// Render-only album art thumbnail. Returns null when no cover URL is known.
export function AlbumArt({ artist, title, size = 56, className }: BaseProps) {
  const src = albumArtFor(artist, title)
  if (!src) return null
  return (
    <img
      className={'album-art ' + (className ?? '')}
      src={src}
      alt={`${artist} — ${title}`}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}

// Hook variant that returns both the URL and the sampled dominant colour.
// Callers can use the colour to tint their surrounding card.
export function useAlbumArt(artist: string, title: string) {
  const src = albumArtFor(artist, title)
  const color = useDominantColor(src)
  return { src, color }
}
