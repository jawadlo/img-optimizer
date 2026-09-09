import { writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(join(root, 'resources', 'icon.svg'))

async function pngAt(size) {
  return sharp(svg, { density: Math.round((size / 1024) * 384) })
    .resize(size, size)
    .png()
    .toBuffer()
}

function icoFromPngs(images) {
  const count = images.length
  let offset = 6 + 16 * count
  const header = Buffer.alloc(offset)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)
  const parts = [header]
  let entry = 6
  for (const { size, data } of images) {
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(data.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    parts.push(data)
    offset += data.length
    entry += 16
  }
  return Buffer.concat(parts)
}

function icnsChunk(type, data) {
  const buf = Buffer.alloc(8 + data.length)
  buf.write(type, 0, 4, 'ascii')
  buf.writeUInt32BE(buf.length, 4)
  data.copy(buf, 8)
  return buf
}

function icnsFromPngs(map) {
  const chunks = Object.entries(map).map(([type, data]) => icnsChunk(type, data))
  const total = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const header = Buffer.alloc(8)
  header.write('icns', 0)
  header.writeUInt32BE(total, 4)
  return Buffer.concat([header, ...chunks])
}

const png1024 = await pngAt(1024)
const png512 = await pngAt(512)
const png256 = await pngAt(256)
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoImages = []
for (const size of icoSizes) {
  icoImages.push({ size, data: await pngAt(size) })
}

const icns = icnsFromPngs({
  icp4: await pngAt(16),
  icp5: await pngAt(32),
  icp6: await pngAt(64),
  ic07: await pngAt(128),
  ic08: png256,
  ic09: png512,
  ic10: png1024,
  ic11: await pngAt(32),
  ic12: await pngAt(64),
  ic13: png256,
  ic14: png512
})

const ico = icoFromPngs(icoImages)
await writeFile(join(root, 'resources', 'icon.png'), png512)
await writeFile(join(root, 'resources', 'icon.ico'), ico)
await writeFile(join(root, 'build', 'icon.png'), png1024)
await writeFile(join(root, 'build', 'icon.ico'), ico)
await writeFile(join(root, 'build', 'icon.icns'), icns)
await writeFile(join(root, 'src', 'renderer', 'src', 'assets', 'icon.png'), png256)

console.log('Wrote resources/icon.png, build/icon.{png,ico,icns}, renderer assets/icon.png')
