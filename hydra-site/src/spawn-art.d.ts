// Types for ../nft/spawn-art.js (aliased as @spawn-art in vite.config.ts).
declare module '@spawn-art' {
  export type Traits = {
    seed: string
    tier: number
    one: number | null
    backdrop: [string, string, number]
    palette: [string, string, string, string, string, number]
    eyes: string
    mouth: string
    hat: string
    neck: string
    face: string
    skin: string
    tentacles: string
  }
  /** name, staking points, supply, colour */
  export const TIERS: [string, number, number, string][]
  export const ONES: string[]
  /** Per mille of supply minted before each part shows (1000 = mint-out). */
  export const REVEAL: Record<'backdrop' | 'palette' | 'tentacles' | 'eyes' | 'mouth' | 'skin' | 'neck' | 'face' | 'hat' | 'style', number>
  export function traits(seed: string, tier?: number | null, one?: number | null): Traits
  export function render(t: Traits, opts?: { progress?: number; staked?: boolean }): string
  export function attributes(t: Traits, progress?: number, staked?: boolean): [string, string][]
  export function egg(): string
  export function interactiveHTML(svg: string): string
  export function permille(progress: number): number
  /** data:application/json;base64, exactly as HydraSpawn.tokenURI returns it. */
  export function tokenURI(t: Traits, id: number, progress: number, staked: boolean): string
  export function eggURI(id: number): string
}
