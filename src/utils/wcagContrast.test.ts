import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio } from './wcagContrast'

describe('relativeLuminance', () => {
  it('returns 0 for black (#000000)', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
  })

  it('returns 1 for white (#ffffff)', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('parses shorthand hex (#fff == #ffffff)', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#ffffff'), 5)
  })

  it('parses rgb() form (rgb(0,0,0) == #000000)', () => {
    expect(relativeLuminance('rgb(0, 0, 0)')).toBeCloseTo(relativeLuminance('#000000'), 5)
  })

  it('parses rgba() form (rgba(255,255,255,0.5) == #ffffff)', () => {
    expect(relativeLuminance('rgba(255, 255, 255, 0.5)')).toBeCloseTo(1, 5)
  })

  it('throws on an unsupported color format', () => {
    expect(() => relativeLuminance('not-a-color')).toThrow()
  })
})

describe('contrastRatio', () => {
  it('returns 21 for black vs white (max contrast)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 4)
  })

  it('is symmetric with respect to foreground/background order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#000000'),
      5,
    )
  })

  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('returns a value within the range 1.0 to 21.0', () => {
    const ratio = contrastRatio('#1565c0', '#ffffff')
    expect(ratio).toBeGreaterThanOrEqual(1)
    expect(ratio).toBeLessThanOrEqual(21)
  })
})
