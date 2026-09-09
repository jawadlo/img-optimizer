import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { inspectSource } from './encode'
import { mimeTypeForFormat } from './naming'

export type WorkingFileDto = {
  path: string
  bytes: Uint8Array
  mimeType: string
  info: {
    width: number
    height: number
    hasAlpha: boolean
    format: string
  }
}

const EMPTY_FILE = 'Could not read that file. Use Choose File or drop from File Explorer.'

function safeFileName(fileName: string): string {
  const base = basename(fileName)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .trim()
  return base || 'image'
}

export async function loadFromPath(filePath: string): Promise<WorkingFileDto> {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error(EMPTY_FILE)
  }

  const info = await inspectSource(filePath)
  const bytes = await readFile(filePath)

  return {
    path: filePath,
    bytes: new Uint8Array(bytes),
    mimeType: mimeTypeForFormat(info.format),
    info
  }
}

export async function loadFromBytes(fileName: string, bytes: Uint8Array): Promise<WorkingFileDto> {
  if (bytes.byteLength < 1) {
    throw new Error(EMPTY_FILE)
  }

  const dir = join(tmpdir(), 'img-optimizer-drops', randomUUID())
  await mkdir(dir, { recursive: true })
  const tmpPath = join(dir, safeFileName(fileName))
  await writeFile(tmpPath, Buffer.from(bytes))
  return loadFromPath(tmpPath)
}
