import { useEffect, useState } from 'react'

// Sample the dominant colour of a loaded image and return a CSS `rgb(...)`
// string. Returns null until the image is loaded; falls back to null if the
// image can't be sampled (usually a CORS failure on the canvas readback).
//
// We downscale the image to an 8x8 grid for cheap-but-stable averaging, and
// throw out near-black/near-white/near-grey pixels so the dominant tint is
// the actual artwork colour, not a frame or whitespace edge.
export function useDominantColor(src: string | undefined): string | null {
  const [color, setColor] = useState<string | null>(null)

  useEffect(() => {
    if (!src) { setColor(null); return }
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      try {
        const N = 12
        const canvas = document.createElement('canvas')
        canvas.width = N
        canvas.height = N
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return
        ctx.drawImage(img, 0, 0, N, N)
        const data = ctx.getImageData(0, 0, N, N).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < data.length; i += 4) {
          const cr = data[i], cg = data[i + 1], cb = data[i + 2], ca = data[i + 3]
          if (ca < 200) continue
          // Skip near-white / near-black / near-grey to avoid washing out
          const max = Math.max(cr, cg, cb)
          const min = Math.min(cr, cg, cb)
          if (max - min < 24) continue
          if (max > 245) continue
          if (max < 18) continue
          r += cr; g += cg; b += cb; n++
        }
        if (n < 4) {
          // Fall back to plain average
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
          }
        }
        if (n === 0) return
        const rr = Math.round(r / n), gg = Math.round(g / n), bb = Math.round(b / n)
        setColor(`rgb(${rr}, ${gg}, ${bb})`)
      } catch {
        // Canvas readback blocked (CORS) — give up silently
      }
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])

  return color
}
