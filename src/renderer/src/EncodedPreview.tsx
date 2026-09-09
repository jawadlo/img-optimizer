import { useEffect, useMemo, type JSX } from 'react'
import type { OutputFormat } from './types'

function blobFromBytes(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type })
}

type Props = {
  bytes: Uint8Array
  format: OutputFormat
}

export function EncodedPreview({ bytes, format }: Props): JSX.Element {
  const url = useMemo(() => {
    const type = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp'
    return URL.createObjectURL(blobFromBytes(bytes, type))
  }, [bytes, format])

  useEffect(() => {
    return () => URL.revokeObjectURL(url)
  }, [url])

  return <img src={url} alt="After export" draggable={false} />
}
