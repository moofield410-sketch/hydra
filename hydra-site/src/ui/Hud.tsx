import { useEffect, useRef, useState } from 'react'
import { ACTIVITY_INFO, useSea, type Activity } from '../state/store'
import { CONFIG, HAS_VAULT } from '../config'
import { HOUR_COLOR } from '../palette'
import { LAYERS, layerIndex, layer as layerOf, type LayerId } from '../state/layers'
import { depthReadout, dive, diveStep, diveTo } from '../state/nav'
import { VaultPanel } from './VaultPanel'
import { CoralPanel, CurrentPanel, MembranePanel, ReefPanel, TrenchPanel, WrecksPanel } from './Panels'
import { GrottoPanel } from './GrottoPanel'
import { SpawnPanel } from './SpawnPanel'
import { setSound } from '../audio'
import { Logo } from './Logo'

export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
/** Shown wherever a number does not exist yet (before launch, or before the first read). */
export const NONE = '—'
const moodName = (m: string) => (m === 'calm' ? 'Calm' : m === 'fear' ? 'Under attack' : 'Hype')
const fathoms = (d: number) => (d === Infinity ? '∞' : d === 0 ? '0' : `−${fmt(d)}`)

export function Hud() {
  return (
    <div className="hud">
      <TopBar />
      <DepthGauge />
      <Panel />
      <Ticker />
      <DiveHint />
      <Floaters />
      <DiveVeil />
    </div>
  )
}

function TopBar() {
  const { price, change24h, fund, mood, heads, live, sound } = useSea()
  return (
    <header className="topbar glass">
      <div className="brand">
        <span className="brand-mark">
          <Logo />
        </span>
        <span className="brand-name">HYDRA</span>
      </div>
      <dl className="stats">
        <div>
          <dt>Price</dt>
          <dd>
            {live && price > 0 ? (
              <>
                ${price.toFixed(5)} <span className={change24h >= 0 ? 'up' : 'down'}>{change24h >= 0 ? '▲' : '▼'} {fmt(Math.abs(change24h), 1)}%</span>
              </>
            ) : (
              NONE
            )}
          </dd>
        </div>
        <div>
          <dt>Defense fund</dt>
          <dd>{live || HAS_VAULT ? `${fmt(fund)} ORBIO` : NONE}</dd>
        </div>
        <div className="hide-sm">
          <dt>Heads</dt>
          <dd>{heads}</dd>
        </div>
      </dl>
      <a className="xlink docs-link" href="./docs/">
        Docs
      </a>
      <a className="xlink" href={`https://x.com/${CONFIG.xHandle}`} target="_blank" rel="noopener noreferrer" title={`@${CONFIG.xHandle} on X`}>
        <span aria-hidden>𝕏</span>
        <span className="hide-sm">@{CONFIG.xHandle}</span>
      </a>
      <button
        type="button"
        className={`sound ${sound ? 'on' : ''}`}
        onClick={() => setSound(!sound)}
        aria-pressed={sound}
        title={sound ? 'Mute the sea' : 'Hear its heartbeat'}
      >
        <span className="bars" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="hide-sm">{sound ? 'Sound on' : 'Sound off'}</span>
      </button>
      <div className={`mood mood-${mood}`} title={moodName(mood)}>
        <span className="mood-dot" />
        <span className="mood-text">{moodName(mood)}</span>
      </div>
    </header>
  )
}

// Counts the fathoms smoothly while the camera dives.
function DepthNumber() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let id = 0
    const tick = () => {
      if (ref.current) ref.current.textContent = fathoms(Math.round(depthReadout()))
      id = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(id)
  }, [])
  return <span ref={ref} />
}

