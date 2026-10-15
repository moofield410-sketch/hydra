// Jellypions art: reference renderer. SpawnRenderer.sol is a port of this file;
// the Foundry tests compare its output against this one seed by seed.
// A Jellypion is a jellyfish character drawn like a PFP collection: thick outlines, cel shading,
// expressive faces and a wardrobe of traits. The art reveals step by step as the mint
// progresses and is complete at mint-out. No text is ever drawn.

export const TIERS = [ // name, points, supply, colour
  ['Drift', 1, 1834, '#9fe6ff'],
  ['Neon', 2, 833, '#5aff9a'],
  ['Cosmic', 4, 400, '#b08aff'],
  ['Prism', 8, 233, '#ffd36a'],
  ['Genesis', 20, 33, '#ff7ad9'],
]
// Five of the 33 Genesis slots in the fixed pool are hand-built one-of-ones. Until mint-out each one
// looks like an ordinary spawn from its seed; at mint-out it turns into its own art.
export const ONES = ['The Hydra', 'The Burner', 'The Leviathan', 'The Oracle', 'The Glitch']
export const BACKDROP = [ // name, colour, weight: flat, bold colours in the Quantum Cats spirit
  ['Sky', '#8fe3f5', 13], ['Bubble Pink', '#ffa6cd', 13], ['Butter', '#ffe45c', 11], ['Tangerine', '#ff9a3c', 9], ['Cherry', '#ff4d6a', 7],
  ['Lilac', '#c8b4ff', 12], ['Mint', '#9df0c6', 11], ['Cream', '#f5eee0', 9], ['Cobalt', '#3a5bff', 7], ['Night', '#0d0d18', 8],
]
// name, core, base, edge, glow, weight. The body runs core > base > edge; the glow is the accent from the
// neighbouring hue (blue bodies glow pink, oranges glow yellow), used in the rim, the eyes and the tentacle tips.
export const PALETTE = [
  ['Moon Jelly', '#eef7ff', '#a8d4ff', '#5d86f0', '#ff9be0', 12], ['Sea Nettle', '#fff1c2', '#ffb25a', '#f0652e', '#ffe14a', 10],
  ["Lion's Mane", '#ffd6cc', '#ff8078', '#d8346a', '#ffb648', 9], ['Blue Blubber', '#d4ecff', '#5eaaff', '#3d4ce8', '#5cf2ff', 11],
  ['Purple Stripe', '#f3e2ff', '#c592ff', '#7a4ce8', '#ff7ad6', 10], ['Toxic', '#f6ffc0', '#b8f04c', '#38bf5c', '#fff04a', 8],
  ['Bubblegum', '#ffe4f3', '#ff9fd6', '#f04fa6', '#a98cff', 10], ['Ghost', '#ffffff', '#eceeff', '#b2b6e6', '#8ff0ff', 7],
  ['Ember', '#fff5b8', '#ffd24a', '#ff8a1e', '#ff5236', 8], ['Mint', '#e2fff4', '#86f0cc', '#26bfa4', '#7ac8ff', 9],
  ['Abyss', '#b4b4ff', '#6c6ce4', '#2c2886', '#ff66d6', 6], ['Aurora', '#d2fff2', '#7fd8ff', '#9a5cff', '#ff8ad0', 6],
]
export const EYES = [['Classic', 14], ['Bored', 12], ['Sleepy', 7], ['Angry', 7], ['Wink', 6], ['Starry', 6], ['Shades', 8], ['Laser', 4], ['Burned', 10], ['Side-eye', 8], ['Teary', 6], ['Heart', 6], ['Dizzy', 6]]
export const MOUTH = [['Smile', 16], ['Smirk', 14], ['Grin', 10], ['Bored', 12], ['Ooh', 8], ['Tongue', 9], ['Bubblegum', 7], ['Gold Grill', 5], ['Fangs', 9], ['Cat', 10]]
export const HAT = [['None', 30], ['Beanie', 10], ['Backwards Cap', 8], ['Bucket Hat', 7], ['Captain', 6], ['Crown', 6], ['Pirate', 5], ['Party Hat', 7], ['Halo', 6], ['Headphones', 7], ['Propeller', 5], ['Viking', 5], ['Bandana', 5], ['Sprout', 6], ['Cowboy', 5]]
export const NECK = [['None', 34], ['Gold Chain', 12], ['Bow Tie', 12], ['Scarf', 10], ['Pearls', 9], ['Floatie', 13], ['Kerchief', 10]]
export const FACE = [['None', 50], ['Band-aid', 10], ['Freckles', 12], ['Scar', 8], ['Star Sticker', 8], ['Eyepatch', 6], ['Monocle', 6]]
export const SKIN = [['None', 40], ['Spots', 18], ['Stripes', 16], ['Glow Dots', 14], ['Rings', 12]]
export const TENTACLES = [['Wavy', 30], ['Curly', 24], ['Ribbon', 18], ['Stubby', 14], ['Glow', 14]]

// How far the mint has to be, in per mille of supply, before each part of every token shows.
// At 1000 (mint-out) the rarity style appears and every token is complete.
export const REVEAL = { backdrop: 100, palette: 200, tentacles: 300, eyes: 400, mouth: 500, skin: 600, neck: 700, face: 800, hat: 900, style: 1000 }
/** Progress (0..1) as the whole per mille the contract works in. */
export const permille = (p) => Math.round(Math.max(0, Math.min(1, p)) * 1000)

// FNV-1a over the seed string, then mulberry32. Only 32-bit integer maths, so SpawnTraits.sol reproduces it exactly.
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
export function rng(seed) {
  let a = hash(String(seed))
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = (r, arr) => { const tot = arr.reduce((s, a) => s + a[a.length - 1], 0); let x = r() * tot; for (const a of arr) if ((x -= a[a.length - 1]) < 0) return a; return arr[arr.length - 1] }
const f = (n) => Math.round(n * 10) / 10
// Random numbers are drawn as whole tenths so the Solidity port prints the same digits:
// ri(r, n) is a whole number 0..n-1 (exact in floating point), tenth(v) prints v / 10.
const ri = (r, n) => Math.floor(r() * n)
const tenth = (v) => v / 10

// tier: 0..4 from the contract's fixed pool. Pass null to roll 55/25/12/7/1 (preview only).
// one: 0..4 when the pool slot is a one-of-one (always Genesis).
export function traits(seed, tier = null, one = null) {
  const r = rng(seed)
  const roll = r() * 100
  if (one != null) tier = 4
  if (tier == null) tier = roll < 55 ? 0 : roll < 80 ? 1 : roll < 92 ? 2 : roll < 99 ? 3 : 4
  const t = {
    seed, tier, one, backdrop: pick(r, BACKDROP), palette: pick(r, PALETTE), eyes: pick(r, EYES)[0], mouth: pick(r, MOUTH)[0],
    hat: pick(r, HAT)[0], neck: pick(r, NECK)[0], face: pick(r, FACE)[0], skin: pick(r, SKIN)[0], tentacles: pick(r, TENTACLES)[0],
  }
  if (t.eyes === 'Shades' && (t.face === 'Eyepatch' || t.face === 'Monocle')) t.face = 'None'
  if (t.hat === 'Headphones' && t.face === 'Monocle') t.face = 'None'
  return t
}
// Parts that have not been revealed yet read "Hidden". Rarity shows from mint because staking points depend on it.
export const attributes = (t, progress = 1, staked = false) => {
  const pm = permille(progress)
  if (t.one != null && pm >= 1000) return [['Rarity', TIERS[4][0]], ['One of One', ONES[t.one]], ['Revealed', '100%'], ['Points', String(TIERS[4][1])], ['Staked', staked ? 'Yes' : 'No']]
  const v = (k, val) => (pm >= REVEAL[k] ? val : 'Hidden')
  return [
    ['Rarity', TIERS[t.tier][0]], ['Revealed', Math.floor(pm / 10) + '%'],
    ['Background', v('backdrop', t.backdrop[0])], ['Body', v('palette', t.palette[0])], ['Tentacles', v('tentacles', t.tentacles)],
    ['Eyes', v('eyes', t.eyes)], ['Mouth', v('mouth', t.mouth)], ['Skin', v('skin', t.skin)], ['Neck', v('neck', t.neck)],
    ['Face', v('face', t.face)], ['Hat', v('hat', t.hat)], ['Points', String(TIERS[t.tier][1])], ['Staked', staked ? 'Yes' : 'No'],
  ]
}
const haloAt = (x, y, glow) => `<ellipse cx="${x}" cy="${y}" rx="38" ry="40" fill="${glow}" opacity=".7" filter="url(#g6)"/>`
export const comboKey = (t) => [t.backdrop[0], t.palette[0], t.eyes, t.mouth, t.hat, t.neck, t.face, t.skin, t.tentacles].join('|')

const loop = (attr, values, dur, begin = 0) => `<animate attributeName="${attr}" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`
const blur = (id, sd) => `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${sd}"/></filter>`
// x, y and s in tenths.
const sparkle = (x, y, s) => { const [X, Y] = [tenth(x), tenth(y)]; return `M${X} ${tenth(y - s)}Q${X} ${Y} ${tenth(x + s)} ${Y}Q${X} ${Y} ${X} ${tenth(y + s)}Q${X} ${Y} ${tenth(x - s)} ${Y}Q${X} ${Y} ${X} ${tenth(y - s)}Z` }
const star = (x, y, R, r0) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r0 : R; d += `${i ? 'L' : 'M'}${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr)}` } return d + 'Z' }
const heart = (x, y, s) => `M${x} ${f(y + s)}C${f(x - s * 2)} ${f(y - s * 0.2)} ${f(x - s)} ${f(y - s * 1.8)} ${x} ${f(y - s * 0.7)}C${f(x + s)} ${f(y - s * 1.8)} ${f(x + s * 2)} ${f(y - s * 0.2)} ${x} ${f(y + s)}Z`

