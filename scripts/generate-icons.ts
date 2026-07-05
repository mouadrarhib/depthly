/**
 * Generates Depthly brand icons for all required sizes.
 *
 * Design: three concentric rings (white, decreasing opacity) converging on
 * a brand-blue center dot (#4B9EFF), over a dark #141417 background.
 *
 * Run with:  npx tsx scripts/generate-icons.ts
 */

import sharp from 'sharp'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
const iconsDir  = path.join(publicDir, 'icons')

// ── SVG builder ───────────────────────────────────────────────────────────────

/**
 * Builds an SVG string at the requested size.
 * At 32 px the innermost ring is skipped (too fine to render cleanly).
 * Large icons get a rounded-rect background to match app-icon safe areas.
 */
function buildSvg(size: number, roundedCorners = false): string {
  const cx = size / 2
  const cy = size / 2

  // Proportions derived from the original 48×48 brand SVG
  const r1 = cx * (22   / 24)   // outer ring  — full opacity
  const r2 = cx * (14.5 / 24)   // middle ring — 45 % opacity
  const r3 = cx * (7.5  / 24)   // inner ring  — 20 % opacity (skipped at ≤ 32 px)
  const rd = cx * (3    / 24)   // center dot
  const sw = Math.max(1.5, cx * (1.25 / 24))  // stroke width

  const rx = roundedCorners ? Math.round(size * 0.18) : 0

  const rings =
    size <= 32
      ? `<circle cx="${cx}" cy="${cy}" r="${r1.toFixed(2)}" stroke="white" stroke-width="${sw.toFixed(2)}" fill="none" opacity="1"/>
         <circle cx="${cx}" cy="${cy}" r="${r2.toFixed(2)}" stroke="white" stroke-width="${sw.toFixed(2)}" fill="none" opacity="0.45"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r1.toFixed(2)}" stroke="white" stroke-width="${sw.toFixed(2)}" fill="none" opacity="1"/>
         <circle cx="${cx}" cy="${cy}" r="${r2.toFixed(2)}" stroke="white" stroke-width="${sw.toFixed(2)}" fill="none" opacity="0.45"/>
         <circle cx="${cx}" cy="${cy}" r="${r3.toFixed(2)}" stroke="white" stroke-width="${sw.toFixed(2)}" fill="none" opacity="0.2"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" ry="${rx}" fill="#141417"/>
  ${rings}
  <circle cx="${cx}" cy="${cy}" r="${rd.toFixed(2)}" fill="#4B9EFF"/>
</svg>`
}

// ── ICO builder ───────────────────────────────────────────────────────────────

/**
 * Wraps a PNG buffer in a minimal single-image ICO container.
 * All modern browsers accept PNG-embedded ICO files.
 */
function buildIco(pngData: Buffer, width: number, height: number): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type  = 1 (ICO)
  header.writeUInt16LE(1, 4)   // count = 1 image

  const dir = Buffer.alloc(16)
  dir.writeUInt8(width  === 256 ? 0 : width,  0)  // width  (0 encodes 256)
  dir.writeUInt8(height === 256 ? 0 : height, 1)  // height
  dir.writeUInt8(0, 2)                             // color count (0 = truecolor)
  dir.writeUInt8(0, 3)                             // reserved
  dir.writeUInt16LE(1,  4)                         // color planes
  dir.writeUInt16LE(32, 6)                         // bits per pixel
  dir.writeUInt32LE(pngData.length, 8)             // size of image data
  dir.writeUInt32LE(6 + 16, 12)                    // offset = header + dir

  return Buffer.concat([header, dir, pngData])
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  fs.mkdirSync(iconsDir, { recursive: true })

  // 1. favicon.ico (32×32)
  const faviconPng = await sharp(Buffer.from(buildSvg(32, false)))
    .resize(32, 32)
    .png()
    .toBuffer()
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), buildIco(faviconPng, 32, 32))
  console.log('✓  public/favicon.ico')

  // 2. icon-192.png
  await sharp(Buffer.from(buildSvg(192, true)))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'))
  console.log('✓  public/icons/icon-192.png')

  // 3. icon-512.png
  await sharp(Buffer.from(buildSvg(512, true)))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'))
  console.log('✓  public/icons/icon-512.png')

  // 4. apple-touch-icon.png (180×180 — Apple applies its own corner rounding)
  await sharp(Buffer.from(buildSvg(180, false)))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓  public/apple-touch-icon.png')

  console.log('\nAll icons generated.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
