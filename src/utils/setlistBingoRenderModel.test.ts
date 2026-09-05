import { describe, expect, it } from 'vitest'
import {
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  GRID_SIZES,
  type BingoDesignId,
  type BingoState,
  type GridSize,
} from '../types'
import {
  BINGO_CARD_SIZE,
  BINGO_DESIGNS,
  BINGO_DESIGN_TOKEN_FALLBACKS,
  DEFAULT_BINGO_DESIGN,
  MIN_CARD_TEXT_CONTRAST,
  buildBingoCardRenderModel,
  calculateBingoThemeContrast,
  resolveBingoTheme,
  type BingoDesignDefinition,
  type DesignTokenName,
} from './setlistBingoRenderModel'
import { contrastRatio } from './wcagContrast'

function createState(gridSize: GridSize, designId: BingoDesignId): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: `${gridSize}×${gridSize} テスト公演`,
    gridSize,
    songTitles: Array.from(
      { length: gridSize * gridSize },
      (_, index) => `予想曲 ${index + 1}`,
    ),
    designId,
  }
}

function createRootStyle(
  values: Partial<Record<DesignTokenName, string>> = {},
): CSSStyleDeclaration {
  return {
    getPropertyValue: (token: string) => values[token as DesignTokenName] ?? '',
  } as CSSStyleDeclaration
}

function getDeclaredTokens(design: BingoDesignDefinition): DesignTokenName[] {
  return [
    design.tokens.cardBackground,
    design.tokens.cardBorder,
    design.tokens.headingBackground,
    design.tokens.headingText,
    ...design.tokens.cellBackgrounds,
    design.tokens.cellText,
    design.tokens.gridBorder,
  ]
}

describe('setlist bingo design registry', () => {
  it('declares the three stable Design System based variants and the default', () => {
    expect(BINGO_DESIGNS.map(({ id }) => id)).toEqual([
      'rose-bubble',
      'violet-ribbon',
      'duo-pop',
    ])
    expect(new Set(BINGO_DESIGNS.map(({ id }) => id)).size).toBe(3)
    expect(DEFAULT_BINGO_DESIGN.id).toBe(DEFAULT_BINGO_DESIGN_ID)

    for (const design of BINGO_DESIGNS) {
      for (const token of getDeclaredTokens(design)) {
        expect(token).toMatch(/^--color-/)
        expect(BINGO_DESIGN_TOKEN_FALLBACKS[token]).toMatch(/^#[0-9a-f]{6}$/i)
      }
    }
  })
})

describe('resolveBingoTheme', () => {
  it('resolves CSS custom properties for every theme field', () => {
    const values: Record<DesignTokenName, string> = {
      '--color-primary-light': 'rgb(1, 2, 3)',
      '--color-primary-dark': 'rgb(4, 5, 6)',
      '--color-secondary-light': 'rgb(7, 8, 9)',
      '--color-secondary-dark': 'rgb(10, 11, 12)',
      '--color-background': 'rgb(13, 14, 15)',
      '--color-background-light': 'rgb(16, 17, 18)',
      '--color-surface': 'rgb(19, 20, 21)',
      '--color-text': 'rgb(22, 23, 24)',
    }

    expect(resolveBingoTheme('duo-pop', createRootStyle(values))).toEqual({
      id: 'duo-pop',
      cardBackground: values['--color-background'],
      cardBorder: values['--color-text'],
      headingBackground: values['--color-primary-light'],
      headingText: values['--color-text'],
      cellBackgrounds: [
        values['--color-primary-light'],
        values['--color-secondary-light'],
      ],
      cellText: values['--color-text'],
      gridBorder: values['--color-text'],
    })
  })

  it.each(BINGO_DESIGNS)(
    'uses deterministic token fallbacks when $id CSS values are missing or blank',
    (design) => {
      const theme = resolveBingoTheme(
        design.id,
        createRootStyle({ [design.tokens.cardBackground]: '   ' }),
      )

      expect(theme.id).toBe(design.id)
      expect(theme.cardBackground).toBe(
        BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.cardBackground],
      )
      expect(theme.cardBorder).toBe(
        BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.cardBorder],
      )
      expect(theme.headingBackground).toBe(
        BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.headingBackground],
      )
      expect(theme.headingText).toBe(
        BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.headingText],
      )
      expect(theme.cellBackgrounds).toEqual(
        design.tokens.cellBackgrounds.map(
          (token) => BINGO_DESIGN_TOKEN_FALLBACKS[token],
        ),
      )
      expect(theme.cellText).toBe(BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.cellText])
      expect(theme.gridBorder).toBe(
        BINGO_DESIGN_TOKEN_FALLBACKS[design.tokens.gridBorder],
      )
    },
  )
})

