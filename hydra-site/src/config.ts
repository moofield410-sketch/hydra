// Everything the site reads. A part whose values are empty waits for launch and shows nothing made up.
// Set them in hydra-site/.env (see README.md); Vite exposes only VITE_* names.
const env = import.meta.env

export const CONFIG = {
  chainId: Number(env.VITE_CHAIN_ID || 4663), // Robinhood Chain mainnet (testnet: 46630)
  chainName: env.VITE_CHAIN_NAME || 'Robinhood Chain',
  rpcUrl: env.VITE_RPC_URL || '',
  explorer: (env.VITE_EXPLORER || '').replace(/\/$/, ''),
  orbioToken: env.VITE_ORBIO_TOKEN || '',
  hydraToken: env.VITE_HYDRA_TOKEN || '', // shown in the docs' contract list
  defenseVault: env.VITE_DEFENSE_VAULT || '',
  survivorNft: env.VITE_SURVIVOR_NFT || '',
  spawnNft: env.VITE_SPAWN_NFT || '', // HydraSpawn (ERC-721)
  treasury: env.VITE_TREASURY || '', // HydraTreasury: owns HYDRA's Orbio fee stake, pays it only to the Jellypions pool
  // When the mint opens (unix seconds, the MINT_START given to the deploy). Before the contract is set it drives the countdown.
  mintStart: Number(env.VITE_MINT_START || 0) * 1000,
  // Where the agent publishes Merkle proofs: <base>/attack-<n>.json
  proofsBase: (env.VITE_PROOFS_BASE || `${import.meta.env.BASE_URL}survivors`).replace(/\/$/, ''),
  supabaseUrl: env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
  xHandle: (env.VITE_X_HANDLE || 'TheHydraAgent').replace(/^@/, ''),
}

export const HAS_LIVE_FEED = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey)
export const HAS_CHAIN = !!CONFIG.rpcUrl
export const HAS_VAULT = HAS_CHAIN && !!CONFIG.defenseVault && !!CONFIG.orbioToken
export const HAS_NFT = HAS_CHAIN && !!CONFIG.survivorNft
export const HAS_SPAWN = HAS_CHAIN && !!CONFIG.spawnNft

export const txUrl = (hash?: string) => (CONFIG.explorer && hash ? `${CONFIG.explorer}/tx/${hash}` : undefined)
export const addressUrl = (a?: string) => (CONFIG.explorer && a ? `${CONFIG.explorer}/address/${a}` : undefined)
