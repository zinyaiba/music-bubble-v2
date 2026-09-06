import { DEFAULT_BINGO_DESIGN_ID, type BingoDesignId, type BingoState } from '../types'
import { indexToGridCoordinate } from './setlistBingoGrid'
import { contrastRatio } from './wcagContrast'

/** Fixed pixel size shared by the DOM adapter and PNG canvas adapter. */
export const BINGO_CARD_SIZE = 1080 as const
export const MIN_CARD_TEXT_CONTRAST = 4.5 as const

export type DesignTokenName =
  | '--color-primary-light'
  | '--color-primary-dark'
  | '--color-secondary-light'
  | '--color-secondary-dark'
  | '--color-background'
  | '--color-background-light'
  | '--color-surface'
  | '--color-text'

export interface BingoDesignDefinition {
  id: BingoDesignId
  label: string
  tokens: {
    cardBackground: DesignTokenName
    cardBorder: DesignTokenName
    headingBackground: DesignTokenName
    headingText: DesignTokenName
    cellBackgrounds: readonly DesignTokenName[]
    cellText: DesignTokenName
    gridBorder: DesignTokenName
  }
}

/**
 * The complete design registry. Definitions contain Design System token names
 * only; raw color values are kept exclusively in the token fallback table.
 */
export const BINGO_DESIGNS = [
  {
    id: 'rose-bubble',
    label: 'ローズバブル',
    tokens: {
      cardBackground: '--color-surface',
      cardBorder: '--color-primary-dark',
      headingBackground: '--color-primary-light',
      headingText: '--color-text',
      cellBackgrounds: ['--color-surface', '--color-background-light'],
      cellText: '--color-text',
      gridBorder: '--color-primary-dark',
    },
  },
  {
    id: 'violet-ribbon',
    label: 'バイオレットリボン',
    tokens: {
      cardBackground: '--color-background-light',
      cardBorder: '--color-secondary-dark',
      headingBackground: '--color-secondary-light',
      headingText: '--color-text',
      cellBackgrounds: ['--color-background-light', '--color-surface'],
      cellText: '--color-text',
      gridBorder: '--color-secondary-dark',
    },
  },
  {
    id: 'duo-pop',
    label: 'デュオポップ',
    tokens: {
      cardBackground: '--color-background',
      cardBorder: '--color-text',
      headingBackground: '--color-primary-light',
      headingText: '--color-text',
      cellBackgrounds: ['--color-primary-light', '--color-secondary-light'],
      cellText: '--color-text',
      gridBorder: '--color-text',
    },
  },
] as const satisfies readonly BingoDesignDefinition[]

/** Values mirror src/styles/variables.css and keep canvas rendering deterministic. */
export const BINGO_DESIGN_TOKEN_FALLBACKS: Readonly<Record<DesignTokenName, string>> = {
  '--color-primary-light': '#f9a8d4',
  '--color-primary-dark': '#ec4899',
  '--color-secondary-light': '#c4b5fd',
  '--color-secondary-dark': '#8b5cf6',
  '--color-background': '#fdf2f8',
  '--color-background-light': '#fce7f3',
  '--color-surface': '#fff1f5',
  '--color-text': '#831843',
}

const DESIGN_BY_ID = new Map<BingoDesignId, BingoDesignDefinition>(
  BINGO_DESIGNS.map((design) => [design.id, design])
)

export const DEFAULT_BINGO_DESIGN = DESIGN_BY_ID.get(DEFAULT_BINGO_DESIGN_ID)!

export interface ResolvedBingoTheme {
  id: BingoDesignId
  cardBackground: string
  cardBorder: string
  headingBackground: string
  headingText: string
  cellBackgrounds: readonly string[]
  cellText: string
  gridBorder: string
}

function getDesignDefinition(designId: BingoDesignId): BingoDesignDefinition {
  return DESIGN_BY_ID.get(designId) ?? DEFAULT_BINGO_DESIGN
}

function resolveToken(token: DesignTokenName, rootStyle: CSSStyleDeclaration): string {
  return rootStyle.getPropertyValue(token).trim() || BINGO_DESIGN_TOKEN_FALLBACKS[token]
}

