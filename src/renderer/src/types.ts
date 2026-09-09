export type WorkingFile = {
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

export type EncodeResult = {
  bytes: Uint8Array
  byteLength: number
  width: number
  height: number
}

export type OutputFormat = 'jpeg' | 'png' | 'webp'

export type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

export type ResizeSize = {
  width: number
  height: number
}

export function defaultOutputFormat(sourceFormat: string): OutputFormat {
  if (sourceFormat === 'jpeg') return 'jpeg'
  if (sourceFormat === 'webp') return 'webp'
  return 'png'
}

export function suggestedExportName(sourcePath: string, format: OutputFormat): string {
  const base = sourcePath.split(/[/\\]/).pop() ?? 'image'
  const stem = base.replace(/\.[^.]+$/, '') || 'image'
  const ext = format === 'jpeg' ? 'jpg' : format
  return `${stem}-optimized.${ext}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function fullCrop(width: number, height: number): CropRect {
  return { left: 0, top: 0, width, height }
}

export function isFullCrop(crop: CropRect, width: number, height: number): boolean {
  return crop.left === 0 && crop.top === 0 && crop.width === width && crop.height === height
}

export function isIdentityResize(
  size: ResizeSize,
  sourceWidth: number,
  sourceHeight: number
): boolean {
  return size.width === sourceWidth && size.height === sourceHeight
}

export function shouldAcceptFileDrop(fromInsideApp: boolean, fileCount: number): boolean {
  return !fromInsideApp && fileCount > 0
}

export function clampPx(value: number): number {
  return Math.max(1, Math.round(value) || 1)
}

export function sizeFromLockedWidth(width: number, aspect: number): ResizeSize {
  const nextWidth = clampPx(width)
  return { width: nextWidth, height: clampPx(nextWidth / aspect) }
}

export function sizeFromLockedHeight(height: number, aspect: number): ResizeSize {
  const nextHeight = clampPx(height)
  return { width: clampPx(nextHeight * aspect), height: nextHeight }
}

export function scaleResizeFromWidth(
  width: number,
  sourceWidth: number,
  sourceHeight: number
): ResizeSize {
  const nextWidth = clampPx(width)
  return { width: nextWidth, height: clampPx(sourceHeight * (nextWidth / sourceWidth)) }
}

export function scaleResizeFromHeight(
  height: number,
  sourceWidth: number,
  sourceHeight: number
): ResizeSize {
  const nextHeight = clampPx(height)
  return { width: clampPx(sourceWidth * (nextHeight / sourceHeight)), height: nextHeight }
}
