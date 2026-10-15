import type { ReactNode } from 'react'
import { useSea } from '../state/store'
import type { LayerId } from '../state/layers'

// The Ember Sea without WebGL: the same HUD and data over a drawn, gently animated
// scene for each layer. Used when the device has no WebGL, or with ?flat in the URL.
export function Flat() {
  const layer = useSea((s) => s.layer)
  const heads = useSea((s) => s.heads)
  return (
    <div className={`flat flat-${layer}`} aria-hidden>
      <div className="flat-glow" />
      <div className="flat-bubbles">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.7) % 6}s`, animationDuration: `${6 + (i % 5)}s` }} />
        ))}
      </div>
      <svg className="flat-art" viewBox="-200 -150 400 300" key={layer}>
        {ART[layer](heads)}
      </svg>
    </div>
  )
}

const glow = 'url(#g)'
const defs = (
  <defs>
    <radialGradient id="g">
      <stop offset="0" stopColor="var(--mood)" stopOpacity="0.9" />
      <stop offset="1" stopColor="var(--mood)" stopOpacity="0" />
    </radialGradient>
  </defs>
)

const ART: Record<LayerId, (heads: number) => ReactNode> = {
  membrane: () => (
    <>
      {defs}
      <path d="M-200 -110 Q-100 -130 0 -112 T200 -110 V-150 H-200Z" fill="rgba(244,238,255,0.08)" />
      <ellipse cx="0" cy="30" rx="70" ry="70" fill={glow} opacity="0.5" />
      <path className="flat-eye" d="M-60 30 Q0 -10 60 30 Q0 70 -60 30Z" fill="none" stroke="var(--gold)" strokeWidth="2" />
      <ellipse cx="0" cy="30" rx="4" ry="16" fill="var(--gold)" />
    </>
  ),
  reef: () => (
    <>
      {defs}
      {[
        [-110, 'var(--ember)'],
        [0, 'var(--jade)'],
        [110, 'var(--gold)'],
      ].map(([x, c], i) => (
        <g key={i} transform={`translate(${x} ${i === 1 ? -30 : 0})`}>
          <g className="flat-bob" style={{ animationDelay: `${i * 0.6}s` }}>
            <path d="M-32 0 Q-32 -36 0 -36 Q32 -36 32 0Z" fill="none" stroke={c as string} strokeWidth="2" />
            <circle cy="-14" r="8" fill={c as string} />
            {[-20, -8, 4, 16].map((tx) => (
              <path key={tx} d={`M${tx} 0 q6 20 0 40 q-6 20 0 40`} fill="none" stroke={c as string} strokeOpacity="0.5" />
            ))}
          </g>
        </g>
      ))}
    </>
  ),
  spawn: () => (
    <>
      {defs}
      <ellipse cx="0" cy="96" rx="110" ry="26" fill={glow} opacity="0.35" />
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx={(i - 6.5) * 14 + Math.sin(i * 2.4) * 6} cy={96 + Math.cos(i * 1.7) * 8} rx="7" ry="9" fill="rgba(159,252,240,0.25)" stroke="#9ffcf0" strokeOpacity="0.6" />
      ))}
      {['#9fe6ff', '#5aff9a', '#b08aff', '#ffd36a', '#ff7ad9'].map((c, i) => (
        <g key={c} transform={`translate(${(i - 2) * 62} ${-40 + ((i * 37) % 50)}) scale(${0.5 + (i % 3) * 0.12})`}>
          <g className="flat-bob" style={{ animationDelay: `${i * 0.5}s` }}>
            <path d="M-32 0 Q-32 -36 0 -36 Q32 -36 32 0Z" fill={c} fillOpacity="0.25" stroke={c} strokeWidth="2" />
            {[-18, -6, 6, 18].map((tx) => (
              <path key={tx} d={`M${tx} 0 q5 14 0 28 q-5 14 0 28`} fill="none" stroke={c} strokeOpacity="0.5" />
            ))}
          </g>
        </g>
      ))}
    </>
  ),
  lair: (heads) => (
    <>
      {defs}
      <ellipse cx="0" cy="70" rx="80" ry="50" fill={glow} opacity="0.4" />
      <ellipse cx="0" cy="70" rx="44" ry="34" fill="none" stroke="var(--mood)" strokeWidth="2" />
      {Array.from({ length: Math.min(heads, 7) }, (_, i) => {
        const x = (i - (Math.min(heads, 7) - 1) / 2) * 40
        return (
          <g key={i} className="flat-sway" style={{ animationDelay: `${i * 0.4}s` }}>
            <path d={`M${x * 0.3} 44 Q${x * 0.8} -10 ${x} -60`} fill="none" stroke="var(--mood)" strokeWidth="9" strokeLinecap="round" opacity="0.8" />
            <ellipse cx={x} cy={-68} rx="13" ry="10" fill="var(--mood)" />
            <circle cx={x - 5} cy={-70} r="2.5" fill="var(--gold)" />
            <circle cx={x + 5} cy={-70} r="2.5" fill="var(--gold)" />
          </g>
        )
      })}
    </>
  ),
  vault: () => (
    <>
      {defs}
      <path d="M-120 60 Q0 120 120 60 Q0 30 -120 60Z" fill="rgba(198,107,255,0.25)" stroke="var(--orchid)" />
      <path d="M-120 60 Q-100 -100 0 -110 Q100 -100 120 60" fill="none" stroke="var(--orchid)" strokeOpacity="0.6" />
      <circle cy="20" r="52" fill="rgba(244,238,255,0.08)" stroke="var(--pearl)" />
      <path d="M-50 32 Q0 22 50 32 A52 52 0 0 1 -50 32Z" fill="var(--gold)" opacity="0.6" />
    </>
  ),
  current: () => (
    <>
      {defs}
      {['M-170 -80 Q-110 -40 -40 0', 'M-40 0 Q20 -60 60 -80', 'M-40 0 Q10 50 60 70', 'M60 70 Q110 40 150 20', 'M-110 -40 Q-150 30 -120 70 Q-80 40 -40 0'].map((d, i) => (
        <path key={i} className="flat-flow" d={d} fill="none" stroke={['var(--jade)', 'var(--orchid)', 'var(--gold)', 'var(--ember)', 'var(--orchid)'][i]} strokeWidth="3" />
      ))}
      {[
        [-170, -80],
        [-40, 0],
        [60, -80],
        [60, 70],
        [150, 20],
        [-120, 70],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="10" fill="var(--pearl)" opacity="0.8" />
      ))}
    </>
  ),
  coral: () => (
    <>
      {defs}
      {Array.from({ length: 11 }, (_, i) => {
        const x = (i - 5) * 22
        const h = 60 + ((i * 37) % 50)
        return (
          <g key={i}>
            <path d={`M${x * 0.5} 110 Q${x} ${110 - h / 2} ${x * 1.2} ${110 - h}`} fill="none" stroke="#5b3f8c" strokeWidth="5" strokeLinecap="round" />
            <circle className={i === 5 ? 'flat-pulse' : ''} cx={x * 1.2} cy={110 - h} r="7" fill="var(--orchid)" />
          </g>
        )
      })}
    </>
  ),
  wrecks: () => (
    <>
      {defs}
      <path d="M-130 70 Q-40 50 40 72 T150 66" fill="none" stroke="var(--ember)" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${-100 + i * 18} ${62 - Math.sin(i) * 3} q8 -24 22 -16`} fill="none" stroke="var(--ember)" strokeOpacity="0.7" />
      ))}
      <path d="M-20 52 L-4 88" stroke="var(--gold)" strokeWidth="4" />
    </>
  ),
  grotto: () => (
    <>
      {defs}
      {Array.from({ length: 40 }, (_, i) => {
        const a = i * 2.4
        const r = 30 + (i % 7) * 14
        return <ellipse key={i} className="flat-swim" style={{ animationDelay: `${(i % 9) * 0.4}s` }} cx={Math.cos(a) * r} cy={Math.sin(a) * r * 0.5} rx="6" ry="2.5" fill={i === 7 ? 'var(--gold)' : 'var(--jade)'} opacity={i === 7 ? 1 : 0.6} />
      })}
    </>
  ),
  trench: () => (
    <>
      {defs}
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} className="flat-strata" style={{ animationDelay: `${i * 0.5}s` }} d={`M-200 ${-140 + i * 30} Q0 ${-130 + i * 30} 200 ${-140 + i * 30}`} fill="none" stroke="var(--orchid)" strokeOpacity="0.35" />
      ))}
      <path d="M-200 -150 Q-80 0 -120 150 M200 -150 Q80 0 120 150" fill="none" stroke="var(--pearl)" strokeOpacity="0.2" strokeWidth="6" />
    </>
  ),
}