describe('buildBingoCardRenderModel', () => {
  for (const design of BINGO_DESIGNS) {
    for (const gridSize of GRID_SIZES) {
      it(`builds a 1080 square row-major ${gridSize}x${gridSize} ${design.id} model`, () => {
        const state = createState(gridSize, design.id)
        const theme = resolveBingoTheme(design.id, createRootStyle())
        const model = buildBingoCardRenderModel(state, theme)
        const cellSize = model.gridRect.width / gridSize

        expect(model.width).toBe(BINGO_CARD_SIZE)
        expect(model.height).toBe(BINGO_CARD_SIZE)
        expect(model.theme).toBe(theme)
        expect(model.theme.id).toBe(state.designId)
        expect(model.title.text).toBe(state.performanceName)
        expect(model.cells).toHaveLength(gridSize * gridSize)
        expect(model.cells.map((cell) => cell.text.text)).toEqual(state.songTitles)

        model.cells.forEach((cell, index) => {
          const row = Math.floor(index / gridSize)
          const column = index % gridSize

          expect(cell.index).toBe(index)
          expect(cell.row).toBe(row)
          expect(cell.column).toBe(column)
          expect(cell.rect).toEqual({
            x: model.gridRect.x + column * cellSize,
            y: model.gridRect.y + row * cellSize,
            width: cellSize,
            height: cellSize,
          })
          expect(cell.background).toBe(
            theme.cellBackgrounds[(row + column) % theme.cellBackgrounds.length],
          )
        })
      })
    }
  }

  it('adds a participant name text block only when a name exists', () => {
    const unnamedState = createState(3, 'rose-bubble')
    const theme = resolveBingoTheme(unnamedState.designId, createRootStyle())
    const unnamedModel = buildBingoCardRenderModel(unnamedState, theme)
    const namedModel = buildBingoCardRenderModel(
      { ...unnamedState, participantName: '<b>参加者</b> 🎤' },
      theme,
    )

    expect(unnamedModel.participantName).toBeUndefined()
    expect(namedModel.participantName?.text).toBe('名前：<b>参加者</b> 🎤')
    expect(namedModel.title.text).toBe(unnamedState.performanceName)
    expect(namedModel.title.rect.height).toBeLessThan(unnamedModel.title.rect.height)
  })

  it('retains the complete maximum-length performance name and every song title', () => {
    const performanceName = `🎤${'公'.repeat(78)}演`
    const songTitles = Array.from(
      { length: 16 },
      (_, index) => `${index.toString().padStart(2, '0')}${'曲'.repeat(48)}`,
    )
    const state: BingoState = {
      schemaVersion: BINGO_SCHEMA_VERSION,
      performanceName,
      gridSize: 4,
      songTitles,
      designId: 'violet-ribbon',
    }
    const model = buildBingoCardRenderModel(
      state,
      resolveBingoTheme(state.designId, createRootStyle()),
    )

    expect(model.title.text).toBe(performanceName)
    expect(Array.from(model.title.text)).toHaveLength(80)
    expect(model.cells.map((cell) => cell.text.text)).toEqual(songTitles)
    expect(model.cells.every((cell) => Array.from(cell.text.text).length === 50)).toBe(true)
  })
})

describe('calculateBingoThemeContrast', () => {
  it.each(BINGO_DESIGNS)('$id meets 4.5:1 for every declared text pair', (design) => {
    const theme = resolveBingoTheme(design.id, createRootStyle())
    const result = calculateBingoThemeContrast(theme)

    expect(result.heading).toBe(
      contrastRatio(theme.headingText, theme.headingBackground),
    )
    expect(result.cells).toEqual(
      theme.cellBackgrounds.map((background) =>
        contrastRatio(theme.cellText, background),
      ),
    )
    expect(result.minimum).toBeGreaterThanOrEqual(MIN_CARD_TEXT_CONTRAST)
    expect(result.meetsWcagAA).toBe(true)
  })

  it('reports a failing resolved text pair through the shared WCAG calculation', () => {
    const theme = resolveBingoTheme(
      'rose-bubble',
      createRootStyle({
        '--color-text': '#ffffff',
        '--color-primary-light': '#ffffff',
        '--color-surface': '#ffffff',
        '--color-background-light': '#ffffff',
      }),
    )

    expect(calculateBingoThemeContrast(theme)).toMatchObject({
      minimum: 1,
      meetsWcagAA: false,
    })
  })
})
