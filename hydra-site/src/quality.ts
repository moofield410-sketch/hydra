export type Quality = 'high' | 'mid' | 'low'

// Picks a quality tier from the device. `?q=high|mid|low` overrides it for testing.
export function detectQuality(): Quality {
  if (typeof window === 'undefined') return 'mid'
  const forced = new URLSearchParams(location.search).get('q')
  if (forced === 'high' || forced === 'mid' || forced === 'low') return forced
  const cores = navigator.hardwareConcurrency ?? 4
  const phone = window.innerWidth < 760
  let gpu = ''
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    gpu = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)).toLowerCase() : ''
  } catch {
    /* no GPU info: decide from cores alone */
  }
  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) return 'low'
  if (phone || cores <= 4 || /intel|mali|adreno [1-5]|powervr/.test(gpu)) return 'mid'
  return 'high'
}

export function hasWebGL() {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(location.search).has('flat')) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export const lowerQuality = (q: Quality): Quality => (q === 'high' ? 'mid' : 'low')
