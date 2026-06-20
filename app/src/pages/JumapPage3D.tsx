import { useState, useCallback, useMemo } from 'react'
import { JumapScene } from './JumapScene'
import { SongModal, ArtistModal } from './JumapPage'
import { artists, type Song, type Artist } from '../data/jumap'

interface OpenSong { primaryArtist: string; song: Song }

// Full-bleed 3D Jumap. Everything visual lives inside <JumapScene/>; this
// component owns only the DOM-level UI overlay (back link, song/artist modals).
export function JumapPage3D() {
  const [openSong, setOpenSong] = useState<OpenSong | null>(null)
  const [openArtist, setOpenArtist] = useState<Artist | null>(null)
  const artistByName = useMemo(() => {
    const m = new Map<string, Artist>()
    for (const a of artists) m.set(a.name, a)
    return m
  }, [])
  const onSongOpen = useCallback((primaryArtist: string, song: Song) => {
    setOpenSong({ primaryArtist, song })
  }, [])
  const onArtistOpen = useCallback((name: string) => {
    const a = artistByName.get(name)
    if (a) setOpenArtist(a)
  }, [artistByName])
  return (
    <div className="jumap-page jumap-page-3d">
      <div className="jumap3d-stage">
        <JumapScene onSongOpen={onSongOpen} onArtistOpen={onArtistOpen} />
      </div>
      <div className="jumap3d-help" aria-hidden="true">
        Drag planets · Click a planet for the artist · Click a moon for the song · Right-click + drag to rotate · Scroll to zoom
      </div>
      {openSong && (
        <SongModal
          primaryArtist={openSong.primaryArtist}
          song={openSong.song}
          onClose={() => setOpenSong(null)}
        />
      )}
      {openArtist && (
        <ArtistModal
          artist={openArtist}
          onClose={() => setOpenArtist(null)}
        />
      )}
    </div>
  )
}