// The head: a soft, slightly lopsided bell with five chunky scallops on the rim.
const BELL = (() => { let d = 'M80 230C62 148 112 64 204 62C292 60 344 146 322 230'; for (let i = 0; i < 5; i++) { const x = 322 - i * 48.4; d += `Q${f(x - 24.2)} 252 ${f(x - 48.4)} 230` } return d + 'Z' })()
const EYE = [[155, 166], [245, 166]]

// ---------- tentacles ----------
function tentacleSet(kind, r) {
  const out = [], short = kind === 'Stubby'
  for (const [x, d] of [[112, -1], [160, -1], [240, 1], [288, 1]]) {
    const path = (a) => short ? `M${x} 226Q${x + d * 10 + a} 262 ${x + d * 6} 292`
      : kind === 'Curly' ? `M${x} 226C${x - d * 6 + a} 278 ${x + d * 34 - a} 300 ${x + d * 30} 336C${x + d * 26} 366 ${x - d * 4 + a} 368 ${x - d * 2} 346`
        : `M${x} 226C${x - d * 10 + a} 280 ${x + d * 22 - a} 318 ${x + d * 6} 356S${x - d * 8 + a} 420 ${x + d * 10} 452`
    const dur = 35 + ri(r, 21) // tenths of a second
    out.push({ d1: path(-6), d2: path(6), w: 22, dur: tenth(dur), begin: tenth(-ri(r, dur)) })
  }
  for (const x of [184, 216]) {
    const path = (a) => short ? `M${x} 228Q${x - 6 + a} 266 ${x + 2} 300` : `M${x} 228C${x - 12 + a} 270 ${x + 14 - a} 300 ${x} 340S${x - 10 + a} 400 ${x + 4} 450`
    const dur = 40 + ri(r, 21)
    out.push({ d1: path(-5), d2: path(5), w: kind === 'Ribbon' ? 24 : 14, dur: tenth(dur), begin: tenth(-ri(r, dur)), arm: true })
  }
  return out
}
const tPath = (t, attrs) => `<path d="${t.d1}" fill="none" stroke-linecap="round" ${attrs}>${loop('d', `${t.d1};${t.d2};${t.d1}`, t.dur, t.begin)}</path>`
// Each tentacle is drawn whole (border, then fill, then its own extras) before the next one,
// so a tentacle in front always keeps its border where it crosses one behind.
const tentacles = (T, out, paint, extra = () => '') => T.map((x) => tPath(x, `stroke="${out}" stroke-width="${x.w + 12}"`) + tPath(x, `stroke="${paint(x)}" stroke-width="${x.w}"`) + extra(x)).join('')

// Line weights: the silhouette reads 6 px everywhere (bell stroke 6, tentacle border 6 each side),
// features and accessories 5 px, small details 3 to 4 px. One ink colour for all of it.
const INK = '#1b1530'
const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 }

const BOB = '<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="4.2s" repeatCount="indefinite"/>'
const L = (z, body, still) => `<g data-z="${z}"><g class="sq"><g>${still ? '' : BOB}${body}</g></g></g>` // parallax layers for the interactive version
const baseDefs = () => blur('g2', 2) + blur('g6', 6) + blur('g10', 10) + blur('g24', 24) +
  `<clipPath id="bc"><path d="${BELL}"/></clipPath>` + EYE.map(([x, y], i) => `<clipPath id="el${i}"><ellipse cx="${x}" cy="${y}" rx="27" ry="29"/></clipPath>`).join('') +
  `<mask id="sh"><rect width="400" height="400" fill="#fff"/><circle cx="168" cy="118" r="160" fill="#000"/></mask>` +
  `<radialGradient id="mk" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#1c2640"/><stop offset="1" stop-color="#070a14"/></radialGradient>` +
  `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.7 0 0 0 -.62"/></filter>`
// Airbrushed finish: one soft highlight, a glow of the accent colour inside the rim, blurred blush and film grain.
const GLOSS = (op) => `<path d="M116 136C118 100 146 78 180 74C158 88 140 110 134 142Z" fill="#fff" opacity="${op}"/><circle cx="198" cy="80" r="5.5" fill="#fff" opacity="${op}"/>`
const rimGlow = (col, op) => `<g clip-path="url(#bc)"><path d="${BELL}" fill="none" stroke="${col}" stroke-width="36" opacity="${op}" filter="url(#g10)"/></g>`
const cheeks = (op) => `<g filter="url(#g2)" opacity="${op}"><ellipse cx="116" cy="200" rx="17" ry="9" fill="#ff6aa0"/><ellipse cx="284" cy="200" rx="17" ry="9" fill="#ff6aa0"/></g>`
const GRAIN = '<rect width="400" height="400" filter="url(#gr)" opacity=".09"/>'
const ring = (col) => `<circle cx="200" cy="200" r="192" fill="none" stroke="${col}" stroke-width="5" filter="url(#g2)">${loop('opacity', '.3;.95;.3', 3)}</circle>`

// ---------- face ----------
function eyes(k, c) {
  const lid = c.skin || c.base
  // A soft halo of the accent colour behind each eye: the glowing-eye look, on the rarer styles.
  // c.halo holds the halo for each eye ('' when there is none).
  const white = (x, y, i) => (c.halo ? c.halo[i] : '') + `<ellipse cx="${x}" cy="${y}" rx="27" ry="29" fill="#fff"/><path d="M${x - 26} ${y + 7}Q${x} ${y + 46} ${x + 26} ${y + 7}Q${x} ${y + 24} ${x - 26} ${y + 7}Z" fill="#e2e6f4"/><ellipse cx="${x}" cy="${y}" rx="27" ry="29" fill="none" stroke="${c.out}" stroke-width="5"/>`
  const pupil = (x, y, rr = 14, fill = '#16122a') => `<g class="pu"><circle cx="${x}" cy="${y}" r="${rr}" fill="${fill === '#16122a' ? c.iris : fill}"/><circle cx="${x}" cy="${y}" r="${f(rr * 0.6)}" fill="#16122a"/><circle cx="${x - 5}" cy="${y - 5}" r="${f(rr * 0.34)}" fill="#fff"/><circle cx="${x + 5}" cy="${y + 5}" r="${f(rr * 0.14)}" fill="#fff"/></g>`
  const lidLine = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.out}" stroke-width="5" stroke-linecap="round"/>`
  let s = ''
  EYE.forEach(([x, y], i) => {
    const inner = i ? -1 : 1 // direction toward the nose
    switch (k) {
      case 'Classic': s += white(x, y, i) + pupil(x + 3, y + 4); break
      case 'Bored': s += white(x, y, i) + pupil(x + 2, y + 9, 13) + `<path d="M${x - 29} ${y + 2}A29 31 0 0 1 ${x + 29} ${y + 2}Z" fill="${lid}" stroke="${c.out}" stroke-width="5" stroke-linejoin="round" transform="rotate(${i ? 7 : -7} ${x} ${y})"/>`; break
      case 'Sleepy': s += `<path d="M${x - 21} ${y}Q${x} ${y + 17} ${x + 21} ${y}" stroke="${c.out}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${x - 18} ${y + 8}l-6 5M${x + 18} ${y + 8}l6 5" stroke="${c.out}" stroke-width="4" stroke-linecap="round"/>`; break
      case 'Angry': {
        const yo = y - 24, yi = y - 4, xo = x - inner * 30, xi = x + inner * 30
        s += white(x, y, i) + pupil(x + inner * 3, y + 7, 13) + `<g clip-path="url(#el${i})"><path d="M${xo} ${y - 40}L${xi} ${y - 40}L${xi} ${yi}L${xo} ${yo}Z" fill="${lid}"/></g>` + lidLine(x - inner * 27, yo + 1, x + inner * 27, yi - 1)
        break
      }
      case 'Wink': s += i ? `<path d="M${x - 21} ${y + 6}Q${x} ${y - 16} ${x + 21} ${y + 6}" stroke="${c.out}" stroke-width="6" fill="none" stroke-linecap="round"/>` : white(x, y, i) + pupil(x + 3, y + 4); break
      case 'Starry': s += white(x, y, i) + `<g class="pu"><path d="${star(x + 2, y + 3, 15, 7)}" fill="#ffcf3a" stroke="${c.out}" stroke-width="3" stroke-linejoin="round"/></g><circle cx="${x - 8}" cy="${y - 10}" r="4" fill="#fff"/>`; break
      case 'Laser': {
        const e = i ? 420 : -20
        s += `<path d="M${x} ${y - 8}L${e} ${y - 34}V${y + 34}L${x} ${y + 8}Z" fill="#ff2a4a" opacity=".6" filter="url(#g6)">${loop('opacity', '.4;.75;.4', 1.2)}</path><path d="M${x} ${y - 3}L${e} ${y - 10}V${y + 10}L${x} ${y + 3}Z" fill="#ffe2e6"/>` +
          `<ellipse cx="${x}" cy="${y}" rx="40" ry="42" fill="#ff2a4a" opacity=".55" filter="url(#g6)"/>` + white(x, y, i) + pupil(x, y + 2, 13, '#ff2a3a')
        break
      }
      case 'Burned': s += white(x, y, i) + `<path d="M${x - 11} ${y - 11}L${x + 11} ${y + 11}M${x + 11} ${y - 11}L${x - 11} ${y + 11}" stroke="${c.out}" stroke-width="6" stroke-linecap="round"/>`; break
      case 'Side-eye': s += white(x, y, i) + pupil(x + 12, y + 5, 12) + `<g clip-path="url(#el${i})"><rect x="${x - 30}" y="${y - 34}" width="60" height="24" fill="${lid}"/></g>` + lidLine(x - 26, y - 10, x + 26, y - 10); break
      case 'Teary': s += white(x, y, i) + `<g class="pu"><circle cx="${x + 2}" cy="${y + 3}" r="17" fill="#16122a"/><circle cx="${x - 5}" cy="${y - 4}" r="6.5" fill="#fff"/><circle cx="${x + 7}" cy="${y + 2}" r="3" fill="#fff"/><circle cx="${x - 2}" cy="${y + 10}" r="2" fill="#fff"/></g>` +
        (i ? `<path d="M${x + 16} ${y + 24}q9 13 0 19q-9-6 0-19Z" fill="#8fd8ff" stroke="${c.out}" stroke-width="3"/>` : ''); break
      case 'Heart': s += white(x, y, i) + `<g class="pu"><path d="${heart(x + 1, y + 4, 9)}" fill="#ff3a6a" stroke="${c.out}" stroke-width="2.5" stroke-linejoin="round"/></g>`; break
      case 'Dizzy': {
        let d = `M${x} ${y}`; for (let a = 0.4; a < 4 * Math.PI; a += 0.4) d += `L${f(x + Math.cos(a) * a * 1.5)} ${f(y + Math.sin(a) * a * 1.5)}`
        s += white(x, y, i) + `<path d="${d}" stroke="${c.out}" stroke-width="3" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="0 ${x} ${y};360 ${x} ${y}" dur="3s" repeatCount="indefinite"/></path>`
        break
      }
    }
  })
  if (k === 'Shades') {
    s = `<path d="M116 146H284V160C284 194 258 200 240 198C220 196 208 182 205 166H195C192 182 180 196 160 198C142 200 116 194 116 160Z" fill="#15121f" stroke="${c.out}" stroke-width="5" stroke-linejoin="round"/>` +
      `<path d="M136 158L150 174M232 158L246 174" stroke="#fff" stroke-width="5" opacity=".45" stroke-linecap="round"/>`
  }
  return s
}
// Placeholder face shown before the eyes are revealed: two calm dots.
const dotEyes = (c) => EYE.map(([x, y]) => `<ellipse cx="${x}" cy="${y + 2}" rx="9" ry="11" fill="${c.out}"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#fff" opacity=".8"/>`).join('')

