/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BINGO_DESIGNS,
  MIN_CARD_TEXT_CONTRAST,
  calculateBingoThemeContrast,
  resolveBingoTheme,
} from '../utils/setlistBingoRenderModel'
import { contrastRatio } from '../utils/wcagContrast'

const readSource = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

const createCss = readSource('src/pages/SetlistBingoCreatePage.css')
const previewCss = readSource('src/pages/SetlistBingoPreviewPage.css')
const cardCss = readSource('src/components/setlist-bingo/BingoCard.css')
const designPickerCss = readSource(
  'src/components/setlist-bingo/BingoDesignPicker.css',
)
const predictionGridCss = readSource(
  'src/components/setlist-bingo/PredictionSongGrid.css',
)
const comboboxCss = readSource(
  'src/components/setlist-bingo/SongTitleCombobox.css',
)
const gridDialogCss = readSource(
  'src/components/setlist-bingo/GridShrinkDialog.css',
)
const variablesCss = readSource('src/styles/variables.css')

function readHexToken(token: string): string {
  const match = variablesCss.match(
    new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(#[0-9a-f]{6})`, 'i'),
  )
  if (!match?.[1]) throw new Error(`Missing hex Design System token: ${token}`)
  return match[1]
}

describe('setlist bingo responsive and accessibility CSS contract', () => {
  it('centers both page contents at width 100% and max-width 800px', () => {
    const centeredContentContract = [
      'width: 100%;',
      'max-width: 800px;',
      'min-width: 0;',
      'margin: 0 auto;',
    ]

    for (const declaration of centeredContentContract) {
      expect(createCss).toContain(declaration)
      expect(previewCss).toContain(declaration)
    }
    expect(createCss).toContain('overflow-x: hidden;')
    expect(previewCss).toContain('overflow-x: hidden;')
    expect(createCss).toContain('var(--safe-area-left)')
    expect(previewCss).toContain('var(--safe-area-right)')
  })

  it('uses one-column mobile fields and preview actions through 767px', () => {
    expect(createCss).toContain('@media (max-width: 767px)')
    expect(createCss).toMatch(
      /\.setlist-bingo-create-page__grid-options\s*\{\s*grid-template-columns:\s*1fr;/u,
    )
    expect(designPickerCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.bingo-design-picker__options\s*\{\s*grid-template-columns:\s*1fr;/u,
    )
    expect(predictionGridCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.prediction-song-grid__slot\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/u,
    )
    expect(previewCss).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.setlist-bingo-preview-page__actions\s*\{\s*grid-template-columns:\s*1fr;/u,
    )
  })

  it('retains centered multi-column form and action layouts from 768px upward', () => {
    expect(createCss).toMatch(
      /\.setlist-bingo-create-page__grid-options\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/u,
    )
    expect(designPickerCss).toMatch(
      /\.bingo-design-picker__options\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/u,
    )
    expect(predictionGridCss).toMatch(
      /\.prediction-song-grid__slot\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/u,
    )
    expect(previewCss).toMatch(
      /\.setlist-bingo-preview-page__actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/u,
    )
  })

  it('contains card, input, action, suggestion, and dialog widths at 320px', () => {
    expect(cardCss).toContain('width: min(100%, 800px);')
    expect(cardCss).toContain('aspect-ratio: 1;')
    expect(cardCss).toContain('minmax(0, 1fr)')
    expect(cardCss).toContain('overflow-wrap: anywhere;')

    expect(comboboxCss).toContain('max-width: 100%;')
    expect(comboboxCss).toContain('max-height: min(240px, 50dvh);')
    expect(comboboxCss).toContain('overflow-x: hidden;')
    expect(predictionGridCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')

    for (const dialogCss of [gridDialogCss]) {
      expect(dialogCss).toContain('box-sizing: border-box;')
      expect(dialogCss).toContain('max-width: 100%;')
      expect(dialogCss).toContain('min-width: 0;')
      expect(dialogCss).toContain('overflow-y: auto;')
      expect(dialogCss).toContain('flex-direction: column-reverse;')
    }
  })

  it('uses a token focus ring with at least 3:1 contrast on adjacent page surfaces', () => {
    const focusCss = [
      createCss,
      previewCss,
      designPickerCss,
      predictionGridCss,
      comboboxCss,
      gridDialogCss,
    ]

    for (const css of focusCss) {
      expect(css).toContain(':focus-visible')
      expect(css).toContain(
        'outline: var(--border-width-normal) solid var(--color-text);',
      )
      expect(css).toContain('outline-offset: var(--spacing-xs);')
    }

    const focusColor = readHexToken('--color-text')
    for (const adjacentToken of [
      '--color-background',
      '--color-background-light',
      '--color-surface',
      '--color-surface-hover',
    ]) {
      expect(
        contrastRatio(focusColor, readHexToken(adjacentToken)),
        adjacentToken,
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps every declared Bingo card text pair at 4.5:1 or higher', () => {
    const fallbackStyle = {
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration

    for (const design of BINGO_DESIGNS) {
      const contrast = calculateBingoThemeContrast(
        resolveBingoTheme(design.id, fallbackStyle),
      )
      expect(contrast.minimum, design.id).toBeGreaterThanOrEqual(
        MIN_CARD_TEXT_CONTRAST,
      )
      expect(contrast.minimum, design.id).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('preserves live-region space and removes transitions and hover movement for reduced motion', () => {
    expect(createCss).toMatch(
      /\.setlist-bingo-create-page__announcement\s*\{[\s\S]*?min-height:/u,
    )
    expect(previewCss).toMatch(
      /\.setlist-bingo-preview-page__announcement\s*\{[\s\S]*?min-height:/u,
    )
    expect(predictionGridCss).toContain('clip-path: inset(50%);')

    for (const css of [
      createCss,
      previewCss,
      designPickerCss,
      comboboxCss,
      gridDialogCss,
    ]) {
      expect(css).toContain('@media (prefers-reduced-motion: reduce)')
      expect(css).toContain('transition: none;')
    }
    expect(createCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none;/u,
    )
    expect(previewCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none;/u,
    )
    expect(gridDialogCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transform:\s*none;/u,
    )
  })
})
