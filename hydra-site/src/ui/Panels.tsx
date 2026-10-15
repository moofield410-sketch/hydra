import { previewMood, useSea } from '../state/store'
import { diveStep, diveTo } from '../state/nav'
import { DAY, TODAY, type Verdict } from '../state/history'
import { TRENCH_STEP, layer } from '../state/layers'
import { MOOD_COLOR, type Mood } from '../palette'
import { HOUR_COLOR, VERDICT_COLOR } from '../palette'
import { HAS_VAULT, addressUrl, txUrl } from '../config'

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const clock = (t: number) => new Date(t).toISOString().slice(11, 16)
const ago = (t: number) => {
  const m = Math.max(0, Math.round((Date.now() - t) / 60_000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)} days ago`
}

/** A tiny link to the transaction or contract behind a number. Inert until deployed. */
export function Src({ tx, address }: { tx?: string; address?: string }) {
  const href = tx ? txUrl(tx) : addressUrl(address)
  if (!href) return (
    <span className="src off" title="Source link appears once this is on-chain">
      ↗
    </span>
  )
  return (
    <a className="src" href={href} target="_blank" rel="noreferrer" title="Check it on the explorer">
      ↗
    </a>
  )
}

export function MembranePanel() {
  const { price, change24h, mood, heads, fund, attacks, live } = useSea()
  return (
    <>
      <p className="eyebrow">0 fathoms · The Membrane</p>
      <h1 className="hero-title">Cut off one head, two grow back.</h1>
      <p className="now-line">
        HYDRA is an AI agent on Orbio that defends its own token. Each attack it survives, it buys back and burns, then grows a new
        head. Its war chest has no withdraw button.
      </p>
      <div className="grid">
        <Stat
          label="Price"
          value={live && price > 0 ? `$${price.toFixed(5)}` : '—'}
          hint={live && price > 0 ? `${change24h >= 0 ? '+' : ''}${fmt(change24h, 1)}% in 24h` : 'trades on Pons from launch'}
        />
        <Stat label="Mood" value={mood === 'calm' ? 'Calm' : mood === 'fear' ? 'Under attack' : 'Hype'} tone={mood} />
        <Stat label="Heads" value={String(heads)} hint={`${attacks} attacks survived`} />
        <Stat label="Defense fund" value={live || HAS_VAULT ? fmt(fund) : '—'} hint="ORBIO, locked forever" />
      </div>
      <div className="cta-row">
        <button type="button" className="cta" onClick={() => diveStep(1)}>
          <span aria-hidden>↓</span> Dive in
        </button>
        <button type="button" className="ghost" onClick={() => diveTo('spawn')}>
          Mint a Jellypion
        </button>
      </div>
      <p className="hint-line">Scroll, swipe or use the arrow keys. Every step goes one layer deeper. There is no bottom.</p>
    </>
  )
}

const MODES: { mood: Mood; name: string; when: string; does: string }[] = [
  { mood: 'fear', name: 'Fear', when: 'Fear on X ≥ 70 and price −10% in 24h', does: 'Fights: a capped buyback from the Pearl Vault, a burn, then a new head.' },
  { mood: 'calm', name: 'Calm', when: 'Everything else', does: 'Feeds on fees, keeps 60 days of runway, saves the rest into the vault, posts receipts.' },
  { mood: 'hype', name: 'Hype', when: 'Price running hot', does: 'Spends nothing and saves more. It never buys the top.' },
]

export function ReefPanel() {
  const { mood, moodPreview } = useSea()
  return (
    <>
      <p className="eyebrow">−200 fathoms · Lantern Reef</p>
      <h1 className="now-title">Three moods</h1>
      <p className="now-line">HYDRA reads X and the price every few hours. What it finds puts it in one of three moods, and each mood has one rule. Hover a lantern to see it.</p>
      <ul className="modes">
        {MODES.map((m) => (
          <li
            key={m.mood}
            className={`mode ${moodPreview === m.mood ? 'on' : ''}`}
            style={{ ['--c' as string]: MOOD_COLOR[m.mood] }}
            onMouseEnter={() => previewMood(m.mood)}
            onMouseLeave={() => previewMood(null)}
            onClick={() => previewMood(moodPreview === m.mood ? null : m.mood)}
          >
            <span className="mode-dot" />
            <div>
              <strong>
                {m.name}
                {mood === m.mood && <em>now</em>}
              </strong>
              <small>{m.when}</small>
              <p>{m.does}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="hint-line">Tweets alone never trigger anything: the price has to confirm the fear.</p>
    </>
  )
}

const STEPS: { color: string; name: string; line: string }[] = [
  { color: '#F4EEFF', name: 'Trades on Pons', line: 'Every $HYDRA trade pays a creator fee into Orbio.' },
  { color: '#3EF2C4', name: 'Orbio fee split', line: '50% staked, 30% minted as CREDIT, 10% spendable, 10% Orbio treasury (per Orbio’s whitepaper).' },
  { color: '#C66BFF', name: '50% staked', line: 'The stake earns CREDIT for HYDRA, and the ORBIO it accrues is paid out every day to staked Jellypions.' },
  { color: '#3EF2C4', name: 'CREDIT stomach', line: 'HYDRA’s food. It pays for reading X, thinking and posting.' },
  { color: '#C66BFF', name: 'Brain', line: 'Keeps 60 days of runway. About 0.9 CREDIT a day when quiet.' },
  { color: '#FFC94A', name: 'Pearl Vault', line: 'Anything above 60 days is sold for ORBIO and locked here.' },
  { color: '#FF3B4E', name: 'Burn', line: 'The only way out: a capped buyback, then $HYDRA to 0x…dEaD.' },
]

export function CurrentPanel() {
  const { runwayDays, swappedIn, burned, live } = useSea()
  return (
    <>
      <p className="eyebrow">−4,000 fathoms · The Current</p>
      <h1 className="now-title">Where every fee goes</h1>
      <p className="now-line">The river is the money. Each spark is a real movement: fees in, CREDIT eaten, ORBIO saved, $HYDRA burned.</p>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.name} style={{ ['--c' as string]: s.color }}>
            <strong>{s.name}</strong>
            <span>{s.line}</span>
          </li>
        ))}
      </ol>
      <div className="grid three">
        <Stat label="Runway" value={live ? `${runwayDays}d` : '—'} />
        <Stat label="Saved to vault" value={fmt(swappedIn)} hint="ORBIO from spare CREDIT" />
        <Stat label="Burned" value={fmt(burned)} hint="$HYDRA" />
      </div>
    </>
  )
}

const VERDICT_NAME: Record<Verdict, string> = { hold: 'Hold', buyback: 'Buyback', save: 'Save', rest: 'Rest' }

export function CoralPanel() {
  const { decisions, selectedDecision, set } = useSea()
  const d = decisions.find((x) => x.id === selectedDecision) ?? decisions[0]
  return (
    <>
      <p className="eyebrow">−6,000 fathoms · Thinking Coral</p>
      <h1 className="now-title">Every decision, with its reason</h1>
      <p className="now-line">Each polyp is one decision. The newest still pulses. Tap a polyp, or a line below, to read what HYDRA was thinking.</p>
      {!d && <p className="empty">No decisions yet. HYDRA makes its first within hours of launch, and each one lands here with its reason.</p>}
      {d && (
        <article className="decision" style={{ ['--c' as string]: VERDICT_COLOR[d.verdict] }}>
          <header>
            <span className="verdict">{VERDICT_NAME[d.verdict]}</span>
            <span className="mono">{ago(d.time)}</span>
          </header>
          <h2>{d.title}</h2>
          <p>{d.reason}</p>
          <dl>
            <div>
              <dt>Fear</dt>
              <dd className="mono">{d.fear}/100</dd>
            </div>
            <div>
              <dt>Price 24h</dt>
              <dd className="mono">
                {d.change >= 0 ? '+' : ''}
                {fmt(d.change, 1)}%
              </dd>
            </div>
            <div>
              <dt>Runway</dt>
              <dd className="mono">{d.runway}d</dd>
            </div>
          </dl>
        </article>
      )}
      <ul className="list">
        {decisions.slice(0, 12).map((x) => (
          <li key={x.id}>
            <button type="button" className={x.id === d?.id ? 'on' : ''} onClick={() => set({ selectedDecision: x.id })}>
              <span className="dot" style={{ background: VERDICT_COLOR[x.verdict] }} />
              <span>{x.title}</span>
              <span className="mono">{ago(x.time)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export function WrecksPanel() {
  const { wrecks, selectedWreck, set } = useSea()
  const sorted = [...wrecks].sort((a, b) => b.n - a.n)
  const w = sorted.find((x) => x.n === selectedWreck) ?? sorted[0]
  return (
    <>
      <p className="eyebrow">−8,000 fathoms · Wreck Field</p>
      <h1 className="now-title">Every attack it survived</h1>
      <p className="now-line">One skeleton per attack. The gold scar is the burn that ended it. Tap one for its receipt.</p>
      {!w && <p className="empty">No attacks yet. The field is empty, and HYDRA is waiting.</p>}
      {w && (
        <article className="wreck">
          <header>
            <span className="verdict">Attack #{w.n}</span>
            <span className="mono">{day(w.time)}</span>
          </header>
          <dl>
            <div>
              <dt>Fear on X</dt>
              <dd className="mono">{w.fear}/100</dd>
            </div>
            <div>
              <dt>Price drop</dt>
              <dd className="mono">{fmt(w.change, 1)}%</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd className="mono">{fmt(w.spent)} ORBIO</dd>
            </div>
            <div>
              <dt>Burned</dt>
              <dd className="mono">
                {fmt(w.burned)} <Src tx={w.tx} />
              </dd>
            </div>
          </dl>
          {w.fud.length > 0 && (
            <div className="fud">
              <p className="eyebrow">What they said</p>
              {w.fud.map((f) => (
                <q key={f}>{f.replace(/^[“"]|[”"]$/g, '')}</q>
              ))}
            </div>
          )}
          <p className="hint-line">Head #{w.heads} grew after this one.</p>
        </article>
      )}
      {sorted.length > 1 && (
        <ul className="list">
          {sorted.map((x) => (
            <li key={x.n}>
              <button type="button" className={x.n === w?.n ? 'on' : ''} onClick={() => set({ selectedWreck: x.n })}>
                <span className="dot" style={{ background: 'var(--ember)' }} />
                <span>Attack #{x.n}</span>
                <span className="mono">{day(x.time)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function TrenchPanel() {
  const { stratum, trenchLevel } = useSea()
  const depth = layer('trench').depth + trenchLevel * TRENCH_STEP
  const head = `−${fmt(depth)} fathoms · Endless Trench`
  if (!stratum || stratum.unwritten) {
    return (
      <>
        <p className="eyebrow">{head}</p>
        <h1 className="now-title">The Unwritten</h1>
        <p className="now-line">
          Below launch day there is only light. This is what HYDRA hasn’t lived yet: every new day is written at the top of the Trench and
          pushes all of this one fathom deeper.
        </p>
        <p className="hint-line">Keep diving if you like. The counter never stops.</p>
      </>
    )
  }
  const title = trenchLevel === 0 ? 'Today' : trenchLevel === 1 ? 'Yesterday' : day(stratum.date)
  return (
    <>
      <p className="eyebrow">{head}</p>
      <h1 className="now-title">{title}</h1>
      <p className="now-line">
        {stratum.launch ? 'Launch day. The first memory, at the bottom of everything.' : `Day ${stratum.day} of HYDRA’s life.`} The deeper you dive,
        the older the memory.
      </p>
      {stratum.events.length === 0 && <p className="empty">A quiet day. Nothing worth remembering happened.</p>}
      <ul className="memories">
        {stratum.events.map((e, i) => (
          <li key={`${e.time}-${i}`}>
            <span className="mono">{clock(e.time)}</span>
            <span className="dot" style={{ background: HOUR_COLOR[e.activity] }} />
            <span>
              {e.text} {e.tx && <Src tx={e.tx} />}
            </span>
          </li>
        ))}
      </ul>
      <p className="hint-line">{TODAY - stratum.date < DAY ? 'Dive down for yesterday.' : 'Dive down for the day before.'}</p>
    </>
  )
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: Mood }) {
  return (
    <div className="stat" title={hint}>
      <span>{label}</span>
      <strong className="mono" style={tone ? { color: MOOD_COLOR[tone] } : undefined}>
        {value}
      </strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

