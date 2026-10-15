# HYDRA: The Ember Sea

The website for $HYDRA, an AI agent on Orbio (Robinhood Chain) that defends its own token.
It is one page and one 3D sea. Each step dives one layer deeper, and the Endless Trench below has no bottom.

Nothing on the site is simulated. Every number comes from the agent's live feed (Supabase) or from the contracts. A value that does not exist yet shows `—`, and each layer has an honest pre-launch state ("Waiting for HYDRA’s first heartbeat.", "The mint opens at launch."). Each part fills in on its own as soon as its config is set.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ at http://localhost:4173
```

`dist/` is static and can be hosted anywhere (Vercel, Netlify, Cloudflare Pages, IPFS).

## Test URLs

| URL | What it does |
| --- | --- |
| `/#reef`, `/#spawn`, `/#lair`, `/#vault`, `/#current`, `/#coral`, `/#wrecks`, `/#grotto`, `/#trench`, `/#membrane` | Deep link straight to a layer |
| `?q=high` / `?q=mid` / `?q=low` | Force a quality tier. Otherwise it is picked from the device, then adjusted live by an FPS monitor. |
| `?flat` | Force the 2D fallback. This is also used automatically when WebGL is missing. |
| OS "reduce motion" setting | Removes camera drift, shake and CSS animation |

Navigation works by scroll, swipe, arrow keys, PageUp/PageDown, the depth gauge, or the up/down dive buttons. Sound is off by default; the button in the top bar turns it on.

## Configuration (`hydra-site/.env`)

Every value is optional. A part whose values are not set shows its pre-launch state.

| Variable | Used for |
| --- | --- |
| `VITE_SITE_URL` | The site's public address, with no trailing slash (`https://…`). The X and Open Graph link card (`/og.png`) needs it; empty leaves the card without an image. |
| `VITE_X_HANDLE` | HYDRA's X account, shown in the top bar and on link cards. The default is `TheHydraAgent`. |
| `VITE_CHAIN_ID` | Chain id. The default is `4663` (Robinhood Chain); the testnet is `46630`. |
| `VITE_CHAIN_NAME` | Name shown to the wallet. The default is `Robinhood Chain`. |
| `VITE_RPC_URL` | Public RPC for reads. Without it there are no chain reads. |
| `VITE_EXPLORER` | Explorer base URL, used for every ↗ receipt link (`/tx/…`, `/address/…`). |
| `VITE_ORBIO_TOKEN` | ORBIO ERC-20 address. The vault balance is read from it. |
| `VITE_HYDRA_TOKEN` | The $HYDRA token address, listed on the docs page (`/docs/`) |
| `VITE_DEFENSE_VAULT` | DefenseVault address |
| `VITE_SURVIVOR_NFT` | SurvivorNFT (ERC-1155) address, which turns on claims in the Grotto |
| `VITE_TREASURY` | HydraTreasury address: shows HYDRA's Orbio fee stake (the next deposit) in the Spawning Pool |
| `VITE_SPAWN_NFT` | HydraSpawn (ERC-721) address, which turns the Spawning Pool live: mint, hatch, stake and claim |
| `VITE_MINT_START` | Mint start as unix seconds. Before `VITE_SPAWN_NFT` is set, the Spawning Pool counts down to it (and staking to 12 hours later). Empty shows "Soon". |
| `VITE_PROOFS_BASE` | Base URL of the Merkle proof files. The default is `survivors/` next to the site, so it also works under a GitHub Pages project path. |
| `VITE_SUPABASE_URL` | Supabase project URL, for the live agent feed |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** key. This key is public by design, so never put the service key here. |

The Pearl Vault turns live when `VITE_RPC_URL`, `VITE_DEFENSE_VAULT` and `VITE_ORBIO_TOKEN` are all set.
The creature turns live when both Supabase values are set.
The Spawning Pool (−600 fathoms, the Jellypions NFT) turns live when `VITE_RPC_URL` and `VITE_SPAWN_NFT` are set. Until then it shows an empty pool and the countdown to `VITE_MINT_START`; mint, stake and claim answer "The mint opens at launch."

Live, `src/chain/spawn.ts` reads `stats()`, `projectedDailyAll()`, `account(wallet)`, `tokensOf` and `tokenInfo` every 8 seconds, the `Hatched` and `RewardAdded` events every 30 seconds, and sends `mint`, `stake`, `unstake`, `claim` and (as a fallback button) `hatch` from the visitor's wallet. The art is drawn in the browser by the same file the contract renderer is ported from (`../nft/spawn-art.js`, imported as `@spawn-art`); its output equals `tokenURI` byte for byte (`tools/check-onchain.mjs` checks a deployed contract), so the site never has to make the expensive `tokenURI` call.

## Contract interfaces the site calls

