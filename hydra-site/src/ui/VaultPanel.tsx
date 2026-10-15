import { useEffect, useState } from 'react'
import { useSea } from '../state/store'
import { CONFIG, HAS_VAULT } from '../config'
import { Src } from './Panels'

const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const COOLDOWN_MS = 6 * 3600_000

function useNow(every = 1000) {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), every)
    return () => clearInterval(id)
  }, [every])
  return t
}

function countdown(ms: number) {
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h ? `${h}h ${m}m` : `${m}m`
}

export function VaultPanel() {
  const s = useSea()
  const t = useNow()
  const fill = Math.min(1, s.fund / s.fundGoal)
  const left = s.lastBuybackAt + COOLDOWN_MS - t
  const largestToday = s.fund * (Math.max(0, 10 - s.dailyUsedPct) / 100)

  return (
    <>
      <p className="eyebrow">−2,500 fathoms · Pearl Vault</p>
      <h1 className="now-title">The Pearl Vault</h1>
      <p className="now-line">The defense fund. Its liquid is the ORBIO it holds; every gold seam is a buyback it already paid for.</p>

      <div className="vault-fund">
        <strong className="mono">{s.live || HAS_VAULT ? fmt(s.fund) : '—'}</strong>
        <span>ORBIO in the pearl</span>
        <div className="fill">
          <span style={{ width: `${fill * 100}%` }} />
        </div>
        <small>
          {Math.round(fill * 100)}% of the {fmt(s.fundGoal)} ORBIO goal · {s.attacks} gold seam{s.attacks === 1 ? '' : 's'}
        </small>
      </div>

      <div className="caps">
        <p className="eyebrow">Hard limits in the contract</p>
        <Cap ring="jade" label="Today" value={`${s.dailyUsedPct}% of 10%`} frac={s.dailyUsedPct / 10} />
        <Cap ring="orchid" label="This week" value={`${s.weeklyUsedPct}% of 30%`} frac={s.weeklyUsedPct / 30} />
        <Cap
          ring="gold"
          label="Cooldown"
          value={left <= 0 ? 'Ready' : `${countdown(left)} left`}
          frac={Math.min(1, 1 - left / COOLDOWN_MS)}
        />
        <small>Largest buyback allowed right now: {left <= 0 ? `${fmt(largestToday)} ORBIO` : 'none until the cooldown ends'}</small>
      </div>

      <div className="ledger">
        <p className="eyebrow">Where it came from</p>
        <Row label="Creator seed" note="locked forever" value={`+${fmt(s.seed)}`} />
        <Row label="Spare CREDIT swapped in" note="above 60 days of runway" value={`+${fmt(s.swappedIn)}`} />
        <Row label="Spent on buybacks" note="burned as $HYDRA" value={`−${fmt(s.spent)}`} />
        <Row label="In the pearl" value={fmt(s.seed + s.swappedIn - s.spent)} total />
      </div>

      <div className="proof">
        <span className="seal" aria-hidden>
          ◎
        </span>
        <p>
          <strong>Nobody can withdraw.</strong> The DefenseVault has no withdraw function and no owner. ORBIO only leaves as a
          burn. <Src address={CONFIG.defenseVault} /> {HAS_VAULT ? <em>Read live from the chain.</em> : <em>Fills at launch, when the contract is deployed.</em>}
        </p>
      </div>
    </>
  )
}

function Cap({ ring, label, value, frac }: { ring: 'jade' | 'orchid' | 'gold'; label: string; value: string; frac: number }) {
  return (
    <div className="cap">
      <span className={`cap-dot tone-${ring}`} />
      <span className="cap-label">{label}</span>
      <span className="cap-bar">
        <span className={`tone-${ring}`} style={{ width: `${Math.max(2, Math.min(1, frac) * 100)}%` }} />
      </span>
      <span className="mono cap-value">{value}</span>
    </div>
  )
}

function Row({ label, note, value, total }: { label: string; note?: string; value: string; total?: boolean }) {
  return (
    <div className={`row ${total ? 'total' : ''}`}>
      <span>
        {label}
        {note && <small>{note}</small>}
      </span>
      <span className="mono">{value}</span>
    </div>
  )
}
