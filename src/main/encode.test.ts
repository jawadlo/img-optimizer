import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, beforeAll } from 'vitest'
import sharp from 'sharp'
import { encode, inspectSource } from './encode'

const fixtures = join(tmpdir(), 'img-optimizer-fixtures')

beforeAll(async () => {
  await mkdir(fixtures, { recursive: true })

  const redBlue = Buffer.alloc(4 * 2 * 3)
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 4; x++) {
      const i = (y * 4 + x) * 3
      if (x < 2) {
        redBlue[i] = 255
        redBlue[i + 1] = 0
        redBlue[i + 2] = 0
      } else {
        redBlue[i] = 0
        redBlue[i + 1] = 0
        redBlue[i + 2] = 255
      }
    }
  }

  await sharp(redBlue, { raw: { width: 4, height: 2, channels: 3 } })
    .png()
    .toFile(join(fixtures, 'rgb-4x2.png'))

  const transparent = Buffer.alloc(8 * 8 * 4, 0)
  await sharp(transparent, { raw: { width: 8, height: 8, channels: 4 } })
    .png()
    .toFile(join(fixtures, 'alpha-8x8.png'))

  const frame1 = await sharp({
    create: { width: 3, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } }
  })
    .gif()
    .toBuffer()
  await sharp(frame1).toFile(join(fixtures, 'first-frame.gif'))

  await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 10, g: 20, b: 30 } }
  })
    .tiff()
    .toFile(join(fixtures, 'unsupported.tiff'))
})

describe('encode', () => {
  it('returns JPEG bytes and byteLength for a JPEG export', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'jpeg',
      quality: 80
    })

    expect(result.bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
    expect(result.byteLength).toBe(result.bytes.length)
    expect(result.width).toBe(4)
    expect(result.height).toBe(2)
  })

  it('crops to the requested source-pixel rectangle', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      crop: { left: 0, top: 0, width: 2, height: 2 },
      format: 'jpeg',
      quality: 80
    })

    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
  })

  it('rounds fractional crop coordinates to source pixels instead of throwing', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      crop: { left: 0.4, top: 0.4, width: 2.4, height: 1.6 },
      format: 'jpeg',
      quality: 80
    })

    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
  })

  it('clamps an out-of-bounds crop to the source instead of throwing', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      crop: { left: 3.7, top: 0, width: 4, height: 2 },
      format: 'png',
      quality: 80
    })

    expect(result.width).toBe(1)
    expect(result.height).toBe(2)
  })

  it('exports PNG and WebP with matching magic bytes', async () => {
    const png = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'png',
      quality: 80
    })
    const webp = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'webp',
      quality: 80
    })

    expect(png.bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(webp.bytes.subarray(0, 4).toString('ascii')).toBe('RIFF')
  })

  it('higher JPEG quality produces a larger file than lower quality', async () => {
    const high = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'jpeg',
      quality: 95
    })
    const low = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'jpeg',
      quality: 20
    })

    expect(high.byteLength).toBeGreaterThan(low.byteLength)
  })

  it('treats JPEG quality 0 as the lowest valid quality instead of throwing', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'jpeg',
      quality: 0
    })

    expect(result.bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
  })

  it('flattens alpha onto the given color when exporting JPEG', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'alpha-8x8.png'),
      format: 'jpeg',
      quality: 100,
      flattenColor: '#00ff00'
    })
    const stats = await sharp(result.bytes).stats()

    expect(result.width).toBe(8)
    expect(result.height).toBe(8)
    expect(stats.channels[1].mean).toBeGreaterThan(200)
    expect(stats.channels[0].mean).toBeLessThan(40)
    expect(stats.channels[2].mean).toBeLessThan(40)
  })

  it('encodes a GIF using the first frame dimensions', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'first-frame.gif'),
      format: 'png',
      quality: 80
    })

    expect(result.width).toBe(3)
    expect(result.height).toBe(2)
  })

  it('resizes to the requested width and height', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'png',
      quality: 80,
      resize: { width: 8, height: 4 }
    })

    expect(result.width).toBe(8)
    expect(result.height).toBe(4)
  })

  it('crops first then resizes the cropped rectangle', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      crop: { left: 2, top: 0, width: 2, height: 2 },
      resize: { width: 6, height: 6 },
      format: 'png',
      quality: 80
    })

    expect(result.width).toBe(6)
    expect(result.height).toBe(6)
    const stats = await sharp(result.bytes).stats()
    expect(stats.channels[2].mean).toBeGreaterThan(200)
    expect(stats.channels[0].mean).toBeLessThan(40)
  })

  it('rounds fractional resize dimensions to whole pixels', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'png',
      quality: 80,
      resize: { width: 5.6, height: 2.2 }
    })

    expect(result.width).toBe(6)
    expect(result.height).toBe(2)
  })

  it('clamps zero or negative resize dimensions to 1px', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'png',
      quality: 80,
      resize: { width: 0, height: -4 }
    })

    expect(result.width).toBe(1)
    expect(result.height).toBe(1)
  })

  it('can stretch to a different aspect ratio when both sides are set', async () => {
    const result = await encode({
      sourcePath: join(fixtures, 'rgb-4x2.png'),
      format: 'png',
      quality: 80,
      resize: { width: 3, height: 8 }
    })

    expect(result.width).toBe(3)
    expect(result.height).toBe(8)
  })

  it('rejects unsupported input types', async () => {
    await expect(
      encode({
        sourcePath: join(fixtures, 'unsupported.tiff'),
        format: 'jpeg',
        quality: 80
      })
    ).rejects.toThrow(/unsupported/i)
  })
})

describe('inspectSource', () => {
  it('reports dimensions and alpha for the working image', async () => {
    const opaque = await inspectSource(join(fixtures, 'rgb-4x2.png'))
    const alpha = await inspectSource(join(fixtures, 'alpha-8x8.png'))

    expect(opaque).toMatchObject({ width: 4, height: 2, hasAlpha: false })
    expect(alpha).toMatchObject({ width: 8, height: 8, hasAlpha: true })
  })
})
