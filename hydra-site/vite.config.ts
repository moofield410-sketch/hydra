import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Spawn art lives in ../nft/spawn-art.js, the reference renderer the contract is ported from.
// The site imports that exact file, so the website and the NFT can never draw differently.
const art = fileURLToPath(new URL('../nft/spawn-art.js', import.meta.url))

export default defineConfig({
  // Relative paths: the same build works at a domain's root and under a GitHub Pages project path.
  base: './',
  plugins: [react()],
  resolve: { alias: { '@spawn-art': art } },
  server: { fs: { allow: ['.', '../nft'] } },
})
