/**
 * WCAG 2.1 コントラスト計算ユーティリティ
 * Music Bubble Explorer V2
 *
 * テキスト色と背景色のコントラスト比を WCAG 2.1 定義で算出する純粋関数群。
 * DOM / React に依存しない。プロパティテストや将来のトークン検証で使用する。
 *
 * 参考: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** RGB チャンネル値（0〜255）の組 */
interface Rgb {
  r: number
  g: number
  b: number
}

/**
 * `#RRGGBB` / `#RGB` / `rgb()` / `rgba()` 形式の色文字列を RGB チャンネルへ解釈する。
 * 解釈できない場合は例外を投げる。
 */
function parseColor(color: string): Rgb {
  const value = color.trim()

  // #RGB / #RRGGBB 形式
  if (value.startsWith('#')) {
    const hex = value.slice(1)

    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      if ([r, g, b].some(Number.isNaN)) {
        throw new Error(`Invalid hex color: ${color}`)
      }
      return { r, g, b }
    }

    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      if ([r, g, b].some(Number.isNaN)) {
        throw new Error(`Invalid hex color: ${color}`)
      }
      return { r, g, b }
    }

    throw new Error(`Invalid hex color: ${color}`)
  }

  // rgb() / rgba() 形式
  const rgbMatch = value.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*[\d.]+\s*)?\)$/i,
  )
  if (rgbMatch) {
    const r = Number(rgbMatch[1])
    const g = Number(rgbMatch[2])
    const b = Number(rgbMatch[3])
    if ([r, g, b].some((c) => Number.isNaN(c) || c < 0 || c > 255)) {
      throw new Error(`Invalid rgb color: ${color}`)
    }
    return { r, g, b }
  }

  throw new Error(`Unsupported color format: ${color}`)
}

/**
 * sRGB の 1 チャンネル（0〜255）を WCAG 2.1 定義で線形化する。
 */
function linearizeChannel(channel255: number): number {
  const c = channel255 / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/**
 * 色（`#RRGGBB` / `#RGB` / `rgb()` / `rgba()` 形式）を受け取り、
 * WCAG 2.1 定義の相対輝度（0.0〜1.0）を返す。
 */
export function relativeLuminance(color: string): number {
  const { r, g, b } = parseColor(color)
  const R = linearizeChannel(r)
  const G = linearizeChannel(g)
  const B = linearizeChannel(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/**
 * 2 色間のコントラスト比（1.0〜21.0）を WCAG 2.1 定義で返す。
 * (L_lighter + 0.05) / (L_darker + 0.05)
 */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground)
  const l2 = relativeLuminance(background)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
