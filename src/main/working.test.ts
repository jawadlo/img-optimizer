import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, beforeAll } from 'vitest'
import sharp from 'sharp'
import { loadFromBytes, loadFromPath } from './working'

const fixtures = join(tmpdir(), 'img-optimizer-working-fixtures')

beforeAll(async () => {
  await mkdir(fixtures, { recursive: true })
  await sharp({
    create: { width: 4, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } }
  })
    .png()
    .toFile(join(fixtures, 'rgb-4x2.png'))
})

describe('loadFromPath', () => {
  it('rejects an empty path instead of asking sharp to open it', async () => {
    await expect(loadFromPath('')).rejects.toThrow(/could not read that file/i)
  })

  it('loads a working image from a real path', async () => {
    const working = await loadFromPath(join(fixtures, 'rgb-4x2.png'))
    expect(working.info.width).toBe(4)
    expect(working.info.height).toBe(2)
    expect(working.bytes.byteLength).toBeGreaterThan(0)
  })
})

describe('loadFromBytes', () => {
  it('saves dropped bytes under the original name so encode and export still have a path', async () => {
    const bytes = await readFile(join(fixtures, 'rgb-4x2.png'))
    const working = await loadFromBytes('holiday.png', bytes)

    expect(working.path.replaceAll('\\', '/').endsWith('/holiday.png')).toBe(true)
    expect(working.info.width).toBe(4)
    expect(working.info.height).toBe(2)
    expect(working.bytes.byteLength).toBe(bytes.byteLength)
  })
})