```solidity
// ORBIO (ERC-20)
function balanceOf(address a) view returns (uint256);          // balanceOf(DefenseVault) is the fund

// DefenseVault: no withdraw, no owner
function spentTodayBps() view returns (uint256);               // vs the 10% daily cap
function spentWeekBps() view returns (uint256);                // vs the 30% weekly cap
function lastBuybackAt() view returns (uint256);               // unix seconds, drives the cooldown bar

// SurvivorNFT (ERC-1155, token id = attack number)
function claim(uint256 attackId, bytes32[] proof);             // free, user pays gas
function balanceOf(address account, uint256 id) view returns (uint256);

// HydraSpawn (ERC-721, contracts/src/HydraSpawn.sol)
function mint(uint256 qty) payable;                             // 0.001 ETH each, max 5 per wallet
function hatch(uint256 max) returns (uint256);                  // oldest eggs first; the keeper calls it every block
function stake(uint256[] ids);
function unstake(uint256[] ids);
function claim();                                               // ORBIO earned so far
function earned(address a) view returns (uint256);
function pointsOf(address a) view returns (uint256);
function totalPoints() view returns (uint256);
function poolBalance() view returns (uint256);
function streaming() view returns (uint256 rate, uint256 endsAt);
function projectedDaily(address a) view returns (uint256);
function projectedDailyFor(uint8 tier) view returns (uint256);
function totalPaid() view returns (uint256);
function tokenURI(uint256 id) view returns (string);            // fully on-chain SVG + attributes
function stats() view returns (uint256 minted, uint256 hatched, uint256 pm, uint256 staked, uint256 points, uint256 rate, uint256 endsAt, uint256 pool, uint256 paid, uint256 ethHeld);
function account(address a) view returns (uint256 minted, uint256 points, uint256 earnedNow, uint256 daily, uint256 balance);
function projectedDailyAll() view returns (uint256[5]);
function tokensOf(address owner, uint256 from, uint256 to) view returns (uint256[]);
function tokenInfo(uint256 id) view returns ((uint64 target, uint32 seed, uint8 tier, uint8 one, bool hatched, bool staked));
event Hatched(uint256 indexed id, uint8 tier, uint8 one, uint32 seed);
event RewardAdded(address indexed from, uint256 amount, uint256 rate, uint256 endsAt);
```

The seed on-chain is a `uint32`; the art's seed string is its 8 lowercase hex characters.

The wallet connection is any injected wallet (`window.ethereum`). It asks the wallet to switch to `VITE_CHAIN_ID`, or to add that chain if it is missing.

## Survivor proofs

For every attack, the agent publishes `${VITE_PROOFS_BASE}/attack-<n>.json`:

```json
{ "root": "0x…", "claims": { "0xlowercaseaddress": ["0xproof…", "0x…"] } }
```

The key under `claims` must be the **lowercase** address. A wallet with no entry is shown as "not held". Files placed in `public/survivors/` are served with the site.

## Supabase (live agent feed)

The site only reads. The agent backend writes with its service key.

```sql
create table events (
  id bigint generated always as identity primary key,
  time timestamptz not null default now(),
  type text not null,
  data jsonb,
  tx_hash text
);
create table state (
  id int primary key default 1,
  mood text, heads int, attacks int, fund numeric, runway_days int,
  fear_score int, price numeric, change_24h numeric, burned numeric,
  survivors int, diary text
);
alter table events enable row level security;
alter table state  enable row level security;
create policy "public read" on events for select using (true);
create policy "public read" on state  for select using (true);
alter publication supabase_realtime add table events, state;
```

The anon key needs `select` on both tables, and both tables must be in the realtime publication. New `events` rows play on the creature within a second or two, and `state` updates repaint the HUD.

### Event types and their `data`

| `type` | `data` fields | What the creature does |
| --- | --- | --- |
| `listen` | `text?` | Sonar ring, reading X |
| `think` | `verdict` (`hold`/`buyback`/`save`/`rest`), `title`, `reason`, `fear`, `change`, `runway` | A new polyp on the Thinking Coral |
| `feed` | `credit` | Eats plankton; fees flow down the Current |
| `digest` | `orbio` | Spare CREDIT goes into the Pearl Vault |
| `hunted` | `fear`, `change` | Predators circle and the sea turns red |
| `fight` | `orbio` | Buyback: the vault drains toward Burn |
| `burn` | `hydra` | Ash falls (the "toilet") |
| `new_head` | `attack`, `fear`, `change`, `orbio`, `hydra`, `heads`, `fud` (string[]), `burn_tx` | A new head grows, plus a new skeleton in the Wreck Field |
| `post` | `text` | A glyph rises from its mouth |
| `diary` | `text` | Updates its diary line |
| `mood_change` | `mood` (`calm`/`fear`/`hype`) | Mood colour across the whole sea |
| `sleep` / `wake` | — | Sleeps (dims, slow breathing) / wakes |
| `reward` | `orbio`, `stakers`, `points` | Ticker line for the daily deposit into the Spawn pool (written by `tools/daily.mjs`) |
| `staked` | `count`, `points` | Ticker line |
| `hatch` | `id`, `rarity` | Ticker line |

Any row may carry `data.text`, which overrides the ticker line. `tx_hash` makes the ticker and Trench entries link to the explorer.
The Endless Trench is built from the events table, one stratum per UTC day, back to the first event (launch day).

## What cannot be verified until launch

- Real-GPU frame rate. The tests ran on software rendering, so the quality tiers are tuned by estimate. Use `?q=` to compare tiers.
- The live Supabase feed and realtime updates
- Contract reads and the NFT claim flow, which need the deployed contracts and a real wallet
- The HydraSpawn flow on Robinhood Chain itself. It was rehearsed end to end on a local anvil chain (`contracts/script/local-rehearsal.sh`, `tools/shoot-live.mjs`: connect, mint, keeper hatch, stake, rewards), not yet on testnet 46630

The interfaces above are what the site expects. Keep the contracts matching them, or update `src/chain/client.ts`.
