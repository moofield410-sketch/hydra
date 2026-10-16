import { useEffect, useState, type ReactNode } from 'react'
import { CONFIG, addressUrl } from '../config'
import { Logo } from '../ui/Logo'

// The docs: one long page, every number taken from the contracts and the agent's rules.
// Addresses come from the same VITE_* settings as the sea, so they fill in at launch.

const X = CONFIG.xHandle
const SEA = '../'

const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'Introduction', items: [['overview', 'Overview'], ['how-it-works', 'How it works'], ['moods', 'The three moods'], ['sea', 'The Ember Sea']] },
  { group: 'The defense', items: [['vault', 'The Defense Vault'], ['rules', 'When HYDRA fights'], ['badges', 'Survivor badges']] },
  { group: 'Token and money', items: [['token', 'The token'], ['money', 'Where the money goes']] },
  { group: 'Jellypions', items: [['jellypions', 'The collection'], ['rarity', 'Rarity'], ['staking', 'Staking and rewards']] },
  { group: 'Trust', items: [['security', 'Security and admin powers'], ['contracts', 'Contract addresses'], ['timeline', 'Launch timeline'], ['risks', 'Risks']] },
  { group: 'Help', items: [['faq', 'FAQ'], ['glossary', 'Glossary']] },
]
const IDS = NAV.flatMap((g) => g.items.map(([id]) => id))

