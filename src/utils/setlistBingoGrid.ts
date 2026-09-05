import type { GridSize, PredictionSongDraft } from '../types'

export type GridResizeResult =
  | { kind: 'applied'; gridSize: GridSize; slots: PredictionSongDraft[] }
  | { kind: 'confirmation-required'; target: GridSize; excludedFilledCount: number }

export interface GridCoordinate {
  row: number
  column: number
}

export interface SelectableSong {
  id: string
  title: string
}

export function gridSizeToSongCount(gridSize: GridSize): number {
  return gridSize * gridSize
}

export function indexToGridCoordinate(
  index: number,
  gridSize: GridSize
): GridCoordinate | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= gridSizeToSongCount(gridSize)) {
    return undefined
  }

  return {
    row: Math.floor(index / gridSize),
    column: index % gridSize,
  }
}

function createEmptySlots(count: number): PredictionSongDraft[] {
  return Array.from({ length: count }, () => ({ songTitle: '' }))
}

/**
 * Requests a grid resize without mutating the current slots.
 * Destructive shrinking is deferred until the caller explicitly confirms it.
 */
export function requestGridResize(
  currentGridSize: GridSize,
  slots: readonly PredictionSongDraft[],
  targetGridSize: GridSize
): GridResizeResult {
  const targetCount = gridSizeToSongCount(targetGridSize)

  if (targetGridSize > currentGridSize) {
    return {
      kind: 'applied',
      gridSize: targetGridSize,
      slots: [
        ...slots,
        ...createEmptySlots(Math.max(0, targetCount - slots.length)),
      ].slice(0, targetCount),
    }
  }

  if (targetGridSize < currentGridSize) {
    const excludedFilledCount = slots
      .slice(targetCount)
      .filter((slot) => slot.songTitle.trim().length > 0).length

    if (excludedFilledCount > 0) {
      return {
        kind: 'confirmation-required',
        target: targetGridSize,
        excludedFilledCount,
      }
    }
  }

  return {
    kind: 'applied',
    gridSize: targetGridSize,
    slots: [
      ...slots.slice(0, targetCount),
      ...createEmptySlots(Math.max(0, targetCount - slots.length)),
    ],
  }
}

/** Applies a previously confirmed shrink by keeping only the ordered prefix. */
export function confirmGridShrink(
  slots: readonly PredictionSongDraft[],
  targetGridSize: GridSize
): PredictionSongDraft[] {
  return slots.slice(0, gridSizeToSongCount(targetGridSize))
}

/** Moves one slot to another row-major index without changing cardinality. */
export function movePredictionSong(
  slots: readonly PredictionSongDraft[],
  fromIndex: number,
  toIndex: number
): PredictionSongDraft[] {
  const moved = slots.slice()
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= moved.length ||
    toIndex >= moved.length ||
    fromIndex === toIndex
  ) {
    return moved
  }

  const [slot] = moved.splice(fromIndex, 1)
  moved.splice(toIndex, 0, slot)
  return moved
}

function replacePredictionSong(
  slots: readonly PredictionSongDraft[],
  index: number,
  replacement: PredictionSongDraft
): PredictionSongDraft[] {
  const updated = slots.slice()
  if (!Number.isInteger(index) || index < 0 || index >= updated.length) {
    return updated
  }

  updated[index] = replacement
  return updated
}

/** Selects a registered song for exactly one fixed slot. */
export function selectPredictionSong(
  slots: readonly PredictionSongDraft[],
  index: number,
  song: SelectableSong
): PredictionSongDraft[] {
  return replacePredictionSong(slots, index, {
    songTitle: song.title,
    registeredSongId: song.id,
  })
}

/** Keeps free input verbatim and removes any stale registered-song identity. */
export function updatePredictionSongTitle(
  slots: readonly PredictionSongDraft[],
  index: number,
  songTitle: string
): PredictionSongDraft[] {
  return replacePredictionSong(slots, index, { songTitle })
}

/** Clears one slot while preserving the fixed number of inputs. */
export function clearPredictionSong(
  slots: readonly PredictionSongDraft[],
  index: number
): PredictionSongDraft[] {
  return replacePredictionSong(slots, index, { songTitle: '' })
}
