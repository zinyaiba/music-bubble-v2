import type { BingoState } from '../../types'
import {
  BINGO_CARD_FONT_FAMILY,
  BINGO_CARD_SIZE,
  buildBingoCardRenderModel,
  resolveBingoTheme,
} from '../../utils/setlistBingoRenderModel'
import { renderBingoCardToCanvas } from './canvasRenderer'

export const PNG_MIME_TYPE = 'image/png' as const
export const DEFAULT_BINGO_PNG_FILENAME = 'setlist-bingo.png' as const

const MAX_FILENAME_STEM_LENGTH = 64
const UNSAFE_FILENAME_CHARACTERS = /[\p{Cc}\p{Cf}<>:"/\\|?*]/gu
const WINDOWS_RESERVED_FILENAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu

export type BingoPngErrorCode = 'canvas_unavailable' | 'png_blob_failed' | 'download_failed'

/** Error exposed by the PNG boundary without browser exceptions or bingo content. */
export class BingoPngError extends Error {
  readonly code: BingoPngErrorCode

  constructor(code: BingoPngErrorCode) {
    super(code)
    this.name = 'BingoPngError'
    this.code = code
  }
}

export interface PngGenerationDependencies {
  createCanvas: () => HTMLCanvasElement
  renderToCanvas: typeof renderBingoCardToCanvas
  /**
   * Ensures the shared card font is loaded before measuring/wrapping text, so
   * canvas line breaks match the DOM preview. Resolves quickly if unsupported.
   */
  ensureFontsReady: (sampleText: string) => Promise<void>
}

/** All glyphs the card will draw, so a subsetted font resolves before measuring. */
function collectCardText(state: BingoState): string {
  const parts = [state.performanceName, state.participantName ?? '', ...state.songTitles]
  return Array.from(new Set(Array.from(parts.join('')))).join('')
}

/** Preloads the bingo card fonts so canvas text metrics match the DOM. */
async function ensureBingoFontsReady(sampleText: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) {
    return
  }

  // Load against the actual card glyphs so a subsetted Noto Sans JP resolves the
  // exact characters measureText will use.
  const sample = `${sampleText}あ亜A0`

  try {
    await Promise.all([
      document.fonts.load(`700 52px ${BINGO_CARD_FONT_FAMILY}`, sample),
      document.fonts.load(`700 16px ${BINGO_CARD_FONT_FAMILY}`, sample),
    ])
    await document.fonts.ready
  } catch {
    // A font that will not load must not block PNG generation; fall back to
    // whatever metrics are available.
  }
}

export interface PngDownloadDependencies {
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  createAnchor: () => HTMLAnchorElement
  appendAnchor: (anchor: HTMLAnchorElement) => void
}

const DEFAULT_GENERATION_DEPENDENCIES: PngGenerationDependencies = {
  createCanvas: () => document.createElement('canvas'),
  renderToCanvas: renderBingoCardToCanvas,
  ensureFontsReady: ensureBingoFontsReady,
}

const DEFAULT_DOWNLOAD_DEPENDENCIES: PngDownloadDependencies = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => document.createElement('a'),
  appendAnchor: (anchor) => document.body.appendChild(anchor),
}

function safeFilenameStem(rawValue: string): string {
  const cleaned = rawValue
    .trim()
    .replace(UNSAFE_FILENAME_CHARACTERS, '-')
    .replace(/\s+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^[.\s-]+|[.\s-]+$/gu, '')
  const shortened = Array.from(cleaned).slice(0, MAX_FILENAME_STEM_LENGTH).join('')

  if (!shortened || WINDOWS_RESERVED_FILENAME.test(shortened)) {
    return ''
  }

  return shortened
}

/** Creates a short, path-safe PNG filename without changing displayed content. */
export function createBingoPngFilename(performanceName: string): string {
  const performanceStem = safeFilenameStem(performanceName)
  if (!performanceStem) {
    return DEFAULT_BINGO_PNG_FILENAME
  }

  return `${performanceStem}-setlist-bingo.png`
}

function sanitizePngFilename(filename: string): string {
  const filenameWithoutExtension = filename.replace(/\.png$/iu, '')
  const stem = safeFilenameStem(filenameWithoutExtension)
  return stem ? `${stem}.png` : DEFAULT_BINGO_PNG_FILENAME
}

function pngError(code: BingoPngErrorCode): BingoPngError {
  return new BingoPngError(code)
}

/**
 * Draws a valid bingo state to a fixed 1080-square canvas and encodes it as PNG.
 * Browser exceptions and input content never cross this adapter boundary.
 */
export async function generateBingoPng(
  state: BingoState,
  rootStyle: CSSStyleDeclaration,
  dependencies: PngGenerationDependencies = DEFAULT_GENERATION_DEPENDENCIES
): Promise<Blob> {
  let canvas: HTMLCanvasElement
  let context: CanvasRenderingContext2D | null

  try {
    canvas = dependencies.createCanvas()
    canvas.width = BINGO_CARD_SIZE
    canvas.height = BINGO_CARD_SIZE
    context = canvas.getContext('2d')
  } catch {
    throw pngError('canvas_unavailable')
  }

  if (!context) {
    throw pngError('canvas_unavailable')
  }

  await dependencies.ensureFontsReady(collectCardText(state))

  try {
    const theme = resolveBingoTheme(state.designId, rootStyle)
    const model = buildBingoCardRenderModel(state, theme)
    dependencies.renderToCanvas(context, model)
  } catch {
    throw pngError('png_blob_failed')
  }

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob || blob.type !== PNG_MIME_TYPE) {
          reject(pngError('png_blob_failed'))
          return
        }

        resolve(blob)
      }, PNG_MIME_TYPE)
    } catch {
      reject(pngError('png_blob_failed'))
    }
  })
}

/**
 * Starts exactly one browser download and always attempts anchor cleanup and
 * Object URL revocation before returning.
 */
export function downloadPng(
  blob: Blob,
  filename: string,
  dependencies: PngDownloadDependencies = DEFAULT_DOWNLOAD_DEPENDENCIES
): void {
  if (blob.type !== PNG_MIME_TYPE) {
    throw pngError('download_failed')
  }

  let objectUrl: string | undefined
  let anchor: HTMLAnchorElement | undefined
  let failed = false

  try {
    objectUrl = dependencies.createObjectURL(blob)
    anchor = dependencies.createAnchor()
    anchor.href = objectUrl
    anchor.download = sanitizePngFilename(filename)
    anchor.hidden = true
    dependencies.appendAnchor(anchor)
    anchor.click()
  } catch {
    failed = true
  } finally {
    if (anchor) {
      try {
        anchor.remove()
      } catch {
        failed = true
      }
    }

    if (objectUrl !== undefined) {
      try {
        dependencies.revokeObjectURL(objectUrl)
      } catch {
        failed = true
      }
    }
  }

  if (failed) {
    throw pngError('download_failed')
  }
}