function DepthGauge() {
  const here = useSea((s) => s.diveTarget ?? s.layer)
  return (
    <nav className="gauge" aria-label="Depth">
      <div className="gauge-depth">
        <DepthNumber />
        <small>fathoms</small>
      </div>
      <ol>
        {LAYERS.map((l) => {
          const isHere = l.id === here
          return (
            <li key={l.id} className={isHere ? 'here' : ''}>
              <button type="button" aria-current={isHere ? 'location' : undefined} onClick={() => diveTo(l.id)} title={l.name}>
                <span className="tick" />
                <span className="gauge-label">
                  {l.name}
                  <small>{l.id === 'trench' ? `${fathoms(l.depth)} → ∞` : fathoms(l.depth)}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Panel() {
  const id = useSea((s) => s.layer)
  return (
    <aside className="panel glass" key={id}>
      <LayerPanel id={id} />
    </aside>
  )
}

function LayerPanel({ id }: { id: LayerId }) {
  switch (id) {
    case 'membrane':
      return <MembranePanel />
    case 'reef':
      return <ReefPanel />
    case 'spawn':
      return <SpawnPanel />
    case 'lair':
      return <LairPanel />
    case 'vault':
      return <VaultPanel />
    case 'current':
      return <CurrentPanel />
    case 'coral':
      return <CoralPanel />
    case 'wrecks':
      return <WrecksPanel />
    case 'grotto':
      return <GrottoPanel />
    case 'trench':
      return <TrenchPanel />
  }
}

function LairPanel() {
  const s = useSea()
  const info = ACTIVITY_INFO[s.activity]
  return (
    <>
      <p className="eyebrow">−1,000 fathoms · The Lair</p>
      <h1 className="now-title">
        <span className={`now-dot act-${s.activity}`} />
        {info.title}
      </h1>
      <p className="now-line">{info.line}</p>

      <div className="grid">
        <Stat label="Heads" value={String(s.heads)} hint="one per attack survived, plus the first" />
        <Stat label="Attacks survived" value={String(s.attacks)} />
        <Stat label="Burned" value={`${fmt(s.burned)}`} hint="$HYDRA gone for good" />
        <Stat label="Runway" value={s.live ? `${s.runwayDays} days` : NONE} hint="thinking left with zero new fees" />
      </div>

      <div className="fear">
        <div className="fear-head">
          <span>Fear on X</span>
          <span className="mono">{s.live ? `${s.fearScore}/100` : NONE}</span>
        </div>
        <div className="fear-bar">
          <span style={{ width: `${s.fearScore}%` }} />
          <i style={{ left: '70%' }} title="Buyback threshold" />
        </div>
        <small>Buyback needs fear ≥ 70 and price −10% in 24h.</small>
      </div>

      <figure className="diary">
        <blockquote>{s.diary ? `“${s.diary}”` : 'The first page is written on launch day.'}</blockquote>
        <figcaption>HYDRA’s diary</figcaption>
      </figure>

      <div className="legend">
        <p className="eyebrow">Today on the floor ring (UTC)</p>
        <ul>
          {(
            [
              ['feeding', 'Fed'],
              ['listening', 'Listened'],
              ['fighting', 'Fought'],
              ['posting', 'Burned / spoke'],
              ['sleeping', 'Slept'],
            ] as [Activity, string][]
          ).map(([a, label]) => (
            <li key={a}>
              <span style={{ background: HOUR_COLOR[a] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <span>{label}</span>
      <strong className="mono">{value}</strong>
    </div>
  )
}

function Ticker() {
  const events = useSea((s) => s.events)
  const time = (t: number) => new Date(t).toISOString().slice(11, 16)
  return (
    <footer className="ticker glass" aria-live="polite">
      <span className="live">
        <span className="live-dot" />
        Life
      </span>
      <div className="ticker-track">
        {events.length === 0 && <span className="ticker-item">Waiting for HYDRA’s first heartbeat.</span>}
        {events.slice(0, 8).map((e) => (
          <span key={e.id} className="ticker-item">
            <span className="mono">{time(e.time)}</span>
            <span className={`now-dot act-${e.activity}`} />
            {e.text}
          </span>
        ))}
      </div>
    </footer>
  )
}

// The way on is always visible: the next layer glows below, the last one above.
// In the Trench the way down never runs out.
function DiveHint() {
  const id = useSea((s) => s.layer)
  const level = useSea((s) => s.trenchLevel)
  const busy = useSea((s) => s.diveTarget !== null)
  const i = layerIndex(id)
  const inTrench = id === 'trench'
  const up = inTrench && level > 0 ? (level === 1 ? 'Today' : 'A newer day') : LAYERS[i - 1]?.name
  const down = inTrench ? (level === 0 ? 'Dive to yesterday' : 'Dive further back') : LAYERS[i + 1] && `Dive to ${LAYERS[i + 1].name}`
  return (
    <div className={`dive-hint ${busy ? 'busy' : ''}`}>
      {up && (
        <button type="button" className="glass" onClick={() => diveStep(-1)}>
          <span aria-hidden>↑</span> {up}
        </button>
      )}
      {down && (
        <button type="button" className="glass down" onClick={() => diveStep(1)}>
          <span aria-hidden>↓</span> {down}
        </button>
      )}
    </div>
  )
}

// Pressure ring and the name of the layer being entered.
function DiveVeil() {
  const target = useSea((s) => s.diveTarget)
  const [shown, setShown] = useState<LayerId | null>(null)
  useEffect(() => {
    if (target) setShown(target)
  }, [target])
  // Steps inside the Trench only scroll the strata; no title card.
  if (!target || !shown || (target === 'trench' && dive.from === 'trench')) return null
  const l = layerOf(shown)
  return (
    <div className="dive-veil" aria-live="polite">
      <span className="pressure" />
      <span className="pressure two" />
      <p>{fathoms(l.depth)} fathoms</p>
      <strong>{l.name}</strong>
    </div>
  )
}

function Floaters() {
  const floaters = useSea((s) => s.floaters)
  return (
    <div className="floaters" aria-hidden>
      {floaters.map((f, i) => (
        <span key={f.id} className={`floater tone-${f.tone}`} style={{ marginTop: i * 34 }}>
          {f.text}
        </span>
      ))}
    </div>
  )
}
