import { useEffect, useState } from 'react'
import { useSea } from '../state/store'
import { HAS_NFT, CONFIG } from '../config'
import { Src } from './Panels'

const fmt = (n: number) => n.toLocaleString('en-US')
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

type Badge = { n: number; status: 'owned' | 'eligible' | 'no' | 'claiming'; proof?: `0x${string}`[]; tx?: string }

export function GrottoPanel() {
  const { survivors, wallet, wrecks, set } = useSea()
  const [badges, setBadges] = useState<Badge[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Once a wallet is connected, check every attack: already held, claimable, or not eligible.
  useEffect(() => {
    if (!wallet || !HAS_NFT) return setBadges([])
    let gone = false
    ;(async () => {
      try {
        const chain = await import('../chain/client')
        const attacks = wrecks.map((w) => w.n)
        const owned = await chain.readBadges(wallet as `0x${string}`, attacks)
        const out: Badge[] = []
        for (const n of attacks) {
          if (owned.includes(n)) out.push({ n, status: 'owned' })
          else {
            const proof = await chain.proofFor(wallet as `0x${string}`, n)
            out.push(proof ? { n, status: 'eligible', proof } : { n, status: 'no' })
          }
        }
        if (!gone) setBadges(out)
      } catch (e) {
        if (!gone) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      gone = true
    }
  }, [wallet, wrecks])

  const connect = async () => {
    setError(null)
    setBusy(true)
    try {
      const { connectWallet } = await import('../chain/client')
      set({ wallet: await connectWallet() })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const claim = async (b: Badge) => {
    if (!wallet || !b.proof) return
    setError(null)
    setBadges((xs) => xs.map((x) => (x.n === b.n ? { ...x, status: 'claiming' } : x)))
    try {
      const { claimBadge } = await import('../chain/client')
      const tx = await claimBadge(wallet as `0x${string}`, b.n, b.proof)
      setBadges((xs) => xs.map((x) => (x.n === b.n ? { ...x, status: 'owned', tx } : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message.split('\n')[0] : String(e))
      setBadges((xs) => xs.map((x) => (x.n === b.n ? { ...x, status: 'eligible' } : x)))
    }
  }

  return (
    <>
      <p className="eyebrow">−10,000 fathoms · Survivor Grotto</p>
      <h1 className="now-title">The ones who stayed</h1>
      <p className="now-line">
        Hold $HYDRA through an attack and you earn that attack’s Survivor badge. It is free to claim; you only pay gas. Every fish here
        is a wallet that held.
      </p>
      <div className="grid">
        <div className="stat">
          <span>Survivors</span>
          <strong className="mono">{fmt(survivors)}</strong>
          <small>wallets that held</small>
        </div>
        <div className="stat">
          <span>Badges</span>
          <strong className="mono">{wrecks.length}</strong>
          <small>one per attack</small>
        </div>
      </div>

      {!wallet && (
        <div className="wallet">
          <button type="button" className="cta" onClick={connect} disabled={busy}>
            {busy ? 'Waiting for your wallet…' : 'Connect wallet'}
          </button>
          <p className="hint-line">Your fish lights up gold and swims out to meet you.</p>
        </div>
      )}

      {wallet && (
        <div className="wallet">
          <div className="wallet-head">
            <span className="dot" style={{ background: 'var(--gold)' }} />
            <span className="mono">{short(wallet)}</span>
            <button type="button" className="ghost small" onClick={() => set({ wallet: null })}>
              Disconnect
            </button>
          </div>
          {!HAS_NFT && <p className="empty">Badges open with the first attack HYDRA survives. Come back then to claim yours.</p>}
          {HAS_NFT && (
            <ul className="badges">
              {badges.length === 0 && <li className="empty">Checking your badges…</li>}
              {badges.map((b) => (
                <li key={b.n} className={`badge ${b.status}`}>
                  <span className="medal">#{b.n}</span>
                  <span>Survivor of Attack #{b.n}</span>
                  {b.status === 'owned' && (
                    <span className="mono ok">
                      held <Src tx={b.tx} address={b.tx ? undefined : CONFIG.survivorNft} />
                    </span>
                  )}
                  {b.status === 'no' && <span className="mono">not held</span>}
                  {b.status === 'eligible' && (
                    <button type="button" className="cta small" onClick={() => claim(b)}>
                      Claim
                    </button>
                  )}
                  {b.status === 'claiming' && <span className="mono">confirming…</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </>
  )
}
