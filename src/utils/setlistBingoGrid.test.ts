import { describe, expect, it } from 'vitest'

import type { PredictionSongDraft } from '../types'
import {
  clearPredictionSong,
  confirmGridShrink,
  gridSizeToSongCount,
  indexToGridCoordinate,
  movePredictionSong,
  requestGridResize,
  selectPredictionSong,
  updatePredictionSongTitle,
} from './setlistBingoGrid'

function createSlots(count: number): PredictionSongDraft[] {
  return Array.from({ length: count }, (_, index) => ({
    songTitle: `Song ${index + 1}`,
    registeredSongId: `song-${index + 1}`,
  }))
}

describe('setlist bingo grid sizing', () => {
  it('maps 2/3/4 grids to fixed counts and unique row-major coordinates', () => {
    expect([2, 3, 4].map((size) => gridSizeToSongCount(size as 2 | 3 | 4))).toEqual([
      4, 9, 16,
    ])

    expect(Array.from({ length: 9 }, (_, index) => indexToGridCoordinate(index, 3))).toEqual([
      { row: 0, column: 0 },
      { row: 0, column: 1 },
      { row: 0, column: 2 },
      { row: 1, column: 0 },
      { row: 1, column: 1 },
      { row: 1, column: 2 },
      { row: 2, column: 0 },
      { row: 2, column: 1 },
      { row: 2, column: 2 },
    ])
    expect(indexToGridCoordinate(-1, 3)).toBeUndefined()
    expect(indexToGridCoordinate(9, 3)).toBeUndefined()
  })

  it('expands 2 to 3 to 4 while preserving the ordered prefix and adding empty slots', () => {
    const original = createSlots(4)
    const toThree = requestGridResize(2, original, 3)
    expect(toThree).toEqual({
      kind: 'applied',
      gridSize: 3,
      slots: [...original, ...Array.from({ length: 5 }, () => ({ songTitle: '' }))],
    })

    if (toThree.kind !== 'applied') throw new Error('Expected applied resize')
    const toFour = requestGridResize(3, toThree.slots, 4)
    expect(toFour.kind).toBe('applied')
    if (toFour.kind !== 'applied') throw new Error('Expected applied resize')
    expect(toFour.slots.slice(0, 9)).toEqual(toThree.slots)
    expect(toFour.slots.slice(9)).toEqual(
      Array.from({ length: 7 }, () => ({ songTitle: '' }))
    )
    expect(original).toEqual(createSlots(4))
  })

  it('defers destructive shrink and reports the number of filled excluded slots', () => {
    const slots = createSlots(16)
    slots[10] = { songTitle: '   ' }
    const snapshot = structuredClone(slots)

    expect(requestGridResize(4, slots, 3)).toEqual({
      kind: 'confirmation-required',
      target: 3,
      excludedFilledCount: 6,
    })
    expect(requestGridResize(4, slots, 2)).toEqual({
      kind: 'confirmation-required',
      target: 2,
      excludedFilledCount: 11,
    })
    expect(slots).toEqual(snapshot)
  })

  it('shrinks immediately when only empty slots are excluded and confirms to the ordered prefix', () => {
    const slots = [
      ...createSlots(9),
      ...Array.from({ length: 7 }, () => ({ songTitle: '  ' })),
    ]

    expect(requestGridResize(4, slots, 3)).toEqual({
      kind: 'applied',
      gridSize: 3,
      slots: slots.slice(0, 9),
    })
    expect(confirmGridShrink(createSlots(16), 2)).toEqual(createSlots(16).slice(0, 4))
  })
})

describe('fixed prediction slot editing', () => {
  it('selects, freely edits, and clears only the target slot without changing length', () => {
    const original = createSlots(4)
    const selected = selectPredictionSong(original, 1, { id: 'selected-id', title: 'Selected' })
    const freelyEdited = updatePredictionSongTitle(selected, 1, ' raw free input ')
    const cleared = clearPredictionSong(freelyEdited, 1)

    expect(selected).toEqual([
      original[0],
      { songTitle: 'Selected', registeredSongId: 'selected-id' },
      original[2],
      original[3],
    ])
    expect(freelyEdited[1]).toEqual({ songTitle: ' raw free input ' })
    expect(cleared[1]).toEqual({ songTitle: '' })
    expect([selected.length, freelyEdited.length, cleared.length]).toEqual([4, 4, 4])
    expect(original).toEqual(createSlots(4))
  })

  it('leaves content unchanged for out-of-range edit indexes', () => {
    const original = createSlots(4)

    expect(clearPredictionSong(original, -1)).toEqual(original)
    expect(updatePredictionSongTitle(original, 4, 'ignored')).toEqual(original)
    expect(selectPredictionSong(original, 99, { id: 'x', title: 'ignored' })).toEqual(original)
  })
})

describe('prediction slot reordering', () => {
  it('moves a slot while preserving cardinality, element identities, and relative order', () => {
    const original = createSlots(4)

    expect(movePredictionSong(original, 0, 3)).toEqual([
      original[1],
      original[2],
      original[3],
      original[0],
    ])
    expect(movePredictionSong(original, 3, 1)).toEqual([
      original[0],
      original[3],
      original[1],
      original[2],
    ])
    expect(original).toEqual(createSlots(4))
  })

  it('returns an unchanged copy for invalid or identical indexes', () => {
    const original = createSlots(4)

    for (const [from, to] of [
      [-1, 0],
      [0, 4],
      [2, 2],
    ]) {
      const result = movePredictionSong(original, from, to)
      expect(result).toEqual(original)
      expect(result).not.toBe(original)
    }
  })
})
