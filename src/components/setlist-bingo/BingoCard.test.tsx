/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { BINGO_SCHEMA_VERSION, type BingoState } from '../../types'
import { BingoCard } from './BingoCard'
import { BingoDesignPicker } from './BingoDesignPicker'

const componentDirectory = resolve(process.cwd(), 'src/components/setlist-bingo')
const bingoCardCss = readFileSync(resolve(componentDirectory, 'BingoCard.css'), 'utf8')
const bingoDesignPickerCss = readFileSync(
  resolve(componentDirectory, 'BingoDesignPicker.css'),
  'utf8',
)

function renderElement(element: React.ReactNode): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(element)
  return container
}

const representativeState: BingoState = {
  schemaVersion: BINGO_SCHEMA_VERSION,
  performanceName: '<img src=x onerror=alert(1)> 公演',
  gridSize: 3,
  songTitles: [
    '1曲目',
    '2曲目',
    '<script>alert(1)</script>',
    '4曲目',
    '長い曲名でも省略せずにすべて表示するための代表テキスト',
    '6曲目',
    '7曲目',
    '8曲目',
    '9曲目',
  ],
  designId: 'violet-ribbon',
}

describe('BingoCard', () => {
  it('公演名と全セルをプレーンなDOM textとしてrow-major順に描画する', () => {
    const container = renderElement(<BingoCard state={representativeState} mode="preview" />)
    const card = container.querySelector<HTMLElement>('.bingo-card')
    const heading = container.querySelector<HTMLElement>('.bingo-card__heading')
    const cells = [...container.querySelectorAll<HTMLElement>('[role="gridcell"]')]

    expect(card?.dataset.designId).toBe('violet-ribbon')
    expect(heading?.textContent).toBe(representativeState.performanceName)
    expect(cells).toHaveLength(9)
    expect(cells.map((cell) => cell.textContent)).toEqual(representativeState.songTitles)
    expect(cells.map((cell) => cell.dataset.cellIndex)).toEqual(
      representativeState.songTitles.map((_, index) => String(index)),
    )
    expect(cells.map((cell) => [cell.ariaRowIndex, cell.ariaColIndex])).toEqual([
      ['1', '1'],
      ['1', '2'],
      ['1', '3'],
      ['2', '1'],
      ['2', '2'],
      ['2', '3'],
      ['3', '1'],
      ['3', '2'],
      ['3', '3'],
    ])
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })

  it('名前がある時だけ公演名とともにプレーンなDOM textとして表示する', () => {
    const namedState = { ...representativeState, participantName: '<b>参加者</b> 🎤' }
    const namedContainer = renderElement(<BingoCard state={namedState} mode="preview" />)

    expect(namedContainer.querySelector('.bingo-card__title')?.textContent).toBe(
      representativeState.performanceName,
    )
    expect(namedContainer.querySelector('.bingo-card__participant-name')?.textContent).toBe(
      '名前：<b>参加者</b> 🎤',
    )
    expect(namedContainer.querySelector('.bingo-card')?.getAttribute('aria-label')).toContain(
      '名前：<b>参加者</b> 🎤',
    )
    expect(namedContainer.querySelector('b')).toBeNull()

    const unnamedContainer = renderElement(
      <BingoCard state={representativeState} mode="preview" />,
    )
    expect(unnamedContainer.querySelector('.bingo-card__participant-name')).toBeNull()
  })

  it('CSS Gridの正方形レイアウトで全文折り返しを行い、省略指定を使わない', () => {
    expect(bingoCardCss).toContain('display: grid')
    expect(bingoCardCss).toContain('aspect-ratio: 1')
    expect(bingoCardCss).toContain('minmax(0, 1fr)')
    expect(bingoCardCss).toContain('overflow-wrap: anywhere')
    expect(bingoCardCss).not.toContain('text-overflow: ellipsis')
    expect(bingoCardCss).not.toContain('line-clamp')
  })
})

describe('BingoDesignPicker', () => {
  it('同名radio group、現在値を反映した3見本、単一checked、選択中表示を描画する', () => {
    const onChange = vi.fn()
    const container = renderElement(
      <BingoDesignPicker
        performanceName="現在編集中の公演"
        gridSize={3}
        value="duo-pop"
        onChange={onChange}
      />,
    )
    const fieldset = container.querySelector('fieldset')
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    const thumbnails = [...container.querySelectorAll<HTMLElement>('[data-mode="thumbnail"]')]
    const selectedIndicators = [...container.querySelectorAll('.bingo-design-picker__selected')]

    expect(fieldset?.querySelector('legend')?.textContent).toBe('ビンゴデザイン')
    expect(radios).toHaveLength(3)
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1)
    expect(radios.filter((radio) => radio.checked).map((radio) => radio.value)).toEqual([
      'duo-pop',
    ])
    expect(thumbnails).toHaveLength(3)
    expect(thumbnails.every((thumbnail) => thumbnail.textContent?.includes('現在編集中の公演'))).toBe(
      true,
    )
    expect(
      thumbnails.every(
        (thumbnail) => thumbnail.querySelectorAll('[role="gridcell"]').length === 9,
      ),
    ).toBe(true)
    expect(selectedIndicators).toHaveLength(1)
    expect(selectedIndicators[0]?.textContent).toContain('✓')
    expect(selectedIndicators[0]?.textContent).toContain('選択中')
  })

  it('可視ラベル、エラー関連付け、キーボードfocus indicatorを提供する', () => {
    const container = renderElement(
      <BingoDesignPicker
        performanceName="公演"
        gridSize={2}
        value="rose-bubble"
        onChange={vi.fn()}
        error="デザインを選択してください"
      />,
    )
    const fieldset = container.querySelector('fieldset')
    const error = container.querySelector<HTMLElement>('[role="alert"]')
    const radios = [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')]

    expect(container.querySelectorAll('.bingo-design-picker__option-label')).toHaveLength(3)
    expect(fieldset?.getAttribute('aria-invalid')).toBe('true')
    expect(fieldset?.getAttribute('aria-describedby')).toContain(error?.id)
    expect(radios.every((radio) => radio.getAttribute('aria-describedby') === error?.id)).toBe(
      true,
    )
    expect(bingoDesignPickerCss).toContain(
      '.bingo-design-picker__radio:focus-visible + .bingo-design-picker__option-content',
    )
    expect(bingoDesignPickerCss).toContain('outline: var(--border-width-normal) solid var(--color-text)')
  })
})
