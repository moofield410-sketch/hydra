import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ONES, TIERS } from '@spawn-art'
import { useSea } from '../state/store'
import {
  MAX_PER_WALLET,
  SPAWN_LIVE,
  claimRewards,
  dailyRate,
  earnedNow,
  hatchNow,
  mintSpawn,
  mintedByWallet,
  myPoints,
  phaseOf,
  poolBalance,
  progressOf,
  projectedDaily,
  projectedDailyFor,
  setStaked,
  stakedCount,
  totalPaid,
  totalPoints,
  useSpawn,
  type Spawn,
} from '../state/spawn'
import { EGG_SRC, spawnAttributes, spawnHTML, spawnSrc } from './spawnArt'
import { Src, Stat } from './Panels'
import { CONFIG } from '../config'

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (x: number) => `${Math.round(x * 100)}%`
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const errText = (e: unknown) => (e instanceof Error ? e.message.split('\n')[0] : String(e))
const NONE = '—'

function useNow(every = 1000) {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), every)
    return () => clearInterval(id)
  }, [every])
  return t
}

function countdown(ms: number) {
  if (ms <= 0) return 'now'
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${Math.max(1, m)}m`
}

// One layer of every Spawn unlocks with each 10% of the mint (NFT-DESIGN.md).
const REVEAL_STEPS: [number, string][] = [
  [0, 'Silhouette'],
  [0.1, 'Background'],
  [0.2, 'Body colour'],
  [0.3, 'Tentacles'],
  [0.4, 'Eyes'],
  [0.5, 'Mouth'],
  [0.6, 'Skin'],
  [0.7, 'Neck item'],
  [0.8, 'Face item'],
  [0.9, 'Hat'],
  [1, 'Rarity style and the one-of-ones'],
]
/** "in 3h 20m", or "soon" while the time is not known yet. */
const inTime = (ms: number) => (Number.isFinite(ms) ? `in ${countdown(ms)}` : 'soon')

const nextStep = (p: number) => REVEAL_STEPS.find(([at]) => at > p)

// The jelly shown in the Collection tab, the same seed in all five styles.
const SAMPLE = 'q0gazkvj'

type Tab = 'mint' | 'mine' | 'rewards' | 'collection'

export function SpawnPanel() {
  const [tab, setTab] = useState<Tab>('mint')
  const [open, setOpen] = useState<Spawn | null>(null)
  const count = useSpawn((s) => s.mine.length)
  const tabs: [Tab, string][] = [
    ['mint', 'Mint'],
    ['mine', count ? `My Jellypions · ${count}` : 'My Jellypions'],
    ['rewards', 'Rewards'],
    ['collection', 'Collection'],
  ]
  return (
    <>
      <p className="eyebrow">−600 fathoms · Spawning Pool</p>
      <h1 className="now-title">Jellypions</h1>
      <p className="now-line">
        3,333 Jellypions, drawn fully on-chain. Each one hatches a second after it is minted, and the whole collection reveals together as the
        pool fills.
      </p>
      <div className="tabs" role="tablist" aria-label="Spawning Pool">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'mint' && <MintTab onMine={() => setTab('mine')} onOpen={setOpen} />}
      {tab === 'mine' && <MineTab onMint={() => setTab('mint')} onOpen={setOpen} />}
      {tab === 'rewards' && <RewardsTab />}
      {tab === 'collection' && <CollectionTab />}
      {open && <SpawnModal spawn={open} onClose={() => setOpen(null)} />}
    </>
  )
}

// ---------- Mint ----------

function MintTab({ onMine, onOpen }: { onMine: () => void; onOpen: (x: Spawn) => void }) {
  const s = useSpawn()
  const wallet = useSea((x) => x.wallet)
  const t = useNow()
  const p = progressOf(s, t)
  const phase = phaseOf(s, t)
  const room = Math.max(0, Math.min(MAX_PER_WALLET - mintedByWallet(s), s.supply - s.minted))
  const [qty, setQty] = useState(1)
  const q = Math.min(Math.max(1, qty), Math.max(1, room))
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<number[]>([])
  const hatchery = s.mine.filter((x) => x.hatching || batch.includes(x.id))

  const mint = async () => {
    setError(null)
    try {
      const out = await mintSpawn(q)
      if (out) setBatch(out.map((x) => x.id))
    } catch (e) {
      setError(errText(e))
    }
  }

  return (
    <>
      <MintMeter minted={s.minted} p={p} />
      <div className="grid">
        <Stat
          label="Mint"
          value={
            phase === 'open'
              ? `${countdown(s.mintEnd - t)} left`
              : phase === 'soldout'
                ? 'Sold out'
                : phase === 'soon'
                  ? inTime(s.mintStart - t).replace('soon', 'Soon')
                  : 'Closed'
          }
          hint="72 hours, then every Jellypion reveals in full"
        />
        <Stat
          label="Staking"
          value={t < s.stakeStart ? inTime(s.stakeStart - t).replace('soon', 'Soon') : 'Open'}
          hint="opens 12 hours after the mint starts"
        />
      </div>
      {CONFIG.opensea && (
        <div className="cta-row">
          <a className={phase === 'open' ? 'ghost' : 'cta'} href={CONFIG.opensea} target="_blank" rel="noopener noreferrer">
            {phase === 'open' ? 'View on OpenSea' : 'Buy on OpenSea'} <span aria-hidden>↗</span>
          </a>
        </div>
      )}

      {!wallet && <Connect line="Mint up to 5 per wallet for free. You only pay gas." />}
      {wallet && (
        <div className="wallet">
          <WalletHead wallet={wallet} />
          {phase !== 'open' ? (
            <p className="empty">{phase === 'soldout' ? `Sold out. Every Jellypion is fully revealed${CONFIG.opensea ? '; they trade on OpenSea now' : ''}.` : phase === 'soon' ? 'The mint has not opened yet. Mint up to 5 for free when it does.' : 'The mint is closed.'}</p>
          ) : room === 0 ? (
            <p className="empty">
              This wallet has minted its {MAX_PER_WALLET}.{' '}
              <button type="button" className="link" onClick={onMine}>
                See My Jellypions
              </button>
            </p>
          ) : (
            <div className="mint-row">
              <div className="qty" role="group" aria-label="How many">
                <button type="button" onClick={() => setQty(q - 1)} disabled={q <= 1} aria-label="One fewer">
                  −
                </button>
                <span className="mono">{q}</span>
                <button type="button" onClick={() => setQty(q + 1)} disabled={q >= room} aria-label="One more">
                  +
                </button>
              </div>
              <button type="button" className="cta" onClick={mint} disabled={!!s.pending}>
                {s.pending === 'mint' ? 'Confirming…' : `Mint ${q} · Free`}
              </button>
            </div>
          )}
          <small className="hint-line">
            {mintedByWallet(s)} of {MAX_PER_WALLET} minted by this wallet
          </small>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {hatchery.length > 0 && (
        <div className="hatchery">
          <p className="eyebrow">{hatchery.some((x) => x.hatching) ? 'Hatching…' : 'Just hatched'}</p>
          {SPAWN_LIVE && hatchery.some((x) => x.hatching) && !s.pending && (
            <button type="button" className="ghost small" onClick={() => hatchNow().catch((e) => setError(errText(e)))}>
              Still an egg? Hatch now
            </button>
          )}
          <ul className="tank">
            {hatchery.map((x) => (
              <li key={x.id} className={x.hatching ? 'is-egg' : 'is-born'} style={{ ['--c' as string]: x.hatching ? '#9ffcf0' : TIERS[x.tier][3] }}>
                <button type="button" onClick={() => !x.hatching && onOpen(x)} disabled={x.hatching} title={x.hatching ? 'Hatching' : 'Open'}>
                  <img alt="" src={x.hatching ? EGG_SRC : spawnSrc(x.seed, x.tier, x.one, p, x.staked)} />
                </button>
                <TierChip spawn={x} p={p} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="recent">
        <p className="eyebrow">Newest in the pool</p>
        {s.recent.length === 0 && <p className="empty">The pool is still empty. The first eggs land the moment the mint opens.</p>}
        <ul className="strip">
          {s.recent.slice(0, 6).map((h) => (
            <li key={h.id} style={{ ['--c' as string]: TIERS[h.tier][3] }} title={`#${h.id} · ${TIERS[h.tier][0]}`}>
              <img alt="" src={spawnSrc(h.seed, h.tier, h.one, p)} />
            </li>
          ))}
        </ul>
      </div>
      <p className="hint-line">
        The seed comes from the next block's hash, so nobody, the minter included, can see or choose a Jellypion before it hatches. The mint is free:
        the contract takes no ETH, only gas.
      </p>
    </>
  )
}

