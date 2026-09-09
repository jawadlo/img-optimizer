import { describe, expect, it } from 'vitest'
import {
  isIdentityResize,
  scaleResizeFromHeight,
  scaleResizeFromWidth,
  sizeFromLockedHeight,
  sizeFromLockedWidth,
  shouldAcceptFileDrop
} from './types'

describe('sizeFromLockedWidth', () => {
  it('keeps the current aspect ratio when width changes', () => {
    expect(sizeFromLockedWidth(1280, 1920 / 1080)).toEqual({ width: 1280, height: 720 })
  })

  it('keeps at least 1px on both sides for extreme ratios', () => {
    expect(sizeFromLockedWidth(1, 100)).toEqual({ width: 1, height: 1 })
  })
})

describe('sizeFromLockedHeight', () => {
  it('keeps the current aspect ratio when height changes', () => {
    expect(sizeFromLockedHeight(720, 1920 / 1080)).toEqual({ width: 1280, height: 720 })
  })
})

describe('scaleResizeFromWidth', () => {
  it('scales height by the same percentage as width against the source', () => {
    expect(scaleResizeFromWidth(300, 600, 300)).toEqual({ width: 300, height: 150 })
  })
})

describe('scaleResizeFromHeight', () => {
  it('scales width by the same percentage as height against the source', () => {
    expect(scaleResizeFromHeight(150, 600, 300)).toEqual({ width: 300, height: 150 })
  })
})

describe('isIdentityResize', () => {
  it('is true only when both dimensions match the source', () => {
    expect(isIdentityResize({ width: 4, height: 2 }, 4, 2)).toBe(true)
    expect(isIdentityResize({ width: 8, height: 2 }, 4, 2)).toBe(false)
  })
})

describe('shouldAcceptFileDrop', () => {
  it('rejects drops that started inside the app', () => {
    expect(shouldAcceptFileDrop(true, 1)).toBe(false)
  })

  it('accepts an OS file drop with at least one file', () => {
    expect(shouldAcceptFileDrop(false, 1)).toBe(true)
  })
})
