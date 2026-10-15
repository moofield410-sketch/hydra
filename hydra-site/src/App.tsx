import { lazy, Suspense, useEffect, useMemo } from 'react'
import { Hud } from './ui/Hud'
import { Flat } from './ui/Flat'
import { startLive } from './state/live'
import { startSpawn } from './state/spawn'
import { MOOD_COLOR } from './palette'
import { useSea } from './state/store'
import { diveStep } from './state/nav'
import { detectQuality, hasWebGL } from './quality'

// The 3D sea loads as its own chunk; the HUD and the 2D sea never wait for it.
const Sea = lazy(() => import('./scene/Lair').then((m) => ({ default: m.Sea })))

export default function App() {
  const mood = useSea((s) => s.moodPreview ?? s.mood)
  const gl = useMemo(hasWebGL, [])
  useEffect(() => {
    useSea.getState().set({ quality: detectQuality() })
    startLive()
    startSpawn()
  }, [])
  useDiveInput()
  return (
    <main className={`app ${gl ? '' : 'is-flat'}`} style={{ ['--mood' as string]: MOOD_COLOR[mood] }}>
      <div className="stage">
        {gl ? (
          <Suspense fallback={<Flat />}>
            <Sea />
          </Suspense>
        ) : (
          <Flat />
        )}
      </div>
      <Hud />
    </main>
  )
}

// Wheel, keys and swipes each move exactly one layer, never a page scroll.
function useDiveInput() {
  useEffect(() => {
    let acc = 0
    let lockedUntil = 0
    const step = (dir: 1 | -1) => {
      const t = performance.now()
      if (t < lockedUntil || useSea.getState().diveTarget) return
      lockedUntil = t + 900
      diveStep(dir)
    }
    // Let panels that genuinely overflow keep their own scroll, and leave an open dialog alone.
    const insideScroller = (el: EventTarget | null) => {
      if ((el as HTMLElement | null)?.closest?.('.spawn-modal')) return true
      const panel = (el as HTMLElement | null)?.closest?.('.panel') as HTMLElement | null
      return !!panel && panel.scrollHeight > panel.clientHeight + 2
    }
    const onWheel = (e: WheelEvent) => {
      if (insideScroller(e.target)) return
      acc += e.deltaY
      if (Math.abs(acc) > 60) {
        step(acc > 0 ? 1 : -1)
        acc = 0
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.spawn-modal')) return
      if (['ArrowDown', 'PageDown'].includes(e.key)) step(1)
      if (['ArrowUp', 'PageUp'].includes(e.key)) step(-1)
    }
    let startY = 0
    const onTouchStart = (e: TouchEvent) => (startY = e.touches[0].clientY)
    const onTouchEnd = (e: TouchEvent) => {
      // The depth scale is dragged, not swiped.
      if (insideScroller(e.target) || (e.target as HTMLElement | null)?.closest?.('.gauge')) return
      const dy = startY - e.changedTouches[0].clientY
      if (Math.abs(dy) > 60) step(dy > 0 ? 1 : -1)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}