function MintMeter({ minted, p }: { minted: number; p: number }) {
  const next = nextStep(p)
  return (
    <div className="mint-meter">
      <div className="mint-count">
        <strong className="mono">{fmt(minted)}</strong>
        <span>/ {fmt(useSpawn.getState().supply)} minted</span>
      </div>
      <div className="meter">
        <span style={{ width: `${(minted / useSpawn.getState().supply) * 100}%` }} />
        {Array.from({ length: 9 }, (_, k) => (
          <i key={k} style={{ left: `${(k + 1) * 10}%` }} className={p >= (k + 1) / 10 ? 'on' : ''} />
        ))}
      </div>
      <small>{next ? `${Math.floor(p * 100)}% revealed · next at ${Math.round(next[0] * 100)}%: ${next[1].toLowerCase()}` : 'Fully revealed'}</small>
    </div>
  )
}

// ---------- My Spawn ----------

function MineTab({ onMint, onOpen }: { onMint: () => void; onOpen: (x: Spawn) => void }) {
  const s = useSpawn()
  const wallet = useSea((x) => x.wallet)
  const t = useNow(500)
  const [sel, setSel] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  if (!wallet) return <Connect line="Connect to see your Jellypions, stake them and claim ORBIO." />
  if (!s.mine.length)
    return (
      <div className="wallet">
        <WalletHead wallet={wallet} />
        <p className="empty">
          No Jellypions in this wallet yet.{' '}
          {s.minted >= s.supply && CONFIG.opensea ? (
            <a className="link" href={CONFIG.opensea} target="_blank" rel="noopener noreferrer">
              Find one on OpenSea
            </a>
          ) : (
            <button type="button" className="link" onClick={onMint}>
              Mint one
            </button>
          )}
        </p>
      </div>
    )

  const p = progressOf(s, t)
  const stakingOpen = t >= s.stakeStart
  // Nothing picked means every one: the buttons stake or unstake the whole wallet.
  const all = !sel.length
  const chosen = s.mine.filter((x) => (all || sel.includes(x.id)) && !x.hatching)
  const toStake = chosen.filter((x) => !x.staked).map((x) => x.id)
  const toUnstake = chosen.filter((x) => x.staked).map((x) => x.id)
  const earned = earnedNow(s, t)
  const toggle = (id: number) => setSel((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))
  const act = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
      setSel([])
    } catch (e) {
      setError(errText(e))
    }
  }

  return (
    <>
      <WalletHead wallet={wallet} />
      <div className="grid three">
        <Stat label="Your points" value={fmt(myPoints(s))} hint="staked Jellypions only" />
        <Stat label="Earned" value={fmt(earned, 2)} hint="ORBIO, unclaimed" />
        <Stat label="Per day" value={`≈ ${fmt(projectedDaily(s, t), 1)}`} hint="ORBIO at today's rate" />
      </div>
      <button type="button" className="cta" onClick={() => act(claimRewards)} disabled={!!s.pending || earned < 0.005}>
        {s.pending === 'claim' ? 'Claiming…' : `Claim ${fmt(earned, 2)} ORBIO`}
      </button>

      <ul className="tank">
        {s.mine.map((x) => (
          <li
            key={x.id}
            className={`${sel.includes(x.id) ? 'sel' : ''} ${x.staked ? 'staked' : ''} ${x.hatching ? 'is-egg' : ''}`}
            style={{ ['--c' as string]: x.hatching ? '#9ffcf0' : TIERS[x.tier][3] }}
          >
            <button type="button" onClick={() => !x.hatching && toggle(x.id)} disabled={x.hatching} aria-pressed={sel.includes(x.id)} title={`#${x.id}: tap to select`}>
              <img alt="" src={x.hatching ? EGG_SRC : spawnSrc(x.seed, x.tier, x.one, p, x.staked)} />
            </button>
            {!x.hatching && (
              <button type="button" className="open" onClick={() => onOpen(x)} title="Open the interactive version" aria-label={`Open Jellypion #${x.id}`}>
                ⤢
              </button>
            )}
            <TierChip spawn={x} p={p} />
          </li>
        ))}
      </ul>
      <div className="tank-actions">
        <button type="button" className="cta small" disabled={!stakingOpen || !toStake.length || !!s.pending} onClick={() => act(() => setStaked(toStake, true))}>
          {s.pending === 'stake' ? 'Staking…' : `Stake ${all && toStake.length ? 'all ' : ''}${toStake.length || ''}`}
        </button>
        <button type="button" className="ghost" disabled={!toUnstake.length || !!s.pending} onClick={() => act(() => setStaked(toUnstake, false))}>
          {s.pending === 'unstake' ? 'Unstaking…' : `Unstake ${all && toUnstake.length ? 'all ' : ''}${toUnstake.length || ''}`}
        </button>
        <button type="button" className="ghost small" onClick={() => setSel(sel.length ? [] : s.mine.filter((x) => !x.hatching).map((x) => x.id))}>
          {sel.length ? 'Clear' : 'Select all'}
        </button>
      </div>
      {!stakingOpen && <p className="empty">Staking opens {inTime(s.stakeStart - t)}.</p>}
      <p className="hint-line">
        Tap Jellypions to pick some, or leave none picked to stake or unstake them all. Unstaking works any time, costs only gas, and you keep
        everything you earned. A staked Jellypion cannot be sold until it is unstaked.
      </p>
      {error && <p className="error">{error}</p>}
      <p className="hint-line">
        Staked Jellypions stay in your wallet and show a ring; they just can't be sold or moved until you unstake. No lock, no penalty. The next
        deposit lands in {countdown(s.streamEnd - t)}.
      </p>
    </>
  )
}

