/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PredictionSongDraft, Song } from '../../types'
import { PredictionSongGrid } from './PredictionSongGrid'
import {
  INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE,
  SongTitleCombobox,
  songTitleComboboxKeyboardReducer,
} from './SongTitleCombobox'

const mountedRoots: { root: Root; container: HTMLDivElement }[] = []

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  for (const { root, container } of mountedRoots.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
})

function createSong(id: string, title: string): Song {
  return { id, title, lyricists: [], composers: [], arrangers: [] }
}

function mount(element: ReactNode): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mountedRoots.push({ root, container })
  act(() => root.render(element))
  return container
}

function pressKey(input: HTMLInputElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  act(() => input.dispatchEvent(event))
  return event
}

function click(element: HTMLElement): void {
  act(() => element.click())
}

function ComboboxHarness({
  initialValue,
  songs,
  onChange,
}: {
  initialValue: PredictionSongDraft
  songs: readonly Song[]
  onChange: (value: PredictionSongDraft) => void
}) {
  const [value, setValue] = useState(initialValue)

  return (
    <SongTitleCombobox
      id="song-title"
      label="1曲目"
      value={value}
      songs={songs}
      error="曲名を入力してください"
      onChange={(nextValue) => {
        onChange(nextValue)
        setValue(nextValue)
      }}
    />
  )
}

describe('songTitleComboboxKeyboardReducer', () => {
  it('候補範囲内を移動し、closeで未選択状態へ戻す', () => {
    const first = songTitleComboboxKeyboardReducer(
      INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE,
      { type: 'next', optionCount: 2 },
    )
    const second = songTitleComboboxKeyboardReducer(first, { type: 'next', optionCount: 2 })
    const bounded = songTitleComboboxKeyboardReducer(second, { type: 'next', optionCount: 2 })
    const previous = songTitleComboboxKeyboardReducer(bounded, {
      type: 'previous',
      optionCount: 2,
    })

    expect(first).toEqual({ isOpen: true, highlightedIndex: 0 })
    expect(second).toEqual({ isOpen: true, highlightedIndex: 1 })
    expect(bounded).toEqual(second)
    expect(previous).toEqual(first)
    expect(songTitleComboboxKeyboardReducer(previous, { type: 'close' })).toEqual(
      INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE,
    )
  })
})

