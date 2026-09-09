import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type JSX } from 'react'
import { CropStage } from './CropStage'
import { EncodedPreview } from './EncodedPreview'
import {
  clampPx,
  defaultOutputFormat,
  formatBytes,
  fullCrop,
  isFullCrop,
  isIdentityResize,
  scaleResizeFromHeight,
  scaleResizeFromWidth,
  shouldAcceptFileDrop,
  suggestedExportName,
  type CropRect,
  type EncodeResult,
  type OutputFormat,
  type ResizeSize,
  type WorkingFile
} from './types'

type Mode = 'crop' | 'compare'
type Session = {
  file: WorkingFile
  url: string
  crop: CropRect
  resize: ResizeSize
  lockAspect: boolean
}

function blobFromBytes(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function applyCrop(session: Session, crop: CropRect): Session {
  const keepCustom = !isIdentityResize(session.resize, session.crop.width, session.crop.height)
  return {
    ...session,
    crop,
    resize: keepCustom ? session.resize : { width: crop.width, height: crop.height }
  }
}

function parseDim(raw: string): number | null {
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : null
}

function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null)
  const [mode, setMode] = useState<Mode>('compare')
  const [format, setFormat] = useState<OutputFormat>('jpeg')
  const [quality, setQuality] = useState(80)
  const [flattenColor, setFlattenColor] = useState('#ffffff')
  const [preview, setPreview] = useState<EncodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragover, setDragover] = useState(false)
  const insideAppDrag = useRef(false)

  const replaceSession = useCallback((file: WorkingFile) => {
    setSession((current) => {
      if (current) URL.revokeObjectURL(current.url)
      return {
        file,
        url: URL.createObjectURL(blobFromBytes(file.bytes, file.mimeType)),
        crop: fullCrop(file.info.width, file.info.height),
        resize: { width: file.info.width, height: file.info.height },
        lockAspect: true
      }
    })
    setFormat(defaultOutputFormat(file.info.format))
    setQuality(80)
    setFlattenColor('#ffffff')
    setMode('compare')
    setPreview(null)
    setError(null)
  }, [])

  const openFromDialog = async (): Promise<void> => {
    try {
      const file = await window.api.openWorkingImage()
      if (!file) return
      replaceSession(file)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const openFromDroppedFile = async (file: File): Promise<void> => {
    try {
      const working = await window.api.openWorkingImageFromFile(file)
      replaceSession(working)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    const prevent = (event: Event): void => {
      event.preventDefault()
    }
    const markInside = (): void => {
      insideAppDrag.current = true
    }
    const clearInside = (): void => {
      insideAppDrag.current = false
      setDragover(false)
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    window.addEventListener('dragstart', markInside)
    window.addEventListener('dragend', clearInside)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
      window.removeEventListener('dragstart', markInside)
      window.removeEventListener('dragend', clearInside)
    }
  }, [])

  const onDrop = async (event: DragEvent<HTMLElement>): Promise<void> => {
    event.preventDefault()
    setDragover(false)
    const fromInside = insideAppDrag.current
    insideAppDrag.current = false
    const file = event.dataTransfer.files[0]
    if (!shouldAcceptFileDrop(fromInside, event.dataTransfer.files.length) || !file) return
    await openFromDroppedFile(file)
  }

  useEffect(() => {
    if (!session || mode !== 'compare') return

    const handle = window.setTimeout(async () => {
      try {
        const result = await window.api.encode({
          sourcePath: session.file.path,
          crop: isFullCrop(session.crop, session.file.info.width, session.file.info.height)
            ? null
            : session.crop,
          resize: isIdentityResize(session.resize, session.crop.width, session.crop.height)
            ? null
            : session.resize,
          format,
          quality,
          flattenColor
        })
        setPreview(result)
        setError(null)
      } catch (err) {
        setError(errorMessage(err))
      }
    }, 200)

    return () => window.clearTimeout(handle)
  }, [session, mode, format, quality, flattenColor])

  const showFlatten = Boolean(session?.file.info.hasAlpha && format === 'jpeg')

  const exportFile = async (): Promise<void> => {
    if (!session || !preview) return
    try {
      await window.api.saveEncoded(
        suggestedExportName(session.file.path, format),
        preview.bytes,
        format
      )
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const fileName = useMemo(() => {
    if (!session) return ''
    return session.file.path.split(/[/\\]/).pop() ?? ''
  }, [session])

  const cropped = Boolean(
    session && !isFullCrop(session.crop, session.file.info.width, session.file.info.height)
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Image Optimizer</div>
        {session ? <div className="muted">{fileName}</div> : null}
        <div className="spacer" />
        <button type="button" className="btn" onClick={openFromDialog}>
          Choose File
        </button>
      </header>

      <main
        className="stage"
        onDragOver={(event) => {
          event.preventDefault()
          if (insideAppDrag.current) return
          if (!Array.from(event.dataTransfer.types).includes('Files')) return
          setDragover(true)
        }}
        onDragLeave={() => setDragover(false)}
        onDrop={onDrop}
      >
        {!session ? (
          <div className={`empty ${dragover ? 'dragover' : ''}`}>
            <h1>Drop an image</h1>
            <p>JPEG, PNG, WebP, BMP, or GIF. One file at a time.</p>
            <button type="button" className="btn btn-primary" onClick={openFromDialog}>
              Choose File
            </button>
          </div>
        ) : mode === 'crop' ? (
          <CropStage
            src={session.url}
            naturalWidth={session.file.info.width}
            naturalHeight={session.file.info.height}
            crop={session.crop}
            onChange={(crop) =>
              setSession((current) => (current ? applyCrop(current, crop) : current))
            }
          />
        ) : (
          <div className="compare">
            <section className="pane">
              <header>Original</header>
              <div className="body">
                <img src={session.url} alt="Original" draggable={false} />
              </div>
            </section>
            <section className="pane">
              <header>After export</header>
              <div className="body">
                {preview ? (
                  <EncodedPreview bytes={preview.bytes} format={format} />
                ) : (
                  <p>Encoding…</p>
                )}
              </div>
            </section>
            <aside className="controls">
              <label>
                Format
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as OutputFormat)}
                >
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
              <label>
                Quality {quality}
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                />
              </label>
              {showFlatten ? (
                <label>
                  Flatten color
                  <input
                    type="color"
                    value={flattenColor}
                    onChange={(event) => setFlattenColor(event.target.value)}
                  />
                </label>
              ) : null}
              <div className="resize">
                <div className="resize-fields">
                  <label>
                    Width
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={session.resize.width}
                      onChange={(event) => {
                        const width = parseDim(event.target.value)
                        if (width == null) return
                        setSession((current) => {
                          if (!current) return current
                          return {
                            ...current,
                            resize: current.lockAspect
                              ? scaleResizeFromWidth(width, current.crop.width, current.crop.height)
                              : { ...current.resize, width: clampPx(width) }
                          }
                        })
                      }}
                    />
                  </label>
                  <span className="resize-mul" aria-hidden="true">
                    ×
                  </span>
                  <label>
                    Height
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={session.resize.height}
                      onChange={(event) => {
                        const height = parseDim(event.target.value)
                        if (height == null) return
                        setSession((current) => {
                          if (!current) return current
                          return {
                            ...current,
                            resize: current.lockAspect
                              ? scaleResizeFromHeight(
                                  height,
                                  current.crop.width,
                                  current.crop.height
                                )
                              : { ...current.resize, height: clampPx(height) }
                          }
                        })
                      }}
                    />
                  </label>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={session.lockAspect}
                    onChange={(event) => {
                      const locked = event.target.checked
                      setSession((current) => {
                        if (!current) return current
                        return {
                          ...current,
                          lockAspect: locked,
                          resize: locked
                            ? scaleResizeFromWidth(
                                current.resize.width,
                                current.crop.width,
                                current.crop.height
                              )
                            : current.resize
                        }
                      })
                    }}
                  />
                  Lock aspect ratio
                </label>
                <div className="muted">
                  Source {session.crop.width} × {session.crop.height}
                </div>
              </div>
              <div>
                <div className="muted">Original size</div>
                <div className="size">{formatBytes(session.file.bytes.byteLength)}</div>
                <div className="muted">
                  {session.file.info.width} × {session.file.info.height}
                </div>
              </div>
              <div>
                <div className="muted">After export</div>
                <div className="size">{preview ? formatBytes(preview.byteLength) : '—'}</div>
                <div className="muted">
                  {preview ? `${preview.width} × ${preview.height}` : '—'}
                </div>
              </div>
              <button type="button" className="btn" onClick={() => setMode('crop')}>
                {cropped ? 'Edit crop' : 'Crop'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!preview}
                onClick={exportFile}
              >
                Export
              </button>
            </aside>
          </div>
        )}
      </main>

      <footer className="footer">
        {session && mode === 'crop' ? (
          <button
            type="button"
            className="btn"
            onClick={() =>
              setSession((current) =>
                current
                  ? applyCrop(current, fullCrop(current.file.info.width, current.file.info.height))
                  : current
              )
            }
          >
            Reset crop
          </button>
        ) : null}
        <span className="error">{error}</span>
        <span className="spacer" />
        <a className="credit" href="https://jawadlo.com" target="_blank" rel="noreferrer">
          Jawad Lotf · jawadlo.com
        </a>
        {session && mode === 'crop' ? (
          <button type="button" className="btn btn-primary" onClick={() => setMode('compare')}>
            Done
          </button>
        ) : null}
      </footer>
    </div>
  )
}

export default App