// ---------- Rewards ----------

function RewardsTab() {
  const s = useSpawn()
  const t = useNow()
  const staked = stakedCount(s)
  return (
    <>
      {t < s.stakeStart && <p className="empty">Staking opens {inTime(s.stakeStart - t)}, 12 hours after the mint. The first deposit lands then.</p>}
      <div className="grid">
        <Stat label="In the pool" value={fmt(poolBalance(s, t))} hint="ORBIO still to stream today" />
        <Stat
          label="Streaming"
          value={`${fmt(dailyRate(s, t))}/day`}
          hint={dailyRate(s, t) ? `this deposit ends in ${countdown(s.streamEnd - t)}` : 'starts with the first daily deposit'}
        />
        <Stat label="Paid to stakers" value={fmt(totalPaid(s, t))} hint="ORBIO, all time" />
        <Stat label="Points staked" value={fmt(totalPoints(s))} hint={`${fmt(staked)} Jellypions · ${pct(staked / Math.max(1, s.minted))} of minted`} />
      </div>
      <div className="per-tier">
        <p className="eyebrow">One staked Jellypion gets, right now</p>
        <ul>
          {TIERS.map(([name, pts, , color], i) => (
            <li key={name}>
              <span className="dot" style={{ background: color }} />
              <span>{name}</span>
              <small>
                {pts} pt{pts > 1 ? 's' : ''}
              </small>
              <strong className="mono">≈ {fmt(projectedDailyFor(s, i, t), 1)}</strong>
              <small>ORBIO/day</small>
            </li>
          ))}
        </ul>
      </div>
      <div className="sources">
        <p className="eyebrow">Where it comes from</p>
        <dl>
          <div>
            <dt>
              HYDRA's fee stake, for the next deposit <Src address={CONFIG.treasury || undefined} />
            </dt>
            <dd className="mono">{s.treasury ? `${fmt(s.treasury.pending)} ORBIO` : NONE}</dd>
          </div>
          <div>
            <dt>
              Last deposit from HYDRA's fee stake <Src tx={s.lastDeposit?.tx} />
            </dt>
            <dd className="mono">{s.lastDeposit ? `${fmt(s.lastDeposit.amount)} ORBIO` : 'none yet'}</dd>
          </div>
        </dl>
      </div>
      <ol className="steps">
        <li style={{ ['--c' as string]: 'var(--jade)' }}>
          <strong>Trading fees</strong>
          <span>Every $HYDRA trade pays a fee. Orbio stakes half of it as ORBIO for HYDRA.</span>
        </li>
        <li style={{ ['--c' as string]: 'var(--orchid)' }}>
          <strong>Daily deposit</strong>
          <span>At 00:05 UTC HYDRA moves what that stake earned into this pool and posts the receipt.</span>
        </li>
        <li style={{ ['--c' as string]: 'var(--gold)' }}>
          <strong>Streamed by points</strong>
          <span>It flows out over 24 hours to every staked Jellypion by its points. Staking a minute before a deposit gets a minute's share.</span>
        </li>
      </ol>
      <p className="hint-line">
        A live rate: it moves with trading volume and with how many Jellypions are staked, so it is never a promise. Only trading fees fund this pool.
        Contract <Src address={CONFIG.spawnNft || undefined} />
      </p>
    </>
  )
}