describe('SongTitleCombobox', () => {
  it('最大10候補を表示し、Arrow/Enterで任意候補を選択する', () => {
    const songs = Array.from({ length: 12 }, (_, index) =>
      createSong(`song-${index}`, `Song ${index + 1}`),
    )
    const onChange = vi.fn()
    const container = mount(
      <ComboboxHarness initialValue={{ songTitle: 'song' }} songs={songs} onChange={onChange} />,
    )
    const input = container.querySelector<HTMLInputElement>('input[role="combobox"]')!

    act(() => input.focus())
    const options = [...container.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(options).toHaveLength(10)
    expect(options.map((option) => option.textContent)).toEqual(
      songs.slice(0, 10).map((song) => song.title),
    )
    expect(input.getAttribute('aria-expanded')).toBe('true')

    pressKey(input, 'ArrowDown')
    pressKey(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe('song-title-suggestions-option-1')
    pressKey(input, 'Enter')

    expect(onChange).toHaveBeenLastCalledWith({
      songTitle: 'Song 2',
      registeredSongId: 'song-1',
    })
    expect(input.value).toBe('Song 2')
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Escapeは値を保持して候補を閉じ、Tabを横取りせず、手入力は古いIDを除去する', () => {
    const onChange = vi.fn()
    const container = mount(
      <ComboboxHarness
        initialValue={{ songTitle: 'Alpha', registeredSongId: 'old-id' }}
        songs={[createSong('alpha', 'Alpha'), createSong('alphabet', 'Alphabet')]}
        onChange={onChange}
      />,
    )
    const input = container.querySelector<HTMLInputElement>('input[role="combobox"]')!

    act(() => input.focus())
    pressKey(input, 'Escape')
    expect(input.value).toBe('Alpha')
    expect(input.getAttribute('aria-expanded')).toBe('false')

    act(() => {
      input.blur()
      input.focus()
    })
    const tabEvent = pressKey(input, 'Tab')
    expect(tabEvent.defaultPrevented).toBe(false)

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    act(() => {
      valueSetter?.call(input, '自由入力')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onChange).toHaveBeenLastCalledWith({ songTitle: '自由入力' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('song-title-error')
    expect(container.querySelector('#song-title-error')?.textContent).toBe('曲名を入力してください')
  })
})

function GridHarness({
  initialSlots,
  onChange,
}: {
  initialSlots: PredictionSongDraft[]
  onChange: (slots: PredictionSongDraft[]) => void
}) {
  const [slots, setSlots] = useState(initialSlots)

  return (
    <PredictionSongGrid
      gridSize={2}
      slots={slots}
      songs={[createSong('song-a', 'A')]}
      errors={['1曲目は必須です']}
      onChange={(nextSlots) => {
        onChange(nextSlots)
        setSlots(nextSlots)
      }}
    />
  )
}

describe('PredictionSongGrid', () => {
  it('gridSize²の入力枠を保ち、空欄化してもslotを削除しない', () => {
    const onChange = vi.fn()
    const container = mount(
      <GridHarness
        initialSlots={[
          { songTitle: 'A', registeredSongId: 'song-a' },
          { songTitle: 'B' },
          { songTitle: 'C' },
          { songTitle: 'D' },
          { songTitle: '余分な曲' },
        ]}
        onChange={onChange}
      />,
    )

    expect(container.querySelectorAll('input[role="combobox"]')).toHaveLength(4)
    click(container.querySelector<HTMLButtonElement>('[aria-label="1曲目を空にする"]')!)

    const nextSlots = onChange.mock.lastCall?.[0] as PredictionSongDraft[]
    expect(nextSlots).toHaveLength(4)
    expect(nextSlots[0]).toEqual({ songTitle: '' })
    expect(nextSlots.slice(1).map((slot) => slot.songTitle)).toEqual(['B', 'C', 'D'])
  })

  it('上下操作でrow-major順を変更し、移動先入力へfocusを戻して通知する', () => {
    const onChange = vi.fn()
    const container = mount(
      <GridHarness
        initialSlots={[
          { songTitle: 'A' },
          { songTitle: 'B' },
          { songTitle: 'C' },
          { songTitle: 'D' },
        ]}
        onChange={onChange}
      />,
    )

    click(container.querySelector<HTMLButtonElement>('[aria-label="1曲目を下へ"]')!)

    const nextSlots = onChange.mock.lastCall?.[0] as PredictionSongDraft[]
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')]
    expect(nextSlots.map((slot) => slot.songTitle)).toEqual(['B', 'A', 'C', 'D'])
    expect(inputs.map((input) => input.value)).toEqual(['B', 'A', 'C', 'D'])
    expect(document.activeElement).toBe(inputs[1])
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain(
      '1曲目を2曲目へ移動しました。',
    )
  })

  it('可視label・error関連付けとキーボードfocus indicatorを提供する', () => {
    const container = mount(
      <GridHarness
        initialSlots={Array.from({ length: 4 }, () => ({ songTitle: '' }))}
        onChange={vi.fn()}
      />,
    )
    const firstInput = container.querySelector<HTMLInputElement>('input[role="combobox"]')!
    const firstLabel = container.querySelector<HTMLLabelElement>(`label[for="${firstInput.id}"]`)
    const comboboxCss = readFileSync(
      resolve(process.cwd(), 'src/components/setlist-bingo/SongTitleCombobox.css'),
      'utf8',
    )
    const gridCss = readFileSync(
      resolve(process.cwd(), 'src/components/setlist-bingo/PredictionSongGrid.css'),
      'utf8',
    )

    expect(firstLabel?.textContent).toBe('1曲目')
    expect(firstInput.getAttribute('aria-invalid')).toBe('true')
    expect(firstInput.getAttribute('aria-describedby')).toBeTruthy()
    expect(container.querySelector(`#${firstInput.getAttribute('aria-describedby')}`)?.textContent).toBe(
      '1曲目は必須です',
    )
    expect(comboboxCss).toContain('.song-title-combobox__input:focus-visible')
    expect(gridCss).toContain('.prediction-song-grid__action:focus-visible')
    expect(comboboxCss).toContain('outline: var(--border-width-normal) solid var(--color-text)')
    expect(gridCss).toContain('outline: var(--border-width-normal) solid var(--color-text)')
  })
})
