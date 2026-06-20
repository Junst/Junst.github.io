import { useState, useCallback, useMemo, type ChangeEvent } from 'react'
import { JumapScene, type ViewMode } from './JumapScene'
import { SongModal, ArtistModal } from './JumapPage'
import { artists, type Song, type Artist } from '../data/jumap'

interface OpenSong { primaryArtist: string; song: Song }

// Full-bleed 3D Jumap. Everything visual lives inside <JumapScene/>; this
// component owns only the DOM-level UI overlay (view-mode toggle, search,
// song/artist modals).
export function JumapPage3D() {
  const [openSong, setOpenSong] = useState<OpenSong | null>(null)
  const [openArtist, setOpenArtist] = useState<Artist | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('country')
  const [search, setSearch] = useState('')

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
        <JumapScene
          onSongOpen={onSongOpen}
          onArtistOpen={onArtistOpen}
          viewMode={viewMode}
          searchQuery={search}
        />
      </div>

      {/* Top bar: view-mode pills (left), search input (right). */}
      <div className="jumap3d-view-modes" role="tablist" aria-label="View grouping">
        {(['country', 'genre', 'tier'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={viewMode === m}
            className={'jumap-mode-btn' + (viewMode === m ? ' active' : '')}
            onClick={() => setViewMode(m)}
          >
            {m === 'country' ? 'Country' : m === 'genre' ? 'Genre' : 'Tier'}
          </button>
        ))}
      </div>

      <div className="jumap3d-search">
        <input
          type="search"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Search artist or song…"
          aria-label="Search"
        />
        {search && (
          <button
            type="button"
            className="jumap3d-search-clear"
            aria-label="Clear search"
            onClick={() => setSearch('')}
          >×</button>
        )}
      </div>

      <div className="jumap3d-help" aria-hidden="true">
        Click planet · Click moon · Drag to move · Right-drag rotates · Scroll zooms
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