// ---------- Collection ----------

function CollectionTab() {
  const s = useSpawn()
  const t = useNow(4000)
  const p = progressOf(s, t)
  const next = nextStep(p)
  return (
    <>
      <ul className="tiers">
        {TIERS.map(([name, pts, n, color], i) => (
          <li key={name} style={{ ['--c' as string]: color }}>
            <img alt="" src={spawnSrc(SAMPLE, i, null, 1)} />
            <div>
              <strong>{name}</strong>
              <small>
                {fmt(n)} Jellypions · {((n / s.supply) * 100).toFixed(n < 100 ? 1 : 0)}%
              </small>
            </div>
            <span className="mono">
              {pts} pt{pts > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ul>
      <small className="hint-line">The same jelly in all five styles. The exact count of each is fixed before the mint opens.</small>

      <div className="ones">
        <p className="eyebrow">Five one-of-ones</p>
        <ul className="strip">
          {ONES.map((name, i) => (
            <li key={name} style={{ ['--c' as string]: TIERS[4][3] }} title={p >= 1 ? name : 'Hidden until mint-out'}>
              {p >= 1 ? <img alt={name} src={spawnSrc('one', 4, i, 1)} /> : <span className="mystery">?</span>}
            </li>
          ))}
        </ul>
        <small className="hint-line">
          Hidden among the 33 Genesis. Each looks like an ordinary Jellypion until mint-out, then turns into its own art. Nobody knows which, not
          even the holder.
        </small>
      </div>

      <div>
        <p className="eyebrow">The reveal</p>
        <ol className="reveal-steps">
          {REVEAL_STEPS.map(([at, label]) => (
            <li key={at} className={p >= at ? 'done' : next?.[0] === at ? 'next' : ''}>
              <span className="mono">{Math.round(at * 100)}%</span>
              {label}
            </li>
          ))}
        </ol>
        <small className="hint-line">
          Rarity is known the moment a Jellypion hatches, so staking points work right away. Only its art style waits for mint-out, or for the
          72-hour deadline if the mint never sells out.
        </small>
      </div>
    </>
  )
}

// ---------- shared ----------

function TierChip({ spawn, p }: { spawn: Spawn; p: number }) {
  if (spawn.hatching) return <span className="chip">egg</span>
  const one = spawn.one != null && p >= 1
  return <span className="chip">{one ? '1 of 1' : TIERS[spawn.tier][0]}</span>
}

function WalletHead({ wallet }: { wallet: string }) {
  const set = useSea((x) => x.set)
  return (
    <div className="wallet-head">
      <span className="dot" style={{ background: 'var(--gold)' }} />
      <span className="mono">{short(wallet)}</span>
      <button type="button" className="ghost small" onClick={() => set({ wallet: null })}>
        Disconnect
      </button>
    </div>
  )
}

function Connect({ line }: { line: string }) {
  const set = useSea((x) => x.set)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const connect = async () => {
    setError(null)
    setBusy(true)
    try {
      const { connectWallet } = await import('../chain/client')
      set({ wallet: await connectWallet() })
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="wallet">
      <button type="button" className="cta" onClick={connect} disabled={busy}>
        {busy ? 'Waiting for your wallet…' : 'Connect wallet'}
      </button>
      <p className="hint-line">{line}</p>
      {error && <p className="error">{error}</p>}
    </div>
  )
}

// The animation_url version of one Spawn, with its metadata, over the sea.
function SpawnModal({ spawn, onClose }: { spawn: Spawn; onClose: () => void }) {
  const p = progressOf(useSpawn.getState())
  const live = useSpawn((s) => s.mine.find((x) => x.id === spawn.id)) ?? spawn
  const html = useMemo(() => spawnHTML(live.seed, live.tier, live.one, p, live.staked), [live.seed, live.staked]) // eslint-disable-line react-hooks/exhaustive-deps
  const attrs = spawnAttributes(live.seed, live.tier, live.one, p, live.staked)
  const one = live.one != null && p >= 1
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="spawn-modal" role="dialog" aria-modal="true" aria-label={`Jellypion #${live.id}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="spawn-modal-box glass" style={{ ['--c' as string]: TIERS[live.tier][3] }}>
        <iframe title={`Jellypion #${live.id}`} sandbox="allow-scripts" srcDoc={html} />
        <div className="spawn-modal-side">
          <p className="eyebrow">Jellypion #{live.id}</p>
          <h2>{one ? ONES[live.one!] : TIERS[live.tier][0]}</h2>
          <table className="attrs">
            <tbody>
              {attrs.map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className={v === 'Hidden' ? 'hidden' : ''}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <small className="hint-line">Move the pointer or tilt your phone, and tap it. This is the on-chain animation_url.</small>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
