import { useState, useCallback } from 'react'
import { JumapScene } from './JumapScene'
import { SongModal } from './JumapPage'
import type { Song } from '../data/jumap'

interface OpenSong { primaryArtist: string; song: Song }

// Full-bleed 3D Jumap. Everything visual lives inside <JumapScene/>; this
// component owns only the DOM-level UI overlay (back link, song modal).
export function JumapPage3D() {
  const [openSong, setOpenSong] = useState<OpenSong | null>(null)
  const onSongOpen = useCallback((primaryArtist: string, song: Song) => {
    setOpenSong({ primaryArtist, song })
  }, [])
  return (
    <div className="jumap-page jumap-page-3d">
      <div className="jumap3d-stage">
        <JumapScene onSongOpen={onSongOpen} />
      </div>
      {/* Help blurb above the canvas — small, transient. */}
      <div className="jumap3d-help" aria-hidden="true">
        Drag planets · Right-click + drag to rotate camera · Scroll to zoom
      </div>
      {openSong && (
        <SongModal
          primaryArtist={openSong.primaryArtist}
          song={openSong.song}
          onClose={() => setOpenSong(null)}
        />
      )}
    </div>
  )
}
