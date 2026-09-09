import sharp from 'sharp'

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

export type EncodeRequest = {
  sourcePath: string
  crop?: CropRect | null
  resize?: ResizeSize | null
  format: OutputFormat
  quality: number
  flattenColor?: string
}

export type EncodeResult = {
  bytes: Buffer
  byteLength: number
  width: number
  height: number
}

export type SourceInfo = {
  width: number
  height: number
  hasAlpha: boolean
  format: string
}

const ALLOWED_INPUT = new Set(['jpeg', 'png', 'webp', 'gif', 'bmp'])

function clampQuality(quality: number): number {
  return Math.min(100, Math.max(1, Math.round(quality)))
}

function integerCrop(crop: CropRect, imageWidth: number, imageHeight: number): CropRect | null {
  if (imageWidth < 1 || imageHeight < 1) return null

  const left = Math.max(0, Math.min(Math.round(crop.left), imageWidth - 1))
  const top = Math.max(0, Math.min(Math.round(crop.top), imageHeight - 1))
  const width = Math.max(1, Math.min(Math.round(crop.width), imageWidth - left))
  const height = Math.max(1, Math.min(Math.round(crop.height), imageHeight - top))

  if (left === 0 && top === 0 && width === imageWidth && height === imageHeight) {
    return null
  }

  return { left, top, width, height }
}

function integerSize(size: ResizeSize): ResizeSize {
  return {
    width: Math.max(1, Math.round(size.width) || 1),
    height: Math.max(1, Math.round(size.height) || 1)
  }
}

function pngCompressionLevel(quality: number): number {
  return Math.round((clampQuality(quality) / 100) * 9)
}

async function assertAllowed(sourcePath: string): Promise<sharp.Metadata> {
  const meta = await sharp(sourcePath).metadata()
  const format = meta.format ?? ''
  if (!ALLOWED_INPUT.has(format)) {
    throw new Error(`Unsupported input type: ${format || 'unknown'}`)
  }
  return meta
}

export async function inspectSource(sourcePath: string): Promise<SourceInfo> {
  const meta = await assertAllowed(sourcePath)
  return {
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    hasAlpha: Boolean(meta.hasAlpha),
    format: meta.format ?? 'unknown'
  }
}

export async function encode(request: EncodeRequest): Promise<EncodeResult> {
  const meta = await assertAllowed(request.sourcePath)
  const quality = clampQuality(request.quality)
  let pipeline = sharp(request.sourcePath)
  const crop = request.crop ? integerCrop(request.crop, meta.width ?? 0, meta.height ?? 0) : null

  if (crop) {
    pipeline = pipeline.extract(crop)
  }

  const sourceWidth = crop?.width ?? meta.width ?? 0
  const sourceHeight = crop?.height ?? meta.height ?? 0
  if (request.resize) {
    const resize = integerSize(request.resize)
    if (resize.width !== sourceWidth || resize.height !== sourceHeight) {
      pipeline = pipeline.resize(resize.width, resize.height, { fit: 'fill' })
    }
  }

  if (request.format === 'jpeg' && meta.hasAlpha) {
    pipeline = pipeline.flatten({ background: request.flattenColor ?? '#ffffff' })
  }

  if (request.format === 'jpeg') {
    pipeline = pipeline.jpeg({ quality })
  } else if (request.format === 'png') {
    pipeline = pipeline.png({ compressionLevel: pngCompressionLevel(quality) })
  } else {
    pipeline = pipeline.webp({ quality })
  }

  const bytes = await pipeline.toBuffer()
  const out = await sharp(bytes).metadata()

  return {
    bytes,
    byteLength: bytes.length,
    width: out.width ?? 0,
    height: out.height ?? 0
  }
}