/** Resolves one registry entry for both DOM and Canvas consumers. */
export function resolveBingoTheme(
  designId: BingoDesignId,
  rootStyle: CSSStyleDeclaration
): ResolvedBingoTheme {
  const { id, tokens } = getDesignDefinition(designId)

  return {
    id,
    cardBackground: resolveToken(tokens.cardBackground, rootStyle),
    cardBorder: resolveToken(tokens.cardBorder, rootStyle),
    headingBackground: resolveToken(tokens.headingBackground, rootStyle),
    headingText: resolveToken(tokens.headingText, rootStyle),
    cellBackgrounds: tokens.cellBackgrounds.map((token) => resolveToken(token, rootStyle)),
    cellText: resolveToken(tokens.cellText, rootStyle),
    gridBorder: resolveToken(tokens.gridBorder, rootStyle),
  }
}

export interface BingoThemeContrast {
  heading: number
  cells: readonly number[]
  minimum: number
  meetsWcagAA: boolean
}

/** Uses the existing WCAG helper so design validation has one contrast algorithm. */
export function calculateBingoThemeContrast(theme: ResolvedBingoTheme): BingoThemeContrast {
  const heading = contrastRatio(theme.headingText, theme.headingBackground)
  const cells = theme.cellBackgrounds.map((background) => contrastRatio(theme.cellText, background))
  const minimum = Math.min(heading, ...cells)

  return {
    heading,
    cells,
    minimum,
    meetsWcagAA: minimum >= MIN_CARD_TEXT_CONTRAST,
  }
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface TextBlock {
  text: string
  rect: Rect
  horizontalAlign: 'center'
  verticalAlign: 'middle'
  fontWeight: 700
  /**
   * Fixed font size in canvas pixels, mirroring the CSS `clamp()` result.
   * The canvas renderer wraps at this size and never shrinks, so the PNG
   * matches the DOM preview's font size and line breaks.
   */
  fontSize: number
  fontFamily: string
  lineHeight: number
}

export interface BingoCellRenderModel {
  index: number
  row: number
  column: number
  rect: Rect
  background: string
  text: TextBlock
}

/** One text line stacked vertically and centered inside the header, like the DOM flex column. */
export interface HeadingLine {
  text: string
  fontWeight: 700
  fontFamily: string
  fontSize: number
  lineHeight: number
}

/**
 * Header content laid out as a centered vertical stack, mirroring the DOM
 * `.bingo-card__heading` flex column so multi-line titles or names do not clip.
 */
export interface BingoHeadingRenderModel {
  rect: Rect
  /** Max text width for wrapping, matching the DOM heading horizontal padding. */
  contentWidth: number
  /** Vertical gap between stacked lines, matching the DOM heading `gap`. */
  gap: number
  lines: readonly HeadingLine[]
}

export interface BingoCardRenderModel {
  width: typeof BINGO_CARD_SIZE
  height: typeof BINGO_CARD_SIZE
  headerRect: Rect
  gridRect: Rect
  heading: BingoHeadingRenderModel
  cells: readonly BingoCellRenderModel[]
  theme: ResolvedBingoTheme
}

const HEADER_RECT: Rect = { x: 48, y: 48, width: 984, height: 144 }
const GRID_RECT: Rect = { x: 132, y: 216, width: 816, height: 816 }

/**
 * Font stack shared with the DOM card (`--font-family` in variables.css) so the
 * PNG uses identical glyph metrics and therefore identical line breaks.
 */
export const BINGO_CARD_FONT_FAMILY =
  "'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

// The 1080px canvas mirrors BingoCard.css. Container query units (cqi) resolve
// against the card's content box: 1080 - 4.444444% padding * 2 - 3px border * 2.
const CARD_PADDING = 48
const CARD_BORDER_WIDTH = 3
const CARD_CONTENT_SIZE = BINGO_CARD_SIZE - CARD_PADDING * 2 - CARD_BORDER_WIDTH * 2
const ONE_CQI = CARD_CONTENT_SIZE / 100

/** Root font size (1rem) used to resolve the rem bounds of each CSS `clamp()`. */
const ROOT_FONT_SIZE = 16

/** Mirrors CSS `clamp(min, preferred, max)` with px inputs. */
function clampFontSize(minRem: number, cqiFactor: number, maxRem: number): number {
  const preferred = cqiFactor * ONE_CQI
  return Math.min(maxRem * ROOT_FONT_SIZE, Math.max(minRem * ROOT_FONT_SIZE, preferred))
}

/** .bingo-card__cell: clamp(0.375rem, 9cqi / grid-size, 3.25rem). */
function getCellFontSize(gridSize: BingoState['gridSize']): number {
  return clampFontSize(0.375, 9 / gridSize, 3.25)
}

/** .bingo-card__cell padding: clamp(2px, 1.4cqi, 16px). */
function getCellTextInset(): number {
  return Math.min(16, Math.max(2, 1.4 * ONE_CQI))
}

interface HeadingFontSpec {
  fontSize: number
  lineHeight: number
}

/**
 * Resolves the heading font size and line-height exactly like BingoCard.css,
 * including the length-based (`--long` / `--very-long`) and participant-name
 * modifiers, so the title wraps at the same size in the PNG.
 */
function getHeadingFontSpec(title: string, hasParticipant: boolean): HeadingFontSpec {
  const length = Array.from(title).length
  const isVeryLong = length > 48
  const isLong = length > 24

  if (hasParticipant) {
    if (isVeryLong) return { fontSize: clampFontSize(0.4, 1.7, 1.125), lineHeight: 1.05 }
    if (isLong) return { fontSize: clampFontSize(0.45, 2.7, 2), lineHeight: 1.05 }
    return { fontSize: clampFontSize(0.5, 3.6, 2.75), lineHeight: 1.05 }
  }

  if (isVeryLong) return { fontSize: clampFontSize(0.5, 1.9, 1.25), lineHeight: 1.05 }
  if (isLong) return { fontSize: clampFontSize(0.5, 3.2, 2), lineHeight: 1.15 }
  return { fontSize: clampFontSize(0.625, 5, 3.375), lineHeight: 1.15 }
}

/** .bingo-card__participant-name: clamp(0.4rem, 2.2cqi, 1.5rem). */
function getParticipantFontSize(): number {
  return clampFontSize(0.4, 2.2, 1.5)
}

function insetRect(rect: Rect, inset: number): Rect {
  return {
    x: rect.x + inset,
    y: rect.y + inset,
    width: rect.width - inset * 2,
    height: rect.height - inset * 2,
  }
}

/**
 * Builds the single render contract used by the screen card and the PNG renderer.
 * Text is retained verbatim; wrapping and font fitting are adapter responsibilities.
 */
export function buildBingoCardRenderModel(
  state: BingoState,
  theme: ResolvedBingoTheme
): BingoCardRenderModel {
  const cellSize = GRID_RECT.width / state.gridSize
  const textInset = getCellTextInset()
  const cellFontSize = getCellFontSize(state.gridSize)
  const headingSpec = getHeadingFontSpec(state.performanceName, Boolean(state.participantName))
  const cells = state.songTitles.map((songTitle, index) => {
    const coordinate = indexToGridCoordinate(index, state.gridSize)
    if (!coordinate) {
      throw new RangeError(`Song index ${index} is outside the bingo grid`)
    }

    const rect: Rect = {
      x: GRID_RECT.x + coordinate.column * cellSize,
      y: GRID_RECT.y + coordinate.row * cellSize,
      width: cellSize,
      height: cellSize,
    }

    return {
      index,
      row: coordinate.row,
      column: coordinate.column,
      rect,
      background:
        theme.cellBackgrounds[(coordinate.row + coordinate.column) % theme.cellBackgrounds.length],
      text: {
        text: songTitle,
        rect: insetRect(rect, textInset),
        horizontalAlign: 'center',
        verticalAlign: 'middle',
        fontWeight: 700,
        fontSize: cellFontSize,
        fontFamily: BINGO_CARD_FONT_FAMILY,
        lineHeight: 1.2,
      },
    } satisfies BingoCellRenderModel
  })

  const headingLines: HeadingLine[] = [
    {
      text: state.performanceName,
      fontWeight: 700,
      fontFamily: BINGO_CARD_FONT_FAMILY,
      fontSize: headingSpec.fontSize,
      lineHeight: headingSpec.lineHeight,
    },
  ]
  if (state.participantName) {
    headingLines.push({
      text: state.participantName,
      fontWeight: 700,
      fontFamily: BINGO_CARD_FONT_FAMILY,
      fontSize: getParticipantFontSize(),
      lineHeight: 1.05,
    })
  }

  return {
    width: BINGO_CARD_SIZE,
    height: BINGO_CARD_SIZE,
    headerRect: { ...HEADER_RECT },
    gridRect: { ...GRID_RECT },
    heading: {
      rect: { ...HEADER_RECT },
      // .bingo-card__heading horizontal padding is 2.439024% of the header width,
      // plus its 2px (--border-width-normal) border on each side.
      contentWidth: HEADER_RECT.width - HEADER_RECT.width * 0.02439024 * 2 - 2 * 2,
      // .bingo-card__heading--with-participant gap: clamp(1px, 0.5cqi, 6px).
      gap: state.participantName ? Math.min(6, Math.max(1, 0.5 * ONE_CQI)) : 0,
      lines: headingLines,
    },
    cells,
    theme,
  }
}
