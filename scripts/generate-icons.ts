import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const outDir = path.resolve(import.meta.dirname, '../public/icons')
fs.mkdirSync(outDir, { recursive: true })

async function makeIcon(size: number): Promise<void> {
  // Dark square (#0D0D10) with "D" centered in brand blue (#4B9EFF)
  const fontSize = Math.round(size * 0.45)
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0D0D10"/>
      <text
        x="50%" y="54%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Inter, Arial, sans-serif"
        font-weight="700"
        font-size="${fontSize}"
        fill="#4B9EFF"
      >D</text>
    </svg>
  `

  const dest = path.join(outDir, `icon-${size}.png`)
  await sharp(Buffer.from(svg)).png().toFile(dest)
  console.log(`Created ${dest}`)
}

await makeIcon(192)
await makeIcon(512)