function mouth(k, c) {
  const o = c.out, smile = `<path d="M178 200Q200 222 222 200" stroke="${o}" stroke-width="5" fill="none" stroke-linecap="round"/>`
  switch (k) {
    case 'Smile': return smile
    case 'Smirk': return `<path d="M180 207Q204 216 222 197" stroke="${o}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M224 192l3 9" stroke="${o}" stroke-width="4" stroke-linecap="round"/>`
    case 'Grin': return `<path d="M174 197Q200 238 226 197Z" fill="#3a1430" stroke="${o}" stroke-width="5" stroke-linejoin="round"/><path d="M180 200Q200 207 220 200L217 208Q200 214 183 208Z" fill="#fff"/><ellipse cx="200" cy="222" rx="10" ry="5" fill="#ff6a8a"/>`
    case 'Bored': return `<path d="M181 208Q191 203 200 208T219 206" stroke="${o}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    case 'Ooh': return `<ellipse cx="200" cy="210" rx="8" ry="10" fill="#3a1430" stroke="${o}" stroke-width="5"/>`
    case 'Tongue': return smile + `<path d="M191 211Q191 232 200 232Q209 232 209 211Z" fill="#ff6a8a" stroke="${o}" stroke-width="4" stroke-linejoin="round"/><path d="M200 214V226" stroke="#d8406a" stroke-width="2.5" stroke-linecap="round"/>`
    case 'Bubblegum': return `<ellipse cx="194" cy="210" rx="6" ry="5" fill="#3a1430" stroke="${o}" stroke-width="4"/><circle cx="220" cy="214" r="22" fill="#ff9ad0" stroke="${o}" stroke-width="5">${loop('r', '19;24;19', 3)}</circle><ellipse cx="212" cy="206" rx="6" ry="4" fill="#fff" opacity=".8"/>`
    case 'Gold Grill': return `<path d="M174 197Q200 238 226 197Z" fill="#3a1430" stroke="${o}" stroke-width="5" stroke-linejoin="round"/><path d="M180 200Q200 207 220 200L217 210Q200 216 183 210Z" fill="#ffd23a"/><path d="M190 203V212M200 205V214M210 203V212" stroke="#b07a10" stroke-width="2"/>`
    case 'Fangs': return smile + `<path d="M186 206l4 10 4-8ZM214 206l-4 10-4-8Z" fill="#fff" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/>`
    case 'Cat': return `<path d="M181 203q9 11 19 0q10 11 19 0" stroke="${o}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  return ''
}
function faceAcc(k, c) {
  const o = c.out
  switch (k) {
    case 'Band-aid': return `<g transform="rotate(-28 276 118)"><rect x="252" y="108" width="48" height="20" rx="10" fill="#ffd6a8" stroke="${o}" stroke-width="4"/><rect x="268" y="110" width="16" height="16" rx="2" fill="#f0b47a"/></g>`
    case 'Freckles': return [[112, 196], [124, 204], [118, 212], [282, 196], [276, 206], [288, 210]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c.shade}"/>`).join('')
    case 'Scar': return `<path d="M128 112L156 134" stroke="${o}" stroke-width="5" stroke-linecap="round"/><path d="M136 130l8-10M148 138l8-10" stroke="${o}" stroke-width="3" stroke-linecap="round"/>`
    case 'Star Sticker': return `<path d="${star(112, 120, 15, 7)}" fill="#ffd23a" stroke="${o}" stroke-width="4" stroke-linejoin="round" transform="rotate(-12 112 120)"/>`
    case 'Eyepatch': return `<g clip-path="url(#bc)"><path d="M60 104L340 136" stroke="${o}" stroke-width="5"/></g><ellipse cx="245" cy="166" rx="30" ry="31" fill="#15121f" stroke="${o}" stroke-width="5"/>`
    case 'Monocle': return `<path d="M276 186Q300 230 286 262" stroke="#d8a830" stroke-width="3" fill="none"/><circle cx="245" cy="166" r="34" fill="#fff" fill-opacity=".15" stroke="${o}" stroke-width="11"/><circle cx="245" cy="166" r="34" fill="none" stroke="#e8b830" stroke-width="5"/>`
  }
  return ''
}

// ---------- body ----------
function skin(k, c) {
  switch (k) {
    case 'Spots': return [[150, 96, 11], [234, 88, 14], [280, 122, 9], [114, 140, 8], [198, 108, 7], [302, 172, 7], [96, 192, 6]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${c.pat}" opacity=".75"/>`).join('')
    case 'Stripes': return [110, 150, 250, 290].map((x) => `<path d="M204 56Q${f((x + 204) / 2 + (x < 200 ? -12 : 12))} 140 ${x} 236" stroke="${c.shade}" stroke-width="13" fill="none" opacity=".4"/>`).join('')
    case 'Glow Dots': { let s = ''; for (let x = 98; x <= 304; x += 26) s += `<circle cx="${x}" cy="222" r="5" fill="${c.glow}" filter="url(#g2)">${loop('opacity', '.4;1;.4', 2.4, f((x - 98) / 120))}</circle><circle cx="${x}" cy="222" r="2" fill="#fff"/>`; return s }
    case 'Rings': return [48, 92].map((rr) => `<ellipse cx="204" cy="62" rx="${rr * 1.3}" ry="${rr}" fill="none" stroke="${c.pat}" stroke-width="8" opacity=".6"/>`).join('')
  }
  return ''
}
function neck(k, c, back) {
  const o = c.out
  if (k === 'Floatie') {
    const arc = back ? 'M82 254A118 26 0 0 1 318 254' : 'M82 254A118 26 0 0 0 318 254'
    return `<path d="${arc}" stroke="${o}" stroke-width="32" fill="none"/><path d="${arc}" stroke="#ff4a5a" stroke-width="22" fill="none"/><path d="${arc}" stroke="#fff" stroke-width="22" fill="none" stroke-dasharray="34 34"/>`
  }
  if (back) return ''
  const curve = (n, y0, y1, fn) => { let s = ''; for (let i = 0; i <= n; i++) { const u = i / n; s += fn(f((1 - u) ** 2 * 120 + 2 * (1 - u) * u * 200 + u * u * 280), f((1 - u) ** 2 * y0 + 2 * (1 - u) * u * y1 + u * u * y0)) } return s }
  switch (k) {
    case 'Gold Chain': return curve(16, 238, 300, (x, y) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#ffd23a" stroke="${o}" stroke-width="2.5"/>`) +
      `<circle cx="200" cy="286" r="16" fill="#ffd23a" stroke="${o}" stroke-width="5"/><circle cx="200" cy="286" r="8" fill="none" stroke="#c08a10" stroke-width="3"/><circle cx="195" cy="281" r="3" fill="#fff6c8"/>`
    case 'Bow Tie': return `<path d="M200 250L170 234Q164 250 170 266ZM200 250L230 234Q236 250 230 266Z" fill="${c.a1}" stroke="${o}" stroke-width="5" stroke-linejoin="round"/><rect x="190" y="240" width="20" height="20" rx="6" fill="${c.a1}" stroke="${o}" stroke-width="5"/>`
    case 'Scarf': return `<path d="M90 240Q200 272 310 240" stroke="${o}" stroke-width="32" fill="none" stroke-linecap="round"/><path d="M90 240Q200 272 310 240" stroke="${c.a1}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M90 240Q200 272 310 240" stroke="${c.a2}" stroke-width="22" fill="none" stroke-dasharray="14 14"/>` +
      `<path d="M240 252L262 252L270 330L246 334Z" fill="${c.a1}" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>`
    case 'Pearls': return curve(10, 238, 296, (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#fff6ee" stroke="${o}" stroke-width="3"/><circle cx="${f(x - 2.5)}" cy="${f(y - 2.5)}" r="2" fill="#fff"/>`)
    case 'Kerchief': return `<path d="M118 236Q200 258 282 236L200 306Z" fill="${c.a1}" stroke="${o}" stroke-width="5" stroke-linejoin="round"/>` + [[176, 254], [200, 262], [224, 254], [200, 284], [188, 272], [212, 272]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`).join('')
  }
  return ''
}
function hat(k, c) {
  const o = c.out, s5 = `stroke="${o}" stroke-width="5" stroke-linejoin="round"`
  switch (k) {
    case 'Beanie': return `<path d="M94 110C90 28 314 28 310 110Z" fill="${c.a1}" ${s5}/><path d="M86 100Q202 82 318 100L318 130Q202 112 86 130Z" fill="${c.a2}" ${s5}/><circle cx="202" cy="32" r="19" fill="${c.a2}" ${s5}/>`
    case 'Backwards Cap': return `<path d="M100 118Q40 104 30 126Q64 136 104 128Z" fill="${c.a2}" ${s5}/><path d="M100 124C98 44 306 44 304 124Q202 106 100 124Z" fill="${c.a1}" ${s5}/><circle cx="202" cy="52" r="7" fill="${c.a2}" ${s5}/>`
    case 'Bucket Hat': return `<path d="M128 104C124 42 280 42 276 104Z" fill="${c.a1}" ${s5}/><path d="M74 118Q202 70 330 118Q346 134 326 140Q202 108 78 140Q58 134 74 118Z" fill="${c.a2}" ${s5}/>`
    case 'Captain': return `<path d="M98 108C96 50 308 50 306 108Z" fill="#fbfbff" ${s5}/><path d="M100 100Q202 88 304 100L302 120Q202 108 102 120Z" fill="#1d2b4c" ${s5}/><path d="M108 120Q202 146 296 120Q298 136 202 144Q106 136 108 120Z" fill="#15121f" ${s5}/>` +
      `<circle cx="202" cy="78" r="12" fill="none" stroke="#e8b830" stroke-width="5"/><path d="M202 66V96M190 88Q202 100 214 88" stroke="#e8b830" stroke-width="4" fill="none" stroke-linecap="round"/>`
    case 'Crown': return `<path d="M128 110L118 44 160 76 202 26 244 76 286 44 276 110Z" fill="#ffd23a" ${s5}/><path d="M131 96H273" stroke="#c89010" stroke-width="4"/><circle cx="202" cy="72" r="9" fill="#ff3a6a" stroke="${o}" stroke-width="4"/><circle cx="150" cy="88" r="6" fill="#3ac8ff" stroke="${o}" stroke-width="3"/><circle cx="254" cy="88" r="6" fill="#3ac8ff" stroke="${o}" stroke-width="3"/>`
    case 'Pirate': return `<path d="M74 112Q118 30 202 50Q286 30 330 112Q202 86 74 112Z" fill="#2a2440" ${s5}/><path d="M88 104Q202 82 316 104" stroke="#e8b830" stroke-width="4" fill="none"/>` +
      `<circle cx="202" cy="72" r="13" fill="#fff"/><rect x="195" y="80" width="14" height="9" rx="2" fill="#fff"/><circle cx="197" cy="71" r="3.2" fill="#1d1828"/><circle cx="207" cy="71" r="3.2" fill="#1d1828"/>`
    case 'Party Hat': return `<clipPath id="ph"><path d="M156 100L206 6 252 100Z"/></clipPath><path d="M156 100L206 6 252 100Z" fill="${c.a1}"/><g clip-path="url(#ph)">${[20, 50, 80].map((y) => `<path d="M120 ${y + 30}L290 ${y - 10}" stroke="${c.a2}" stroke-width="13"/>`).join('')}</g><path d="M156 100L206 6 252 100Z" fill="none" ${s5}/><circle cx="206" cy="10" r="12" fill="${c.a2}" ${s5}/>`
    case 'Halo': return `<ellipse cx="202" cy="34" rx="62" ry="15" fill="none" stroke="#ffd23a" stroke-width="20" opacity=".7" filter="url(#g6)">${loop('opacity', '.5;.9;.5', 3)}</ellipse><ellipse cx="202" cy="34" rx="62" ry="15" fill="none" stroke="#fff6c8" stroke-width="6"/>`
    case 'Headphones': return `<path d="M84 170C80 26 324 26 320 170" stroke="${o}" stroke-width="22" fill="none" stroke-linecap="round"/><path d="M84 170C80 26 324 26 320 170" stroke="${c.a1}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
      `<rect x="56" y="136" width="46" height="76" rx="20" fill="${c.a1}" ${s5}/><rect x="302" y="136" width="46" height="76" rx="20" fill="${c.a1}" ${s5}/><rect x="70" y="150" width="18" height="48" rx="9" fill="${c.a2}"/><rect x="316" y="150" width="18" height="48" rx="9" fill="${c.a2}"/>`
    case 'Propeller': return `<path d="M136 92C132 48 272 48 268 92Q202 82 136 92Z" fill="${c.a1}" ${s5}/><path d="M202 56V34" stroke="${o}" stroke-width="5"/>` +
      `<g><animateTransform attributeName="transform" type="rotate" values="0 202 32;360 202 32" dur="1.2s" repeatCount="indefinite"/><path d="M202 32Q170 18 154 30Q172 42 202 32ZM202 32Q234 46 250 34Q232 22 202 32Z" fill="${c.a2}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/></g><circle cx="202" cy="32" r="5" fill="${o}"/>`
    case 'Viking': return `<path d="M110 98Q70 84 62 28Q92 62 126 74Z" fill="#f4ead0" ${s5}/><path d="M294 98Q334 84 342 28Q312 62 278 74Z" fill="#f4ead0" ${s5}/><path d="M100 118C98 42 306 42 304 118Z" fill="#b8c2d0" ${s5}/><path d="M102 104Q202 90 302 104L302 122Q202 108 102 122Z" fill="#8a94a8" ${s5}/>` +
      [126, 164, 202, 240, 278].map((x) => `<circle cx="${x}" cy="${x === 202 ? 106 : 108}" r="3.5" fill="#e8ecf2"/>`).join('')
    case 'Bandana': return `<path d="M96 120C92 50 312 50 308 120Q202 100 96 120Z" fill="${c.a1}" ${s5}/><path d="M300 96L340 76L334 106ZM300 104L336 118L312 128Z" fill="${c.a1}" ${s5}/>` + [[140, 90], [180, 74], [224, 74], [264, 90], [202, 98], [160, 104], [244, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`).join('')
    case 'Sprout': return `<path d="M204 66Q198 40 204 20" stroke="${o}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M204 66Q198 40 204 20" stroke="#4ac46a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M204 38Q176 10 154 24Q176 50 204 38ZM204 28Q232 -2 258 12Q234 40 204 28Z" fill="#5ad87a" ${s5}/>`
    case 'Cowboy': return `<path d="M138 96C132 36 172 50 204 54C236 50 276 36 270 96Z" fill="#b8742e" ${s5}/><path d="M140 84Q204 74 268 84L268 95Q204 87 140 95Z" fill="#5a3416"/><path d="M60 110Q98 78 204 94Q310 78 348 110Q338 128 304 120Q204 104 104 120Q70 128 60 110Z" fill="#c8843a" ${s5}/>`
  }
  return ''
}

// ---------- the five rarity styles (shown at mint-out) ----------
const ACCENT = [['#ff5a6a', '#ffd0d6'], ['#3a8aff', '#cfe2ff'], ['#ffb020', '#fff0c0'], ['#3ac88a', '#d0f5e4'], ['#8a5aff', '#e2d6ff'], ['#2a2a3a', '#e8e8f0'], ['#ff8a3a', '#ffe0c8']]
function styleBackground(tier, r, bd, c) {
  if (tier === 1) return `<rect width="400" height="400" fill="#06060c"/><circle cx="200" cy="180" r="180" fill="${c.glow}" opacity=".22" filter="url(#g24)"/>`
  if (tier === 2) { let s = `<rect width="400" height="400" fill="url(#sp)"/><circle cx="80" cy="330" r="90" fill="${bd}" opacity=".22" filter="url(#g24)"/>`; for (let i = 0; i < 70; i++) s += `<circle cx="${tenth(ri(r, 4000))}" cy="${tenth(ri(r, 4000))}" r="${tenth(5 + ri(r, 14))}" fill="#fff" opacity="${tenth(3 + ri(r, 8))}"/>`; return s }
  if (tier === 3) return `<rect width="400" height="400" fill="url(#pb)"/><circle cx="70" cy="60" r="70" fill="#fff" opacity=".5" filter="url(#g24)"/><circle cx="340" cy="340" r="80" fill="#fff" opacity=".4" filter="url(#g24)"/>`
  if (tier === 4) {
    let d = ''; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, b = a + 0.1; d += `M200 170L${f(200 + Math.cos(a) * 320)} ${f(170 + Math.sin(a) * 320)}L${f(200 + Math.cos(b) * 320)} ${f(170 + Math.sin(b) * 320)}Z` }
    return `<rect width="400" height="400" fill="#1a0f2c"/><path d="${d}" fill="#ffd23a" opacity=".1"><animateTransform attributeName="transform" type="rotate" values="0 200 170;360 200 170" dur="60s" repeatCount="indefinite"/></path><circle cx="200" cy="170" r="160" fill="#ffb020" opacity=".22" filter="url(#g24)"/>`
  }
  return ''
}
// The body material of the three top styles, as one pattern that paints the bell and every tentacle.
function styleBody(tier, r, P) {
  if (tier === 2) {
    let s = `<rect width="400" height="400" fill="url(#cg)"/>`
    for (let i = 0; i < 7; i++) s += `<circle cx="${tenth(900 + ri(r, 2201))}" cy="${70 + i * 50}" r="${tenth(300 + ri(r, 401))}" fill="${i % 2 ? P[2] : P[4]}" opacity=".65" filter="url(#g10)"/>`
    for (let i = 0; i < 60; i++) s += `<circle cx="${tenth(700 + ri(r, 2601))}" cy="${tenth(600 + ri(r, 3401))}" r="${tenth(6 + ri(r, 17))}" fill="#fff"/>`
    for (let i = 0; i < 4; i++) s += `<path d="${sparkle(1000 + ri(r, 2001), 800 + ri(r, 1501), 50 + ri(r, 51))}" fill="#fff">${loop('opacity', '.3;1;.3', tenth(15 + ri(r, 21)))}</path>`
    return s
  }
  if (tier === 3) return `<rect width="400" height="400" fill="url(#pr)"/><rect x="-160" y="-50" width="70" height="500" fill="#fff" opacity=".45" transform="skewX(-18)">${loop('x', '-160;520', 3.6)}</rect>`
  if (tier === 4) return `<rect width="400" height="400" fill="url(#gd)"/><rect x="-160" y="-50" width="50" height="500" fill="#fff" opacity=".5" transform="skewX(-18)">${loop('x', '-160;520', 4.5)}</rect>`
  return ''
}
const PRISM = ['#ff9ad8', '#9af0ff', '#fff09a', '#c8a8ff']
const prismStop = (o, i) => `<stop offset="${o}" stop-color="${PRISM[i]}">${loop('stop-color', [0, 1, 2, 3, 0].map((k) => PRISM[(i + k) % 4]).join(';'), 6)}</stop>`

// ---------- the named pieces render() is made of (gen-sol.mjs exports each one to Solidity) ----------
const bodyDefs = (core, base, shade, tip, armTip) => `<radialGradient id="bf" gradientUnits="userSpaceOnUse" cx="168" cy="104" r="236"><stop offset="0" stop-color="${core}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></radialGradient>` +
  `<linearGradient id="tf" gradientUnits="userSpaceOnUse" x1="0" y1="230" x2="0" y2="450"><stop offset="0" stop-color="${base}"/><stop offset="1" stop-color="${tip}"/></linearGradient>` +
  `<linearGradient id="ta" gradientUnits="userSpaceOnUse" x1="0" y1="230" x2="0" y2="450"><stop offset="0" stop-color="${shade}"/><stop offset="1" stop-color="${armTip}"/></linearGradient>`
const neonDefs = (a, b, c) => `<linearGradient id="nl" gradientUnits="userSpaceOnUse" x1="70" y1="40" x2="330" y2="440"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`
const COSMIC_DEFS = `<radialGradient id="sp" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1a1040"/><stop offset="1" stop-color="#030208"/></radialGradient><linearGradient id="cg" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="400"><stop offset="0" stop-color="#7a58e6"/><stop offset=".5" stop-color="#4a2cb0"/><stop offset="1" stop-color="#5a2ca8"/></linearGradient>`
const prismDefs = (bd) => `<linearGradient id="pr" gradientUnits="userSpaceOnUse" x1="60" y1="40" x2="340" y2="420">${prismStop(0, 0)}${prismStop(0.35, 1)}${prismStop(0.7, 2)}${prismStop(1, 3)}</linearGradient><linearGradient id="pb" x2="1" y2="1"><stop offset="0" stop-color="${bd}"/><stop offset=".55" stop-color="#e2f4ff"/><stop offset="1" stop-color="#ffeaf6"/></linearGradient>`
const GOLD_DEFS = `<linearGradient id="gd" gradientUnits="userSpaceOnUse" x1="80" y1="40" x2="320" y2="400"><stop offset="0" stop-color="#fff4b8"/><stop offset=".35" stop-color="#ffd23a"/><stop offset=".65" stop-color="#d8920e"/><stop offset="1" stop-color="#ffe27a"/></linearGradient>`
const stylePattern = (body) => `<pattern id="sty" patternUnits="userSpaceOnUse" width="400" height="400">${body}</pattern>`
const MURK_BG = `<rect width="400" height="400" fill="url(#mk)"/>`
const flatBg = (col) => `<rect width="400" height="400" fill="${col}"/>`
const softGlow = (col, op) => `<circle cx="200" cy="176" r="160" fill="${col}" opacity="${op}" filter="url(#g24)"/>`
const DIM_GLOW = `<circle cx="200" cy="170" r="150" fill="#9fdcff" opacity=".12" filter="url(#g24)"/>`
const bellGlow = (col, op) => `<path d="${BELL}" fill="none" stroke="${col}" stroke-width="20" opacity="${op}" filter="url(#g6)"/>`
const bellFill = (fill) => `<path d="${BELL}" fill="${fill}"/>`
const inBell = (body) => `<g clip-path="url(#bc)">${body}</g>`
const BELL_SHADE = `<path d="${BELL}" fill="#000" opacity=".18" mask="url(#sh)"/>`
const bellLine = (out) => `<path d="${BELL}" fill="none" stroke="${out}" stroke-width="6" stroke-linejoin="round"/>`
const hatGlowDefs = (col) => `<filter id="hg" x="-20%" y="-40%" width="140%" height="180%"><feMorphology in="SourceAlpha" operator="dilate" radius="3"/><feGaussianBlur stdDeviation="6" result="b"/><feFlood flood-color="${col}" flood-opacity=".8"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
const hatGlow = (body) => `<g filter="url(#hg)">${body}</g>`
const GOLD_SPARKLES = [[58, 70, 11], [340, 56, 9], [352, 300, 12], [44, 310, 8], [300, 30, 6]].map(([x, y, k], i) => `<path d="${sparkle(x * 10, y * 10, k * 10)}" fill="#fff6c8">${loop('opacity', '.2;1;.2', 2.2, i * 0.4)}</path>`).join('')
const murk = (op) => `<rect width="400" height="400" fill="#0a1020" opacity="${op}"/>`
const svgDoc = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${defs}</defs>${body}</svg>`

// progress: minted / supply, from 0 to 1. The contract passes totalMinted * 1000 / MAX_SUPPLY / 1000.
export function render(t, { progress = 1, staked = false } = {}) {
  const pm = permille(progress)
  if (t.one != null && pm >= 1000) return renderOne(t, staked)
  const r = rng(t.seed + ':art'), P = t.palette, tier = t.tier
  const shown = (k) => pm >= REVEAL[k], full = shown('style'), col = shown('palette')
  const [a1, a2] = ACCENT[Math.floor(r() * ACCENT.length)]
  const neon = full && tier === 1, mat = full && tier >= 2
  const c = col
    ? { out: tier === 4 && full ? '#3d2205' : INK, core: P[1], base: P[2], shade: P[3], glow: P[4], a1, a2 }
    : { out: '#0b0f1c', core: '#2a3452', base: '#1e2740', shade: '#161d33', glow: '#2a3452', a1, a2 }
  if (neon) Object.assign(c, { out: 'url(#nl)', core: '#2a2a44', base: '#13131f', shade: '#09090f' })
  c.iris = col ? P[4] : '#16122a'
  c.pat = neon ? P[4] : c.core
  c.skin = mat ? 'url(#sty)' : col ? 'url(#bf)' : c.base
  c.halo = full && tier > 0 ? EYE.map(([x, y]) => haloAt(x, y, c.glow)) : null
  const kind = shown('tentacles') ? t.tentacles : 'Wavy'
  const T = tentacleSet(kind, r)

  // Colour: each body is a three-step gradient (core, base, edge) lit from the top left, with an accent
  // colour from the next hue over glowing inside the rim, in the eyes and at the tentacle tips.
  let defs = baseDefs()
  if (col) defs += bodyDefs(c.core, c.base, c.shade, neon ? c.base : c.glow, neon ? c.shade : c.base)
  if (neon) defs += neonDefs(P[4], P[1], P[2])
  if (full && tier === 2) defs += COSMIC_DEFS
  if (full && tier === 3) defs += prismDefs(t.backdrop[1])
  if (full && tier === 4) defs += GOLD_DEFS
  if (mat) defs += stylePattern(styleBody(tier, r, P))

  // background: one flat bold colour and a soft glow behind the character
  let bg = MURK_BG
  if (shown('backdrop')) bg += flatBg(t.backdrop[1])
  if (full && tier > 0) bg += styleBackground(tier, r, t.backdrop[1], c)
  else if (shown('backdrop')) { const dk = lum(t.backdrop[1]) < 0.4; bg += softGlow(dk && col ? c.glow : '#fff', dk ? 0.3 : 0.45) }
  if (!col) bg += DIM_GLOW
  let s = L(2, bg, true)

  // tentacles (behind the bell)
  const paint = (x) => mat ? 'url(#sty)' : col ? (x.arm ? 'url(#ta)' : 'url(#tf)') : x.arm ? c.shade : c.base
  const extra = (x) => kind === 'Ribbon' && x.arm ? tPath(x, `stroke="${mat ? '#fff' : c.core}" stroke-width="5" opacity=".6"`)
    : kind === 'Glow' && !x.arm ? tPath(x, `stroke="${neon ? P[4] : '#fff8c8'}" stroke-width="7" stroke-dasharray="0 20" filter="url(#g2)"`) : ''
  let tn = shown('neck') ? neck(t.neck, c, true) : ''
  if (neon || (full && tier === 2)) tn += T.map((x) => tPath(x, `stroke="${neon ? 'url(#nl)' : '#b89cff'}" stroke-width="${x.w + 18}" opacity="${neon ? 0.55 : 0.45}" filter="url(#g6)"`)).join('')
  s += L(7, tn + tentacles(T, c.out, paint, extra))

  // the bell
  let bell = (neon || (full && tier === 2) ? bellGlow(neon ? 'url(#nl)' : '#b89cff', neon ? 0.7 : 0.55) : '') + bellFill(c.skin)
  if (col) bell += rimGlow(mat ? (tier === 4 ? '#fff4b8' : '#fff') : c.glow, mat ? 0.4 : neon ? 0.35 : 0.55)
  if (shown('skin')) bell += inBell(skin(t.skin, c))
  if (mat) bell += BELL_SHADE
  bell += GLOSS(neon ? 0.2 : 0.6) + bellLine(c.out)
  s += L(9, bell)

  // neck, face, hat
  if (shown('neck')) s += L(10, neck(t.neck, c, false))
  let face = cheeks(neon ? 0.3 : 0.5) + (shown('eyes') ? eyes(t.eyes, c) : dotEyes(c))
  if (shown('mouth')) face += mouth(t.mouth, c)
  if (shown('face')) face += faceAcc(t.face, c)
  s += L(12, face)
  if (shown('hat')) {
    // On a dark background a dark hat would lose its edge, so it gets a soft halo in the glow colour.
    const dark = !neon && (full && tier === 2 || !(full && tier > 0) && shown('backdrop') && lum(t.backdrop[1]) < 0.4)
    if (dark && t.hat !== 'None' && t.hat !== 'Halo') defs += hatGlowDefs(tier === 2 && full ? '#b89cff' : col ? c.glow : '#9fdcff')
    s += L(13, dark ? hatGlow(hat(t.hat, c)) : hat(t.hat, c))
  }

  // finishing touches
  if (full && tier === 4) s += L(14, GOLD_SPARKLES, true)
  s += GRAIN
  if (staked) s += L(14, ring(TIERS[tier][3]), true)
  if (pm < 1000) s += murk(Math.floor(((1000 - pm) * 9) / 20) / 1000) // murky water that clears as the mint fills
  return svgDoc(defs, s)
}

// ---------- the five one-of-ones (mint-out only; until then each looks like an ordinary spawn) ----------
const FRAME = (() => {
  let s = `<rect x="7" y="7" width="386" height="386" rx="14" fill="none" stroke="#1b1530" stroke-width="8"/><rect x="7" y="7" width="386" height="386" rx="14" fill="none" stroke="#ffd23a" stroke-width="4"/><rect x="18" y="18" width="364" height="364" rx="8" fill="none" stroke="#ffd23a" stroke-width="1.5" opacity=".75"/>`
  for (const [x, y] of [[18, 18], [382, 18], [18, 382], [382, 382]]) s += `<path d="M${x} ${y - 9}L${x + 9} ${y}L${x} ${y + 9}L${x - 9} ${y}Z" fill="#ffd23a" stroke="#1b1530" stroke-width="3" stroke-linejoin="round"/>`
  return s
})()
const dloop = (attr, values, dur) => `<animate attributeName="${attr}" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>`
const jitter = (values, dur) => `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>`
// Drifting particles: embers rise (dy < 0), marine snow falls (dy > 0).
function particles(r, n, cols, dy = -70) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const d = f(3 + r() * 5), b = f(-r() * d)
    s += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(1 + r() * 2.4)}" fill="${cols[i % cols.length]}"><animateTransform attributeName="transform" type="translate" values="0 0;${f((r() - 0.5) * 24)} ${dy}" dur="${d}s" begin="${b}s" repeatCount="indefinite"/>${loop('opacity', '0;1;0', d, b)}</circle>`
  }
  return s
}
const stars = (r, n) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * 400)}" cy="${f(r() * 400)}" r="${f(0.5 + r() * 1.3)}" fill="#fff" opacity="${f(0.3 + r() * 0.7)}"/>`; return s }
const flame = (x, y, h, w) => `M${f(x - w)} ${y}C${f(x - w)} ${f(y - h * 0.5)} ${f(x - w * 0.15)} ${f(y - h * 0.62)} ${x} ${f(y - h)}C${f(x + w * 0.15)} ${f(y - h * 0.62)} ${f(x + w)} ${f(y - h * 0.5)} ${f(x + w)} ${y}Z`

// A full jelly from parts, for the one-of-ones: tentacles behind, then the bell.
function drawJelly(c, T, { fill = c.base, arms = c.shade, glow = '', inside = '', rim = c.light, extra } = {}) {
  let tn = glow ? T.map((x) => tPath(x, `stroke="${glow}" stroke-width="${x.w + 18}" opacity=".55" filter="url(#g6)"`)).join('') : ''
  tn += tentacles(T, c.out, (x) => (x.arm ? arms : fill), extra)
  const bell = (glow ? `<path d="${BELL}" fill="none" stroke="${glow}" stroke-width="18" opacity=".6" filter="url(#g6)"/>` : '') + `<path d="${BELL}" fill="${fill}"/>` +
    `<g clip-path="url(#bc)">${inside}</g>${rimGlow(rim, 0.5)}<path d="${BELL}" fill="${c.shade}" opacity=".4" mask="url(#sh)"/>${GLOSS(0.6)}` +
    `<path d="${BELL}" fill="none" stroke="${c.out}" stroke-width="6" stroke-linejoin="round"/>`
  return [tn, bell]
}
// The Hydra's side heads: small copies of the bell on long necks.
const sideHead = (c, cx, rot, dur) => `<g transform="translate(${f(cx - 201 * 0.44)} 26) scale(.44) rotate(${rot} 201 150)"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -10;0 0" dur="${dur}s" repeatCount="indefinite"/>` +
  `<path d="${BELL}" fill="${c.base}"/><path d="${BELL}" fill="${c.shade}" opacity=".55" mask="url(#sh)"/>${GLOSS(0.6)}<path d="${BELL}" fill="none" stroke="${c.out}" stroke-width="13" stroke-linejoin="round"/>${eyes('Angry', c)}${mouth('Fangs', c)}</g></g>`

const ONE_COLOURS = [
  { out: '#1a0610', base: '#e0344a', shade: '#a01c34', light: '#ff9a9a', a1: '#ffd23a', a2: '#ff3a6a', iris: '#ffb020' },
  { out: '#2a0c02', base: '#ff8a1a', shade: '#d8400c', light: '#ffe890', a1: '#ffd23a', a2: '#ff5a1a', iris: '#ff3a00' },
  { out: '#01080c', base: '#0f4a5c', shade: '#072c38', light: '#3af0e0', a1: '#3af0e0', a2: '#7ffcff', iris: '#7ffcff' },
  { out: '#140a3a', base: '#d6defe', shade: '#9aa6ee', light: '#ffffff', a1: '#8a5aff', a2: '#c8b8ff', iris: '#8a3aff' },
  { out: '#0a0a0f', base: '#f2f2f7', shade: '#b8b8cc', light: '#ffffff', a1: '#00f0ff', a2: '#ff00c8', iris: '#0a0a0f' },
]
function renderOne(t, staked) {
  // A one-of-one is the same art whatever its seed: there is only one of it.
  const k = t.one, r = rng('one:' + k), c = ONE_COLOURS[k]
  let defs = baseDefs(), s = ''
  if (k === 0) { // The Hydra: three heads, one will. The agent itself.
    defs += `<radialGradient id="o0" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#6a0e22"/><stop offset="1" stop-color="#12040a"/></radialGradient>`
    let scales = ''
    for (let y = 92, row = 0; y < 232; y += 20, row++) for (let x = 84 + (row % 2) * 13; x < 326; x += 26) scales += `M${x - 11} ${y}q11 12 22 0`
    const T = tentacleSet('Wavy', r), [tn, bell] = drawJelly(c, T, { glow: '#ff4a3a', rim: '#ffb03a', inside: `<path d="${scales}" stroke="${c.shade}" stroke-width="3" fill="none" opacity=".55"/>` })
    const neckPath = (d) => `<path d="${d}" stroke="${c.out}" stroke-width="34" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c.base}" stroke-width="24" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c.shade}" stroke-width="6" fill="none" stroke-dasharray="3 9" stroke-linecap="round"/>`
    s += L(2, `<rect width="400" height="400" fill="url(#o0)"/><circle cx="200" cy="150" r="170" fill="#ff2a3a" opacity=".18" filter="url(#g24)"/>` + particles(r, 30, ['#ff8a3a', '#ffd23a', '#ff3a3a']), true)
    s += L(5, neckPath('M126 196C92 182 76 156 70 116') + neckPath('M282 196C316 182 328 156 334 116') + sideHead(c, 70, -12, 3.6) + sideHead(c, 334, 12, 4.4))
    s += L(7, tn) + L(9, bell) + L(12, cheeks(0.4) + eyes('Angry', c) + mouth('Fangs', c)) + L(13, hat('Crown', c))
  } else if (k === 1) { // The Burner: every buyback ends in fire.
    defs += `<linearGradient id="o1" gradientUnits="userSpaceOnUse" x1="0" y1="60" x2="0" y2="440"><stop offset="0" stop-color="#ffe45a"/><stop offset=".4" stop-color="#ff8a1a">${loop('offset', '.3;.5;.3', 1.6)}</stop><stop offset="1" stop-color="#d8300c"/></linearGradient>` +
      `<linearGradient id="o1f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe45a"/><stop offset="1" stop-color="#ff4a1a"/></linearGradient>` +
      `<radialGradient id="o1b" cx="50%" cy="85%" r="85%"><stop offset="0" stop-color="#5a1606"/><stop offset="1" stop-color="#0c0503"/></radialGradient>`
    const cracks = `<path d="M108 196l14-10 6 12 12-8M290 120l-12 12 8 6-10 14M236 206l10 8 12-4M150 96l10 10-4 10" stroke="#fff6b0" stroke-width="3.5" fill="none" stroke-linejoin="round" stroke-linecap="round">${loop('opacity', '.5;1;.5', 1.3)}</path>`
    const T = tentacleSet('Wavy', r), [tn, bell] = drawJelly(c, T, { fill: 'url(#o1)', arms: '#e84a10', glow: '#ff6a1a', inside: cracks, rim: '#fff4b0' })
    let fl = ''
    for (const [x, y, h, w, i] of [[128, 112, 48, 22, 0], [164, 86, 62, 26, 1], [204, 76, 68, 28, 2], [244, 86, 62, 26, 3], [280, 112, 48, 22, 4]]) {
      const a = flame(x, y, h, w), b = flame(x + (i % 2 ? 5 : -5), y, h * 0.8, w), d = f(0.8 + i * 0.13), ia = flame(x, y, h * 0.55, w * 0.5), ib = flame(x, y, h * 0.4, w * 0.5)
      fl += `<path d="${a}" fill="url(#o1f)" stroke="${c.out}" stroke-width="6" stroke-linejoin="round">${loop('d', `${a};${b};${a}`, d)}</path><path d="${ia}" fill="#fff4b0">${loop('d', `${ia};${ib};${ia}`, d)}</path>`
    }
    s += L(2, `<rect width="400" height="400" fill="url(#o1b)"/><circle cx="200" cy="340" r="170" fill="#ff5a1a" opacity=".28" filter="url(#g24)"/>` + particles(r, 44, ['#ffb03a', '#ffe45a', '#ff5a1a']), true)
    s += L(7, tn) + L(8, fl) + L(9, bell) + L(12, EYE.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="36" fill="#ffe45a" opacity=".45" filter="url(#g10)"/>`).join('') + cheeks(0.35) + eyes('Classic', c) + mouth('Grin', c))
    s += L(14, particles(r, 10, ['#ffe45a', '#fff4b0']), true)
  } else if (k === 2) { // The Leviathan: the deep answers to it.
    defs += `<radialGradient id="o2" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#0a3a50"/><stop offset="1" stop-color="#010409"/></radialGradient>`
    const spots = [[118, 128, 7], [150, 96, 5], [262, 92, 6], [296, 140, 7], [204, 92, 4], [100, 190, 5], [310, 196, 5], [176, 214, 4], [232, 216, 4]]
      .map(([x, y, rr], i) => `<circle cx="${x}" cy="${y}" r="${rr * 2}" fill="#5afff0" filter="url(#g2)">${loop('opacity', '.2;.9;.2', f(1.6 + i * 0.3), f(i * 0.2))}</circle><circle cx="${x}" cy="${y}" r="${f(rr * 0.6)}" fill="#e8fffc"/>`).join('')
    const T = tentacleSet('Ribbon', r), [tn, bell] = drawJelly(c, T, { glow: '#1ab8c0', inside: spots, rim: '#3af0e0', extra: (x) => x.arm ? '' : tPath(x, `stroke="#9ffcff" stroke-width="6" stroke-dasharray="0 20" filter="url(#g2)"`) })
    const lure = `<g><animateTransform attributeName="transform" type="rotate" values="-5 214 66;6 214 66;-5 214 66" dur="4s" repeatCount="indefinite"/><path d="M214 66C222 18 284 -2 318 34" stroke="${c.out}" stroke-width="11" fill="none" stroke-linecap="round"/><path d="M214 66C222 18 284 -2 318 34" stroke="${c.base}" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="320" cy="44" r="30" fill="#5afff0" opacity=".5" filter="url(#g10)">${loop('opacity', '.3;.8;.3', 2)}</circle><circle cx="320" cy="44" r="13" fill="#e8fffc" stroke="${c.out}" stroke-width="5"/><circle cx="315" cy="39" r="4" fill="#fff"/></g>`
    const glowEyes = EYE.map(([x, y], i) => {
      const inner = i ? -1 : 1, xo = x - inner * 30, xi = x + inner * 30
      return `<ellipse cx="${x}" cy="${y}" rx="34" ry="32" fill="#5afff0" opacity=".5" filter="url(#g6)"/><ellipse cx="${x}" cy="${y}" rx="27" ry="29" fill="#b8fff8"/><g class="pu"><ellipse cx="${x + 2}" cy="${y + 3}" rx="6" ry="18" fill="${c.out}"/><circle cx="${x - 9}" cy="${y - 9}" r="5" fill="#fff"/></g>` +
        `<g clip-path="url(#el${i})"><path d="M${xo} ${y - 40}L${xi} ${y - 40}L${xi} ${y - 6}L${xo} ${y - 22}Z" fill="${c.shade}"/></g><ellipse cx="${x}" cy="${y}" rx="27" ry="29" fill="none" stroke="${c.out}" stroke-width="6"/><path d="M${x - inner * 27} ${y - 21}L${x + inner * 27} ${y - 5}" stroke="${c.out}" stroke-width="6" stroke-linecap="round"/>`
    }).join('')
    let teeth = ''
    for (const x of [162, 178, 194, 210, 226, 242]) { const y = f(200 + 8 * (1 - ((x - 200) / 50) ** 2)); teeth += `M${x - 5} ${y}L${x} ${f(y + 11)}L${x + 5} ${y}Z` }
    for (const x of [172, 188, 212, 228]) { const y = f(200 + 23 * (1 - ((x - 200) / 50) ** 2)); teeth += `M${x - 5} ${y}L${x} ${f(y - 10)}L${x + 5} ${y}Z` }
    s += L(2, `<rect width="400" height="400" fill="url(#o2)"/><path d="M140 0H180L110 400H50ZM240 0H262L280 400H214Z" fill="#7ffcff" opacity=".05"/>` + particles(r, 46, ['#cfffff', '#8fd8e8'], 70), true)
    s += L(7, tn) + L(9, bell) + L(11, lure) + L(12, glowEyes + `<path d="M150 200Q200 246 250 200Q200 216 150 200Z" fill="#04141c" stroke="${c.out}" stroke-width="6" stroke-linejoin="round"/><path d="${teeth}" fill="#eafffd"/>`)
  } else if (k === 3) { // The Oracle: the mind behind the defense, always watching the chart.
    defs += `<radialGradient id="o3" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#3a2490"/><stop offset="1" stop-color="#06031a"/></radialGradient>` +
      `<linearGradient id="o3g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f4ff"/><stop offset="1" stop-color="#b4a4ff"/></linearGradient>` +
      `<pattern id="o3p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#8a7aff" stroke-width="1" opacity=".3"/></pattern>` +
      `<clipPath id="o3c"><rect x="-200" y="176" width="800" height="400" transform="rotate(-14 202 176)"/></clipPath>`
    const CIRC = 'M204 132V146H170V120H120V186M204 146H240V122H290V178H312M170 146V210H140M240 146V214H272'
    const circuit = `<path d="${CIRC}" stroke="#8a5aff" stroke-width="3" fill="none" stroke-linejoin="round" opacity=".8"/><path d="${CIRC}" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="8 46" filter="url(#g2)">${loop('stroke-dashoffset', '0;-108', 2.2)}</path>` +
      [[120, 186], [312, 178], [140, 210], [272, 214]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#c8b8ff" stroke="#8a5aff" stroke-width="2"/>`).join('')
    const T = tentacleSet('Wavy', r), [tn, bell] = drawJelly(c, T, { fill: 'url(#o3g)', arms: '#a898f0', glow: '#9a6aff', inside: circuit, rim: '#c8a8ff', extra: (x) => x.arm ? '' : tPath(x, `stroke="#f0e8ff" stroke-width="6" stroke-dasharray="0 18" filter="url(#g2)"`) })
    const third = `<circle cx="204" cy="104" r="30" fill="#b08aff" opacity=".6" filter="url(#g10)">${loop('opacity', '.35;.8;.35', 3)}</circle><path d="M204 76Q234 104 204 132Q174 104 204 76Z" fill="#fff" stroke="${c.out}" stroke-width="5" stroke-linejoin="round"/>` +
      `<g class="pu"><circle cx="204" cy="104" r="10" fill="#8a3aff"/><circle cx="204" cy="104" r="4.5" fill="${c.out}"/><circle cx="201" cy="100" r="2.5" fill="#fff"/></g>`
    const orbit = (th) => { const dx = 186 * Math.cos(th), dy = 44 * Math.sin(th), a = (-14 * Math.PI) / 180; return [f(202 + dx * Math.cos(a) - dy * Math.sin(a)), f(176 + dx * Math.sin(a) + dy * Math.cos(a))] }
    const ringE = (extra) => `<ellipse cx="202" cy="176" rx="186" ry="44" transform="rotate(-14 202 176)" fill="none" stroke="#c8b8ff" stroke-width="4" stroke-dasharray="16 10" ${extra}>${loop('stroke-dashoffset', '0;-52', 2)}</ellipse>`
    const planets = [[0.9, 9, '#ffd23a'], [2.3, 6, '#7ffcff']].map(([th, rr, col]) => { const [x, y] = orbit(th); return `<circle cx="${x}" cy="${y}" r="${rr * 2}" fill="${col}" opacity=".5" filter="url(#g6)"/><circle cx="${x}" cy="${y}" r="${rr}" fill="${col}" stroke="${c.out}" stroke-width="3"/>` }).join('')
    const glints = [[66, 84, 8], [338, 70, 7], [352, 262, 6], [50, 250, 6]].map(([x, y, k2], i) => `<path d="${sparkle(x * 10, y * 10, k2 * 10)}" fill="#fff">${loop('opacity', '.2;1;.2', 2.4, i * 0.5)}</path>`).join('')
    s += L(2, `<rect width="400" height="400" fill="url(#o3)"/><rect width="400" height="400" fill="url(#o3p)"/>` + stars(r, 50) + `<circle cx="204" cy="150" r="150" fill="#8a5aff" opacity=".35" filter="url(#g24)"/>`, true)
    s += L(4, ringE('opacity=".55"')) + L(7, tn) + L(9, bell) + L(12, cheeks(0.35) + eyes('Sleepy', c) + mouth('Smile', c) + third) + L(14, `<g clip-path="url(#o3c)">${ringE('')}</g>` + planets + glints)
  } else { // The Glitch: a spawn the chain could not quite render.
    defs += `<filter id="o4c"><feColorMatrix values="0 0 0 0 0  0 0 0 0 .94  0 0 0 0 1  0 0 0 .8 0"/></filter><filter id="o4m"><feColorMatrix values="0 0 0 0 1  0 0 0 0 0  0 0 0 0 .78  0 0 0 .8 0"/></filter>` +
      `<pattern id="o4s" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.5" fill="#000" opacity=".3"/></pattern>` +
      `<clipPath id="o4k"><rect x="-50" y="150" width="500" height="26">${dloop('y', '150;64;246;118;300;188', 2.4)}</rect></clipPath>`
    const RGB = ['#00f0ff', '#ff00c8', '#ffffff']
    let bands = '', px = ''
    for (let i = 0; i < 12; i++) { const op = f(0.12 + r() * 0.3); bands += `<rect y="${f(r() * 400)}" width="400" height="${f(2 + r() * 12)}" fill="${RGB[i % 3]}" opacity="${op}">${dloop('opacity', `${op};0;${op};${op};0`, f(0.6 + r() * 1.6))}</rect>` }
    for (let i = 0; i < 16; i++) { const sz = f(6 + r() * 10); px += `<rect x="${f(30 + r() * 340)}" y="${f(30 + r() * 340)}" width="${sz}" height="${sz}" fill="${RGB[i % 3]}">${dloop('opacity', '1;0;1;0;0;1', f(0.8 + r() * 1.8))}</rect>` }
    const T = tentacleSet('Curly', r), [tn, bell] = drawJelly(c, T, { inside: `<path d="M60 112H340M60 142H340M60 198H340" stroke="#d6d6e4" stroke-width="6"/>`, rim: '#9af0ff' })
    const pxEyes = EYE.map(([x, y], i) => `<rect x="${x - 17}" y="${y - 19}" width="34" height="38" fill="${c.out}"/><g class="pu"><rect x="${x - 11}" y="${y - 13}" width="10" height="10" fill="#fff"/></g>` +
      (i ? `<rect x="${x - 17}" y="${y - 19}" width="34" height="38" fill="#00f0ff">${dloop('opacity', '0;0;0;1;0;0;0;0;1;0', 1.7)}</rect>` : '')).join('')
    const pxMouth = `<rect x="178" y="200" width="8" height="8" fill="${c.out}"/><rect x="186" y="208" width="28" height="8" fill="${c.out}"/><rect x="214" y="200" width="8" height="8" fill="${c.out}"/>`
    s += L(2, `<rect width="400" height="400" fill="#0d0d16"/>` + bands, true) +
      `<use href="#o4" filter="url(#o4c)">${jitter('-6 0;-9 1;-4 -1;-7 0;-12 0', 0.9)}</use><use href="#o4" filter="url(#o4m)">${jitter('6 0;8 -1;5 1;10 0;7 0', 1.1)}</use>` +
      `<g id="o4">${L(7, tn) + L(9, bell) + L(12, cheeks(0.3) + pxEyes + pxMouth)}</g><use href="#o4" clip-path="url(#o4k)">${jitter('16 0;-14 0;22 0;-8 0', 2.4)}</use>` +
      L(14, px + `<rect width="400" height="400" fill="url(#o4s)"/>`, true)
  }
  s += GRAIN + L(15, FRAME + (staked ? ring(TIERS[4][3]) : ''), true)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${defs}</defs>${s}</svg>`
}

// The second or two between mint and hatch(): a glowing larva in dark water.
export function egg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${blur('g10', 10)}<radialGradient id="mk" cx="50%" cy="30%" r="80%"><stop offset="0" stop-color="#1c2640"/><stop offset="1" stop-color="#070a14"/></radialGradient></defs>` +
    `<rect width="400" height="400" fill="url(#mk)"/><circle cx="200" cy="200" r="40" fill="#9ffcf0" opacity=".3" filter="url(#g10)">${loop('r', '30;50;30', 2)}</circle><ellipse cx="200" cy="200" rx="9" ry="6" fill="#dffff8"/></svg>`
}

// animation_url: the same SVG, made interactive. Layers drift with the pointer or phone tilt, pupils follow, a tap makes it squish.
export function interactiveHTML(svg) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}svg{position:absolute;inset:0;margin:auto;width:100vmin;height:100vmin}.sq{transform-origin:200px 240px;transform-box:view-box}.pop{animation:p .55s ease-out}@keyframes p{30%{transform:scale(1.06,.93)}60%{transform:scale(.97,1.04)}}</style></head><body>' + svg +
    '<script>var L=[].slice.call(document.querySelectorAll("[data-z]")),U=[].slice.call(document.querySelectorAll(".pu")),S=[].slice.call(document.querySelectorAll("[data-z]:not([data-z=\'2\']) .sq")),tx=0,ty=0,x=0,y=0;' +
    'function m(a,b){tx=Math.max(-1,Math.min(1,a));ty=Math.max(-1,Math.min(1,b))}' +
    'addEventListener("pointermove",function(e){m(e.clientX/innerWidth*2-1,e.clientY/innerHeight*2-1)});document.documentElement.addEventListener("pointerleave",function(){m(0,0)});' +
    'addEventListener("deviceorientation",function(e){if(e.gamma!=null)m(e.gamma/30,(e.beta-40)/30)});' +
    'addEventListener("pointerdown",function(){S.forEach(function(g){g.classList.remove("pop");void g.getBoundingClientRect();g.classList.add("pop")})});' +
    '(function f(){x+=(tx-x)*.08;y+=(ty-y)*.08;L.forEach(function(g){var z=+g.getAttribute("data-z")-8;g.setAttribute("transform","translate("+(x*z).toFixed(2)+" "+(y*z).toFixed(2)+")")});' +
    'U.forEach(function(p){p.setAttribute("transform","translate("+(x*6).toFixed(2)+" "+(y*5).toFixed(2)+")")});requestAnimationFrame(f)})();</script></body></html>'
}

const DESCRIPTION = "A Jellypion: one of 3,333 jellyfish that guard an AI agent's token. Reveals as the mint fills, drawn fully on-chain."
// tokenURI shape, exactly as the contract returns it.
export function tokenURI(t, id, progress, staked) {
  const svg = render(t, { progress, staked })
  const json = JSON.stringify({
    name: `Jellypion #${id}`, description: DESCRIPTION,
    image: 'data:image/svg+xml;base64,' + btoa(svg), animation_url: 'data:text/html;base64,' + btoa(interactiveHTML(svg)),
    attributes: attributes(t, progress, staked).map(([trait_type, value]) => ({ trait_type, value })),
  })
  return 'data:application/json;base64,' + btoa(json)
}
// A token minted but not yet hatched (the block its seed comes from has not been made yet).
export function eggURI(id) {
  const json = JSON.stringify({
    name: `Jellypion #${id}`, description: DESCRIPTION, image: 'data:image/svg+xml;base64,' + btoa(egg()),
    attributes: [{ trait_type: 'Status', value: 'Hatching' }],
  })
  return 'data:application/json;base64,' + btoa(json)
}

// Internal parts, exported for gen-sol.mjs (which writes the Solidity data contracts) and the tests.
export const __parts = { L, BOB, bodyDefs, neonDefs, COSMIC_DEFS, prismDefs, GOLD_DEFS, stylePattern, MURK_BG, flatBg, softGlow, DIM_GLOW, bellGlow, bellFill, inBell, BELL_SHADE, bellLine, hatGlowDefs, hatGlow, GOLD_SPARKLES, murk, svgDoc, eyes, mouth, faceAcc, skin, neck, hat, tentacleSet, baseDefs, renderOne, sparkle, ring, haloAt, BELL, GRAIN, GLOSS, rimGlow, cheeks, dotEyes, styleBackground, styleBody, prismStop, ACCENT, INK, lum, loop, tPath }
