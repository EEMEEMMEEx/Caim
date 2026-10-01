import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" width="512" height="512">
  <defs>
    <!-- Brand Deep Blue Gradient -->
    <linearGradient id="pc-bg-grad" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e61f0" />
      <stop offset="100%" stop-color="#0f3aa8" />
    </linearGradient>

    <!-- Dynamic Workflow Accent Gradient -->
    <linearGradient id="pc-accent-grad" x1="12" y1="12" x2="30" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>

    <!-- Glow Stroke Gradient -->
    <linearGradient id="pc-stroke-glow" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.05" />
    </linearGradient>
  </defs>

  <!-- Squircle Badge Container -->
  <rect
    x="1.5"
    y="1.5"
    width="33"
    height="33"
    rx="9.5"
    fill="url(#pc-bg-grad)"
    stroke="url(#pc-stroke-glow)"
    stroke-width="1.25"
  />

  <!-- Stylized 'P' Workflow Stem & Loop (Core Integrity) -->
  <path
    d="M11 25.5V10.5H17.5C20.5376 10.5 23 12.9624 23 16C23 19.0376 20.5376 21.5 17.5 21.5H11"
    stroke="#ffffff"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Interlocking 'C' Workflow Progression Loop (Lifecycle Arc) -->
  <path
    d="M24.75 13C26.75 14.75 27.5 17.5 27.5 20.25C27.5 24.25 24.5 27.25 20.25 27.25C16.5 27.25 13.5 25 12.75 21.75"
    stroke="url(#pc-accent-grad)"
    stroke-width="2.5"
    stroke-linecap="round"
  />

  <!-- Active Verification Pulse Node -->
  <circle cx="20.25" cy="27.25" r="1.5" fill="#38bdf8" />
  <circle cx="20.25" cy="27.25" r="2.75" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.75" />
</svg>`

function createIco(images) {
  const count = images.length
  const headerSize = 6
  const dirEntrySize = 16
  let offset = headerSize + count * dirEntrySize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = ICO
  header.writeUInt16LE(count, 4) // count

  const entries = []
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0)
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1)
    entry.writeUInt8(0, 2) // color count
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8) // size of image data
    entry.writeUInt32LE(offset, 12) // offset
    entries.push(entry)
    offset += img.buffer.length
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)])
}

async function main() {
  const publicDir = path.resolve("public")
  const appDir = path.resolve("src/app")

  console.log("Generating brand favicon assets...")

  const svgBuffer = Buffer.from(SVG_CONTENT, "utf-8")

  // 1. Generate PNGs of various sizes
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer()
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer()
  const png48 = await sharp(svgBuffer).resize(48, 48).png().toBuffer()
  const png180 = await sharp(svgBuffer).resize(180, 180).png().toBuffer()
  const png192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer()
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer()

  // 2. Generate multi-resolution ICO (16, 32, 48)
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 },
  ])

  // 3. Write files into public/
  fs.writeFileSync(path.join(publicDir, "icon.svg"), svgBuffer)
  fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16)
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32)
  fs.writeFileSync(path.join(publicDir, "icon.png"), png192)
  fs.writeFileSync(path.join(publicDir, "icon-512x512.png"), png512)
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), png180)
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer)

  // Also write into public/seo/ if helpful
  const seoDir = path.join(publicDir, "seo")
  if (fs.existsSync(seoDir)) {
    fs.writeFileSync(path.join(seoDir, "favicon.ico"), icoBuffer)
    fs.writeFileSync(path.join(seoDir, "favicon-16x16.png"), png16)
    fs.writeFileSync(path.join(seoDir, "favicon-32x32.png"), png32)
    fs.writeFileSync(path.join(seoDir, "apple-touch-icon.png"), png180)
  }

  // 4. Overwrite Next.js default in src/app/
  fs.writeFileSync(path.join(appDir, "favicon.ico"), icoBuffer)
  fs.writeFileSync(path.join(appDir, "icon.png"), png32)
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), png180)

  console.log("Successfully generated all Process Claim brand favicon assets!")
}

main().catch((err) => {
  console.error("Failed to generate favicons:", err)
  process.exit(1)
})