export function Docs() {
  const active = useActiveSection()
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    document.body.classList.toggle('menu-open', menu)
    if (menu) document.querySelector('.d-side')?.scrollTo(0, 0)
  }, [menu])
  return (
    <div className="docs">
      <header className="d-header">
        <a className="d-brand" href={SEA}>
          <Logo size={20} />
          <span className="d-brand-name">HYDRA</span>
          <span className="d-brand-tag">Docs</span>
        </a>
        <nav className="d-top-links">
          <a className="d-hide-md" href="#vault">
            Defense
          </a>
          <a className="d-hide-md" href="#jellypions">
            Jellypions
          </a>
          <a className="d-hide-md" href="#contracts">
            Contracts
          </a>
          <a href={`https://x.com/${X}`} target="_blank" rel="noopener noreferrer" title={`@${X} on X`}>
            𝕏<span className="d-hide-sm"> @{X}</span>
          </a>
          <a className="d-btn d-btn-primary" href={SEA}>
            Enter the sea
          </a>
        </nav>
        <button type="button" className="d-menu-btn" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          {menu ? 'Close' : 'Contents'}
        </button>
      </header>

      <div className="d-layout">
        <aside className={`d-side ${menu ? 'open' : ''}`} aria-label="Contents">
          {NAV.map((g) => (
            <div key={g.group} className="d-side-group">
              <p>{g.group}</p>
              <ul>
                {g.items.map(([id, label]) => (
                  <li key={id}>
                    <a href={`#${id}`} className={active === id ? 'here' : ''} onClick={() => setMenu(false)}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className="d-main">
          <Hero />
          <Content />
          <Footer />
        </main>
      </div>
    </div>
  )
}

// Which section is at the top of the screen, for the contents list.
function useActiveSection() {
  const [active, setActive] = useState(IDS[0])
  useEffect(() => {
    const els = IDS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const pick = () => {
      let cur = IDS[0]
      for (const el of els) if (el.getBoundingClientRect().top < 140) cur = el.id
      setActive(cur)
    }
    pick()
    window.addEventListener('scroll', pick, { passive: true })
    return () => window.removeEventListener('scroll', pick)
  }, [])
  return active
}

function Hero() {
  return (
    <section className="d-hero">
      <p className="d-eyebrow">Documentation</p>
      <h1>How HYDRA works</h1>
      <p className="d-lede">
        HYDRA is an AI agent on Orbio that defends its own token on Robinhood Chain. When it is attacked, it buys back and burns from a fund
        nobody can withdraw, within limits written into the contract. This page explains every rule, every number and every risk.
      </p>
      <div className="d-facts">
        <Fact value="10%" label="most of the fund spent in a day" />
        <Fact value="30%" label="most spent in a week" />
        <Fact value="6 h" label="minimum between buybacks" />
        <Fact value="0" label="ways to withdraw the fund" />
        <Fact value="3,333" label="Jellypions, fully on-chain" />
        <Fact value="Free" label="mint, 5 per wallet, gas only" />
      </div>
    </section>
  )
}

const Fact = ({ value, label }: { value: string; label: string }) => (
  <div className="d-fact">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
)

function Section({ id, eyebrow, title, children }: { id: string; eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="d-section">
      {eyebrow && <p className="d-eyebrow">{eyebrow}</p>}
      <h2>
        <a href={`#${id}`}>{title}</a>
      </h2>
      {children}
    </section>
  )
}

const Note = ({ tone = 'jade', title, children }: { tone?: 'jade' | 'gold' | 'ember'; title: string; children: ReactNode }) => (
  <div className={`d-note d-note-${tone}`}>
    <strong>{title}</strong>
    <div>{children}</div>
  </div>
)

function Content() {
  return (
    <>
      <Section id="overview" eyebrow="Introduction" title="Overview">
        <p>
          Most tokens are defended by a team that could also walk away with the money. HYDRA replaces the team with an agent, and the promise
          with code. It watches its own price and what people say about it on X, around the clock. When fear on X and a falling price arrive
          together, it spends part of its defense fund buying its own token, then burns what it bought. Each attack it survives grows it a new
          head.
        </p>
        <p>Three things make that more than a story:</p>
        <ul>
          <li>
            <b>The fund cannot be withdrawn.</b> The Defense Vault has no owner and no withdraw function. ORBIO leaves it only as a buyback that
            is burned.
          </li>
          <li>
            <b>The limits are in the contract, not in the agent.</b> Even the agent cannot spend more than 10% of the fund in a day or 30% in a
            week, or buy back twice within 6 hours.
          </li>
          <li>
            <b>Everything is public.</b> Each decision, buyback and burn appears in the Ember Sea with its reason and its transaction, and is
            posted on X by{' '}
            <a href={`https://x.com/${X}`} target="_blank" rel="noopener noreferrer">
              @{X}
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section id="how-it-works" title="How it works">
        <p>The agent runs one loop, all day:</p>
        <ol className="d-steps">
          <li>
            <b>Price.</b> Every 5 minutes it reads $HYDRA's price straight from the chain: from its bonding curve, or from its Uniswap v4 pool
            after graduation.
          </li>
          <li>
            <b>Listen.</b> Every 2 hours (every 30 minutes when trading is busy) it reads new posts on X that mention $HYDRA or @{X}.
          </li>
          <li>
            <b>Filter.</b> It ignores accounts younger than 90 days, accounts under 50 followers, and the same text posted by three or more
            accounts.
          </li>
          <li>
            <b>Score.</b> A language model scores each post for fear and hype. Louder posts count more, so a post seen ten times weighs less
            than one seen ten thousand times.
          </li>
          <li>
            <b>Decide.</b> It applies fixed rules (see <a href="#rules">When HYDRA fights</a>) and writes down its reason, whatever it decides.
          </li>
          <li>
            <b>Act and report.</b> If it fights, it quotes the trade, buys back, burns and posts the receipt. Once a day it posts a Survival
            report.
          </li>
        </ol>
        <Note title="A sudden drop skips the wait">
          If the price falls 8% or more within an hour, the agent checks X straight away instead of waiting for its next turn.
        </Note>
      </Section>

      <Section id="moods" title="The three moods">
        <p>What it finds puts HYDRA in one of three moods. The whole site changes color with it.</p>
        <div className="d-cards">
          <div className="d-card d-card-ember">
            <h3>Fear</h3>
            <p className="d-when">Fear on X at 70 or more, and the price down 10% or more in 24 hours</p>
            <p>It fights: a capped buyback from the Defense Vault, a burn, then a new head.</p>
          </div>
          <div className="d-card d-card-jade">
            <h3>Calm</h3>
            <p className="d-when">Everything else</p>
            <p>It holds the fund, keeps listening and posts its daily report.</p>
          </div>
          <div className="d-card d-card-gold">
            <h3>Hype</h3>
            <p className="d-when">The price up 40% or more in 24 hours</p>
            <p>It spends nothing. It never buys the top.</p>
          </div>
        </div>
      </Section>

      <Section id="sea" title="The Ember Sea">
        <p>
          The website is a sea you dive through. Each layer shows one part of HYDRA, read live from the chain and from the agent's feed. Scroll,
          swipe or use the arrow keys to go one layer deeper.
        </p>
        <table className="d-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>What it shows</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['The Membrane', 'The surface: price, mood, heads and the size of the defense fund.'],
              ['Lantern Reef', 'The three moods and the rule each one follows.'],
              ['Spawning Pool', 'The Jellypions mint, your Jellypions, staking and rewards.'],
              ['The Lair', 'HYDRA itself, with one head for every attack it has survived.'],
              ['Pearl Vault', 'The defense fund, how much of today’s and this week’s limit is used, and when the next buyback may happen.'],
              ['The Current', 'Where every fee goes, as it moves.'],
              ['Thinking Coral', 'Every decision the agent has made, with its reason.'],
              ['Wreck Field', 'Every attack it survived, with the burn that ended it and what was said.'],
              ['Survivor Grotto', 'The Survivor badges, and the claim for yours.'],
              ['Endless Trench', 'HYDRA’s memory: one layer per day of its life, back to launch.'],
            ].map(([a, b]) => (
              <tr key={a}>
                <td className="d-nowrap">{a}</td>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="vault" eyebrow="The defense" title="The Defense Vault">
        <p>
          The Defense Vault holds HYDRA's war chest in ORBIO. It is a small contract with one job: turn ORBIO into burned $HYDRA, slowly, and
          only when the agent asks.
        </p>
        <ul>
          <li>
            <b>Anyone can deposit.</b> A plain ORBIO transfer to its address counts. The creator seeds it at launch.
          </li>
          <li>
            <b>Nobody can withdraw.</b> There is no owner and no withdraw function: not for the creator, the agent or Orbio.
          </li>
          <li>
            <b>Only the agent's wallet can buy back</b>, and every buyback burns what it bought in the same transaction.
          </li>
          <li>
            <b>Hard limits:</b> at most 10% of the fund in any 24 hours, 30% in any 7 days, and 6 hours between buybacks. These are constants
            in the code and can never change.
          </li>
          <li>
            <b>Slippage protection:</b> each buyback states the least $HYDRA it will accept, and the whole transaction fails if the market
            gives less.
          </li>
          <li>
            <b>Stray tokens burn too.</b> Anyone can burn $HYDRA that was sent to the vault by mistake.
          </li>
        </ul>
        <Note tone="gold" title="Where the fund comes from today">
          The fund starts with the creator's seed at launch, and grows with anything anyone sends to it. Swapping the agent's spare CREDIT into
          the fund is planned but not live yet.
        </Note>
      </Section>

      <Section id="rules" title="When HYDRA fights">
        <p>A buyback needs all three of these at once:</p>
        <ol className="d-steps">
          <li>
            <b>Fear on X is 70 or more</b> out of 100, measured over the last 6 hours of posts that passed the filter.
          </li>
          <li>
            <b>The price is down 10% or more over 24 hours.</b>
          </li>
          <li>
            <b>The vault's cooldown has passed</b>, and its daily and weekly limits have room.
          </li>
        </ol>
        <p>
          <b>Size.</b> The worse the attack, the bigger the answer: from 2% of the fund at the threshold up to 10% at the extreme, then trimmed
          to whatever the contract's limits still allow.
        </p>
        <p>
          <b>Price.</b> The agent quotes the exact trade first, and accepts at most 3% less than the quote.
        </p>
        <Note title="Posts alone never spend the fund, and neither does the price alone">
          A wave of angry posts with a steady price is noise. A falling price with a calm timeline is just the market. HYDRA fights only when
          both agree. It also needs about a day of its own price history, so no buyback can happen in its first ~22 hours.
        </Note>
        <p>
          <b>Rest.</b> If the agent's own budget for models and X falls below 7 days of running costs, it rests: it stops paying to listen
          until fees refill the budget.
        </p>
      </Section>

      <Section id="badges" title="Survivor badges">
        <p>Every attack HYDRA survives has a badge, for the people who held through it.</p>
        <ul>
          <li>
            <b>Who gets one:</b> wallets that held $HYDRA when the attack hit, and still held at least as much 48 hours later.
          </li>
          <li>
            <b>How:</b> the agent publishes the list as a Merkle root, once per attack. Once set, a list can never change.
          </li>
          <li>
            <b>Claiming:</b> free. You claim it yourself in the Survivor Grotto and pay only the gas.
          </li>
          <li>
            <b>Soulbound:</b> badges cannot be sold or moved. They prove that you were there.
          </li>
        </ul>
        <p>Claims for an attack open when its list is published, after its 48-hour window closes.</p>
      </Section>

      <Section id="token" eyebrow="Token and money" title="The token">
        <ul>
          <li>
            <b>Launched through Orbio's agent launchpad</b> on Pons, on Robinhood Chain (chain id {CONFIG.chainId}), and paired with ORBIO.
          </li>
          <li>
            <b>Two stages of trading.</b> First a bonding curve priced in ORBIO. When about 193,500 ORBIO has gone in, it graduates to a Uniswap
            v4 pool, and the agent follows it there on its own.
          </li>
          <li>
            <b>A plain ERC-20</b> with a real burn function and no fee on transfers. Burns lower the total supply, which anyone can check on
            the explorer.
          </li>
          <li>
            <b>Its name and symbol</b> are written once at launch and can never change.
          </li>
        </ul>
      </Section>

      <Section id="money" title="Where the money goes">
        <p>Orbio splits the creator's share of $HYDRA's trading fees four ways. Each part has one destination:</p>
        <table className="d-table">
          <thead>
            <tr>
              <th>Part</th>
              <th className="d-num">Share</th>
              <th>Goes to</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Staked ORBIO</td>
              <td className="d-num">50%</td>
              <td>The HydraTreasury contract, which can pay it only into the Jellypions reward pool, once a day.</td>
            </tr>
            <tr>
              <td>CREDIT</td>
              <td className="d-num">30%</td>
              <td>The agent's running costs: models, X search and posting.</td>
            </tr>
            <tr>
              <td>AI balance</td>
              <td className="d-num">10%</td>
              <td>The same running costs.</td>
            </tr>
            <tr>
              <td>Orbio treasury</td>
              <td className="d-num">10%</td>
              <td>Orbio.</td>
            </tr>
          </tbody>
        </table>
        <p>Outside the fees:</p>
        <ul>
          <li>
            <b>The Jellypions mint is free.</b> The contract takes no ETH, so there is no mint money at all, and rewards can only ever
            come from trading fees: new holders never pay old ones.
          </li>
          <li>
            <b>The Defense Vault</b> holds the creator's seed and anything anyone deposits (see <a href="#vault">The Defense Vault</a>).
          </li>
        </ul>
      </Section>

      <Section id="jellypions" eyebrow="Jellypions" title="The collection">
        <p>
          Jellypions are HYDRA's genesis NFTs: 3,333 of them (symbol JELLY), drawn entirely on-chain on Robinhood Chain. There is no image
          server; the contract itself returns the art.
        </p>
        <ul>
          <li>
            <b>Mint:</b> free, at most 5 per wallet. You pay only the network gas; the contract refuses any ETH sent with a mint.
          </li>
          <li>
            <b>Fair instant hatch:</b> each egg's traits come from the hash of the block <i>after</i> your mint, which nobody can know when you
            mint. Eggs hatch strictly in order, so cancelling, retrying or waiting changes nothing. Hatching takes about a second.
          </li>
          <li>
            <b>Reveal as the pool fills:</b> one more layer of the art shows for every 10% minted. Everything reveals at sell-out, or 72 hours
            after the mint opens, whichever comes first.
          </li>
          <li>
            <b>Nine visual traits</b> plus a rarity style, and no two Jellypions alike.
          </li>
        </ul>
      </Section>

      <Section id="rarity" title="Rarity">
        <p>Rarity is drawn from a fixed pool rather than rolled per token, so the exact count of every tier is known before the mint opens.</p>
        <table className="d-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th className="d-num">Share</th>
              <th className="d-num">Count</th>
              <th className="d-num">Points</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Drift', '55%', '1,834', '1'],
              ['Neon', '25%', '833', '2'],
              ['Cosmic', '12%', '400', '4'],
              ['Prism', '7%', '233', '8'],
              ['Genesis', '1%', '33', '20'],
            ].map(([t, s, c, p]) => (
              <tr key={t}>
                <td className="d-tier-cell">
                  <span className={`d-tier d-tier-${t.toLowerCase()}`} />
                  {t}
                </td>
                <td className="d-num">{s}</td>
                <td className="d-num">{c}</td>
                <td className="d-num">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Five of the 33 Genesis are <b>one-of-ones</b> with their own art. They look like ordinary Jellypions until the full reveal, and earn
          20 points like every Genesis.
        </p>
      </Section>

      <Section id="staking" title="Staking and rewards">
        <ul>
          <li>
            <b>Staking opens 12 hours after the mint starts.</b>
          </li>
          <li>
            <b>Soft staking:</b> your Jellypion never leaves your wallet. While it is staked it cannot be transferred, and marketplaces show it
            as locked. Unstake any time, with no lock and no penalty.
          </li>
          <li>
            <b>Points:</b> each staked Jellypion earns its tier's points. Your share of the rewards is your points divided by all staked points.
          </li>
          <li>
            <b>Rewards come from fees only:</b> once a day, the staked-ORBIO share of $HYDRA's fees goes into the pool and streams out to stakers
            over the next 24 hours. Staking a minute before a deposit earns a minute's worth.
          </li>
          <li>
            <b>Claim</b> your ORBIO whenever you like.
          </li>
        </ul>
        <Note tone="gold" title="A rate, never a promise">
          The site shows what a staked Jellypion earns per day at today's rate. That rate moves with trading volume and with how many
          Jellypions are staked. Nothing here is a promised return.
        </Note>
      </Section>

      <Section id="security" eyebrow="Trust" title="Security and admin powers">
        <p>What each contract lets anyone do, and what nobody can do:</p>
        <table className="d-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Who can do what</th>
              <th>Nobody can</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>DefenseVault</td>
              <td>Anyone deposits. Only the agent wallet buys back, within the limits.</td>
              <td>Withdraw, change the limits or change the agent</td>
            </tr>
            <tr>
              <td>HydraTreasury</td>
              <td>Launched $HYDRA, once. Pays the fee stake into the Jellypions pool, at most once every 20 hours.</td>
              <td>Send the stake anywhere else</td>
            </tr>
            <tr>
              <td>Jellypions</td>
              <td>The admin can replace the art renderer until it is frozen, and never again after that.</td>
              <td>Charge for the mint, or change the supply or times, or move a staked Jellypion</td>
            </tr>
            <tr>
              <td>SurvivorNFT</td>
              <td>The agent sets each attack's list, once.</td>
              <td>Change a list or move a badge</td>
            </tr>
          </tbody>
        </table>
        <Note title="If the agent's key were stolen">
          The thief could only do what the agent can: burn $HYDRA from the vault, within the daily and weekly limits. They could never take the
          fund.
        </Note>
        <p>
          The contracts were tested with a full Foundry suite and rehearsed end to end on a fork of Robinhood Chain mainnet, including real
          buybacks and burns. They have <b>not</b> had a third-party audit.
        </p>
      </Section>

      <Section id="contracts" title="Contract addresses">
        <p>All on Robinhood Chain (chain id {CONFIG.chainId}). Always check an address here before you send anything to it.</p>
        <table className="d-table d-addresses">
          <tbody>
            <Address name="$HYDRA token" value={CONFIG.hydraToken} />
            <Address name="DefenseVault" value={CONFIG.defenseVault} />
            <Address name="HydraTreasury" value={CONFIG.treasury} />
            <Address name="Jellypions (JELLY)" value={CONFIG.spawnNft} />
            <Address name="SurvivorNFT" value={CONFIG.survivorNft} />
            <Address name="ORBIO" value={CONFIG.orbioToken} />
          </tbody>
        </table>
      </Section>

      <Section id="timeline" title="Launch timeline">
        <ol className="d-timeline">
          <li>
            <b>Launch</b>
            <span>$HYDRA launches on Orbio and trading starts. The creator seeds the Defense Vault.</span>
          </li>
          <li>
            <b>Mint opens</b>
            <span>{CONFIG.mintStart ? `${utc(CONFIG.mintStart)}. Jellypions can be minted.` : `The time will be announced on X by @${X}.`}</span>
          </li>
          <li>
            <b>+12 hours</b>
            <span>Staking opens, and the first daily reward deposit can land.</span>
          </li>
          <li>
            <b>+72 hours</b>
            <span>The mint closes and every Jellypion reveals in full.</span>
          </li>
          <li>
            <b>Every day</b>
            <span>Rewards are deposited at 00:05 UTC, and the Survival report is posted at 20:00 UTC.</span>
          </li>
        </ol>
      </Section>

      <Section id="risks" title="Risks">
        <p>Said plainly:</p>
        <ul>
          <li>
            <b>No price guarantee.</b> The fund is only as big as what has been put in. A large enough sell-off will push past it.
          </li>
          <li>
            <b>The fund starts small.</b> In the first weeks, the creator's seed is most of the defense.
          </li>
          <li>
            <b>Rewards follow volume.</b> Little trading means little to share.
          </li>
          <li>
            <b>The agent can be wrong.</b> It reads a noisy timeline with a language model. The filters and the price check reduce mistakes,
            but they do not remove them.
          </li>
          <li>
            <b>Smart-contract risk.</b> The contracts are tested but have not been audited by a third party.
          </li>
          <li>
            <b>Chain risk.</b> The NFT's fairness rests on Robinhood Chain's sequencer, like everything else on the chain.
          </li>
          <li>
            <b>Regulation.</b> Tokens with buybacks and holder rewards are treated differently in different countries. Check the rules where you
            live.
          </li>
        </ul>
      </Section>

      <Section id="faq" eyebrow="Help" title="FAQ">
        <div className="d-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section id="glossary" title="Glossary">
        <dl className="d-glossary">
          {[
            ['Orbio', 'The platform HYDRA runs on. It launched the token, pays its fees and runs its models and X tools.'],
            ['ORBIO', 'Orbio’s token. $HYDRA trades against it, the Defense Vault holds it, and stakers are paid in it.'],
            ['CREDIT', 'Orbio’s credit for AI usage. It pays for the agent’s thinking and posting.'],
            ['Pons', 'The launchpad contracts: a bonding curve, then a Uniswap v4 pool.'],
            ['Buyback and burn', 'Buying $HYDRA on the market and destroying it, which lowers the supply for good.'],
            ['Attack', 'A moment when fear on X and a falling price arrive together. Each one HYDRA answers is numbered.'],
            ['Head', 'HYDRA starts with one head, and grows another for every attack it survives.'],
            ['Fathoms', 'Depth in the Ember Sea. The deeper the layer, the further into HYDRA’s workings.'],
          ].map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  )
}

const utc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

const FAQ: [string, string][] = [
  ['Can the team withdraw the defense fund?', 'No. The Defense Vault has no owner and no withdraw function. ORBIO leaves it only as a buyback that is burned.'],
  [
    'Will a wave of FUD posts trigger a buyback?',
    'Not on its own. The price must also be down 10% or more over 24 hours, and posts from new accounts, tiny accounts or copy-paste campaigns are ignored.',
  ],
  ['Does the mint cost anything?', 'No. The mint is free; you pay only gas. Staking rewards come only from $HYDRA’s trading fees.'],
  ['Is staking locked?', 'No. Your Jellypion stays in your wallet, and you can unstake at any time without a penalty.'],
  [
    'Which wallet do I need?',
    `Any browser wallet that supports custom networks. The site asks it to switch to Robinhood Chain (chain id ${CONFIG.chainId}), and to add the network if it is missing. Gas is paid in ETH.`,
  ],
  [
    'How do I get a Survivor badge?',
    'Hold $HYDRA through an attack: when it hits, and with at least the same balance 48 hours later. Then claim it in the Survivor Grotto.',
  ],
  ['Where can I follow what the agent does?', `In the Ember Sea (Thinking Coral and the Wreck Field), and on X at @${X}. Every buyback is posted with its transaction.`],
]

function Address({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const url = addressUrl(value)
  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  return (
    <tr>
      <td className="d-nowrap">{name}</td>
      <td>
        {value ? (
          <span className="d-addr">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <code>{value}</code>
              </a>
            ) : (
              <code>{value}</code>
            )}
            <button type="button" className="d-copy" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </span>
        ) : (
          <span className="d-pending">Published at launch</span>
        )}
      </td>
    </tr>
  )
}

function Footer() {
  return (
    <footer className="d-footer">
      <div className="d-footer-row">
        <a className="d-brand" href={SEA}>
          <Logo size={18} />
          <span className="d-brand-name">HYDRA</span>
        </a>
        <nav>
          <a href={SEA}>The Ember Sea</a>
          <a href="#contracts">Contracts</a>
          <a href="#risks">Risks</a>
          <a href={`https://x.com/${X}`} target="_blank" rel="noopener noreferrer">
            @{X}
          </a>
        </nav>
      </div>
      <p className="d-legal">
        HYDRA is an experiment in autonomous software, not a company or a financial product. Nothing on this site is investment advice or a
        promise of profit. Tokens and NFTs can lose all their value. Read the <a href="#risks">risks</a>, and only use money you can afford to
        lose.
      </p>
    </footer>
  )
}
