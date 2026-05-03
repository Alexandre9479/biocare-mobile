// Run with: node scripts/generate-icons.js
const Jimp = require('jimp')
const path = require('path')

const PURPLE = 0x7B2D8BFF  // Biocare purple
const DARK   = 0x0F172AFF  // Dark background

async function createIcon(size, outputPath, bgColor, logoPadding) {
  // Load the original logo
  const logo = await Jimp.read(path.join(__dirname, '../assets/biocare-logo.png'))

  // Calculate logo dimensions to fit in square with padding
  const maxLogoW = size - padPx(size, logoPadding)
  const ratio    = maxLogoW / logo.bitmap.width
  const logoH    = Math.round(logo.bitmap.height * ratio)

  logo.resize(maxLogoW, logoH)

  // Create square canvas with background color
  const canvas = new Jimp(size, size, bgColor)

  // Center the logo
  const x = Math.round((size - maxLogoW) / 2)
  const y = Math.round((size - logoH) / 2)

  canvas.composite(logo, x, y)

  await canvas.writeAsync(outputPath)
  console.log(`✓ Created ${outputPath} (${size}×${size})`)
}

function padPx(size, pct) {
  return Math.round(size * pct * 2)
}

async function main() {
  const assets = path.join(__dirname, '../assets')

  // Main app icon — 1024×1024, purple background, logo with 12% padding
  await createIcon(1024, `${assets}/icon.png`, PURPLE, 0.12)

  // Adaptive icon foreground — 1024×1024, white background, tighter logo
  await createIcon(1024, `${assets}/adaptive-icon.png`, 0xFFFFFFFF, 0.10)

  // Splash screen — 1024×1024, dark background, logo with 15% padding
  await createIcon(1024, `${assets}/splash-icon.png`, DARK, 0.15)

  console.log('\n✅ All icons generated successfully!')
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
