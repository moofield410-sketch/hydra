// The Spawn art in the site, drawn by the same file the contract is ported from (nft/spawn-art.js).
// Each SVG goes into an <img>, so the gradient and filter ids of different Spawn never collide.
import { attributes, egg, interactiveHTML, render, traits } from '@spawn-art'

const uri = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
const cache = new Map<string, string>()

export function spawnSvg(seed: string, tier: number, one: number | null, progress: number, staked = false) {
  return render(traits(seed, tier, one), { progress, staked })
}

/** A data URI for one Spawn at this reveal progress. Cached, since the art only changes per mille. */
export function spawnSrc(seed: string, tier: number, one: number | null, progress: number, staked = false) {
  const key = `${seed}|${tier}|${one}|${Math.round(progress * 1000)}|${staked}`
  let src = cache.get(key)
  if (!src) {
    src = uri(spawnSvg(seed, tier, one, progress, staked))
    if (cache.size > 120) cache.delete(cache.keys().next().value!)
    cache.set(key, src)
  }
  return src
}

export const EGG_SRC = uri(egg())

export const spawnAttributes = (seed: string, tier: number, one: number | null, progress: number, staked: boolean) =>
  attributes(traits(seed, tier, one), progress, staked)

export const spawnHTML = (seed: string, tier: number, one: number | null, progress: number, staked: boolean) =>
  interactiveHTML(spawnSvg(seed, tier, one, progress, staked))
