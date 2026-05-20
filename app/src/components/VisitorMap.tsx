import { useEffect, useRef } from 'react'

const SCRIPT_ID = 'mapmyvisitors'
const SCRIPT_SRC = 'https://mapmyvisitors.com/map.js?d=TlQJ9nIrZfWOtn2WR2-4n3-hrZRgE88w5OaVvhNr4ZY&cl=ffffff&w=a'

export function VisitorMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    if (document.getElementById(SCRIPT_ID)) return
    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.src = SCRIPT_SRC
    s.async = true
    containerRef.current.appendChild(s)
  }, [])

  return (
    <div className="visitor-map-wrap">
      <div className="label">Visitors</div>
      <div ref={containerRef} />
    </div>
  )
}
