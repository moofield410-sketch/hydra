import { useEffect, useState, type CSSProperties } from 'react'

// When the panel becomes a bottom sheet: phones, and any tall, narrow screen (tablets held upright,
// a phone showing the "desktop site"). The same query is written out in the CSS; keep them together.
export const SHEET_QUERY = '(max-width: 760px), (max-width: 1180px) and (orientation: portrait)'

const sheet = typeof window !== 'undefined' ? window.matchMedia(SHEET_QUERY) : null
/** Cheap enough to read every frame. */
export const isSheet = () => !!sheet?.matches

export function useSheet() {
  const [on, setOn] = useState(isSheet)
  useEffect(() => {
    if (!sheet) return
    const change = () => setOn(sheet.matches)
    sheet.addEventListener('change', change)
    return () => sheet.removeEventListener('change', change)
  }, [])
  return on
}

// "Desktop site" on a phone lays the page out about 980px wide and shrinks it onto the screen,
// so every label comes out tiny. This is how much to scale the HUD back up to the phone's real size.
function hudZoom() {
  if (typeof window === 'undefined' || !navigator.maxTouchPoints) return 1
  const short = Math.min(screen.width, screen.height)
  if (short > 600) return 1 // tablets read fine at desktop width
  const across = innerHeight >= innerWidth ? short : Math.max(screen.width, screen.height)
  const z = innerWidth / across
  return z > 1.25 ? Math.min(z, 3) : 1
}

/**
 * The HUD's zoom plus its own viewport units. Inside a zoomed box the browser scales vw and vh
 * as well, so the HUD measures with --vw / --vh instead.
 */
export function useHudScale(): CSSProperties {
  const [zoom, setZoom] = useState(hudZoom)
  useEffect(() => {
    const on = () => setZoom(hudZoom())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  if (zoom === 1) return {}
  return {
    zoom,
    ['--vw' as string]: `${innerWidth / zoom / 100}px`,
    ['--vh' as string]: `${innerHeight / zoom / 100}px`,
  }
}
