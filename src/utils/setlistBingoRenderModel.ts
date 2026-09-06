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
  maxFontSize: number
  minFontSize: number
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

export interface BingoCardRenderModel {
  width: typeof BINGO_CARD_SIZE
  height: typeof BINGO_CARD_SIZE
  headerRect: Rect
  gridRect: Rect
  title: TextBlock
  participantName?: TextBlock
  cells: readonly BingoCellRenderModel[]
  theme: ResolvedBingoTheme
}

const HEADER_RECT: Rect = { x: 48, y: 48, width: 984, height: 144 }
const GRID_RECT: Rect = { x: 132, y: 216, width: 816, height: 816 }

// Keep the 1080px canvas proportional to BingoCard.css. Container query units
// use the card's content box after 4.444444% padding and the 3px border:
// font-size: clamp(6px, 9cqi / grid-size, 52px)
// padding: clamp(2px, 1.4cqi, 16px)
const CARD_PADDING = 48
const CARD_BORDER_WIDTH = 3
const CARD_CONTENT_SIZE = BINGO_CARD_SIZE - CARD_PADDING * 2 - CARD_BORDER_WIDTH * 2
const CELL_FONT_SIZE_RATIO = 0.09
const CELL_FONT_SIZE_MAX = 52
const CELL_FONT_SIZE_MIN = 6
const CELL_TEXT_INSET_RATIO = 0.014
const CELL_TEXT_INSET_MIN = 2
const CELL_TEXT_INSET_MAX = 16

function getCellFontSize(gridSize: BingoState['gridSize']): number {
  return Math.min(
    CELL_FONT_SIZE_MAX,
    Math.round((CARD_CONTENT_SIZE * CELL_FONT_SIZE_RATIO) / gridSize)
  )
}

function getCellTextInset(): number {
  return Math.min(
    CELL_TEXT_INSET_MAX,
    Math.max(CELL_TEXT_INSET_MIN, CARD_CONTENT_SIZE * CELL_TEXT_INSET_RATIO)
  )
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
        maxFontSize: cellFontSize,
        minFontSize: CELL_FONT_SIZE_MIN,
        lineHeight: 1.2,
      },
    } satisfies BingoCellRenderModel
  })

  return {
    width: BINGO_CARD_SIZE,
    height: BINGO_CARD_SIZE,
    headerRect: { ...HEADER_RECT },
    gridRect: { ...GRID_RECT },
    title: {
      text: state.performanceName,
      rect: state.participantName
        ? { x: 72, y: 60, width: 936, height: 76 }
        : insetRect(HEADER_RECT, 24),
      horizontalAlign: 'center',
      verticalAlign: 'middle',
      fontWeight: 700,
      maxFontSize: state.participantName ? 44 : 54,
      minFontSize: state.participantName ? 18 : 20,
      lineHeight: 1.15,
    },
    ...(state.participantName
      ? {
          participantName: {
            text: `名前：${state.participantName}`,
            rect: { x: 72, y: 140, width: 936, height: 36 },
            horizontalAlign: 'center' as const,
            verticalAlign: 'middle' as const,
            fontWeight: 700 as const,
            maxFontSize: 28,
            minFontSize: 14,
            lineHeight: 1.1,
          },
        }
      : {}),
    cells,
    theme,
  }
}
