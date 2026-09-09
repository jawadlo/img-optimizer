import { extname } from 'node:path'
import type { OutputFormat } from './encode'

const MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp'
}

export function mimeTypeForFormat(format: string): string {
  return MIME[format] ?? 'application/octet-stream'
}

export function defaultOutputFormat(sourceFormat: string): OutputFormat {
  if (sourceFormat === 'jpeg') return 'jpeg'
  if (sourceFormat === 'webp') return 'webp'
  return 'png'
}

export function suggestedExportName(sourcePath: string, format: OutputFormat): string {
  const base = sourcePath.split(/[/\\]/).pop() ?? 'image'
  const stem = base.slice(0, base.length - extname(base).length) || 'image'
  const ext = format === 'jpeg' ? 'jpg' : format
  return `${stem}-optimized.${ext}`
}
