import { useEffect, useRef, useState, type JSX, type PointerEvent } from 'react'
import type { CropRect } from './types'

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'move'

type Props = {
  src: string
  naturalWidth: number
  naturalHeight: number
  crop: CropRect
  onChange: (crop: CropRect) => void
}

type DragState = {
  handle: Handle
  startX: number
  startY: number
  origin: CropRect
}

function clampCrop(crop: CropRect, nw: number, nh: number): CropRect {
  const left = Math.max(0, Math.min(Math.round(crop.left), nw - 1))
  const top = Math.max(0, Math.min(Math.round(crop.top), nh - 1))
  const width = Math.max(1, Math.min(Math.round(crop.width), nw - left))
  const height = Math.max(1, Math.min(Math.round(crop.height), nh - top))
  return { left, top, width, height }
}

function applyDrag(drag: DragState, clientX: number, clientY: number, scale: number): CropRect {
  const dx = (clientX - drag.startX) / scale
  const dy = (clientY - drag.startY) / scale
  const origin = drag.origin
  const next = { ...origin }
  const handle = drag.handle

  if (handle === 'move') {
    next.left = origin.left + dx
    next.top = origin.top + dy
  }
  if (handle.includes('w')) {
    next.left = origin.left + dx
    next.width = origin.width - dx
  }
  if (handle.includes('e')) {
    next.width = origin.width + dx
  }
  if (handle.includes('n')) {
    next.top = origin.top + dy
    next.height = origin.height - dy
  }
  if (handle.includes('s')) {
    next.height = origin.height + dy
  }

  return next
}

export function CropStage({
  src,
  naturalWidth,
  naturalHeight,
  crop,
  onChange
}: Props): JSX.Element {
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const drag = useRef<DragState | null>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const update = (): void => {
      if (img.naturalWidth === 0) return
      setScale(img.clientWidth / img.naturalWidth)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(img)
    img.addEventListener('load', update)
    return () => {
      observer.disconnect()
      img.removeEventListener('load', update)
    }
  }, [src])

  const beginDrag = (handle: Handle, event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: crop
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag.current) return
    onChange(
      clampCrop(
        applyDrag(drag.current, event.clientX, event.clientY, scale),
        naturalWidth,
        naturalHeight
      )
    )
  }

  const onPointerUp = (): void => {
    drag.current = null
  }

  const handles: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

  return (
    <div className="crop-stage">
      <div className="crop-frame">
        <img ref={imgRef} src={src} alt="Working image" draggable={false} />
        <div
          className="crop-box"
          style={{
            left: crop.left * scale,
            top: crop.top * scale,
            width: crop.width * scale,
            height: crop.height * scale
          }}
          onPointerDown={(event) => beginDrag('move', event)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {handles.map((handle) => (
            <div
              key={handle}
              className={`handle ${handle}`}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginDrag(handle, event)
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
