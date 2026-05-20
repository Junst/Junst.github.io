import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
    YT?: { Player: new (id: string, opts: unknown) => YTPlayer }
  }
}

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  nextVideo(): void
  getPlayerState(): number
  getVideoData(): { title?: string }
  getCurrentTime(): number
  getDuration(): number
}

export function MusicIsland() {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('Tap to play ♫')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const playerRef = useRef<YTPlayer | null>(null)
  const loadedRef = useRef(false)
  const intervalRef = useRef<number | null>(null)
  const islandRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!expanded) return
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setExpanded(false)
      }
    }
    document.addEventListener('click', onClickOutside)
    return () => document.removeEventListener('click', onClickOutside)
  }, [expanded])

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (playerRef.current && expanded) {
      intervalRef.current = window.setInterval(() => {
        try {
          const cur = playerRef.current!.getCurrentTime()
          const dur = playerRef.current!.getDuration()
          if (dur > 0) setProgress(Math.min(100, (cur / dur) * 100))
        } catch { /* ignore */ }
      }, 250)
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [expanded, playerRef.current])

  function loadYT() {
    if (loadedRef.current) return
    loadedRef.current = true
    if (window.YT && window.YT.Player) {
      createPlayer()
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') {
        try { prev() } catch { /* ignore */ }
      }
      createPlayer()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }

  function createPlayer() {
    if (!window.YT) return
    playerRef.current = new window.YT.Player('di-yt-player', {
      height: '180',
      width: '320',
      videoId: 'mlq32JT4IP4',
      playerVars: {
        autoplay: 1,
        start: 7,
        list: 'RDmlq32JT4IP4',
        listType: 'playlist',
        controls: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          try { playerRef.current!.playVideo() } catch { /* ignore */ }
          updateTitle()
        },
        onStateChange: (e: { data: number }) => {
          if (e.data === 1) { setPlaying(true); updateTitle() }
          else if (e.data === 2 || e.data === 0) { setPlaying(false) }
        },
      },
    } as unknown)
  }

  function updateTitle() {
    if (!playerRef.current) return
    try {
      const d = playerRef.current.getVideoData()
      if (d?.title) setTitle(d.title)
    } catch { /* ignore */ }
  }

  function handleExpand(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(true)
    loadYT()
  }

  function handlePlayPause(e: React.MouseEvent) {
    e.stopPropagation()
    if (!playerRef.current) return
    try {
      if (playerRef.current.getPlayerState() === 1) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    } catch { /* ignore */ }
  }

  function handleNext(e: React.MouseEvent) {
    e.stopPropagation()
    if (!playerRef.current) return
    try {
      playerRef.current.nextVideo()
      window.setTimeout(updateTitle, 700)
    } catch { /* ignore */ }
  }

  return (
    <>
      <div ref={islandRef} id="dynamic-island" className={expanded ? 'di-expanded' : 'di-collapsed'}>
        <button type="button" className="di-trigger" aria-label="Play music" onClick={handleExpand}>▶</button>
        <div className="di-player">
          <div className="di-title">{title}</div>
          <div className="di-controls">
            <button type="button" aria-label="Play/Pause" onClick={handlePlayPause}>{playing ? '⏸' : '▶'}</button>
            <button type="button" aria-label="Next" onClick={handleNext}>⏭</button>
          </div>
        </div>
        <div className="di-progress">
          <div className="di-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div id="di-yt-wrap"><div id="di-yt-player" /></div>
    </>
  )
}
