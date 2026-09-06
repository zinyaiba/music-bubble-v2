import { useId, useMemo, useRef, useState } from 'react'
import type { GridSize, PredictionSongDraft, Song } from '../../types'
import {
  gridSizeToSongCount,
  movePredictionSong,
  selectPredictionSong,
  updatePredictionSongTitle,
} from '../../utils/setlistBingoGrid'
import { SongTitleCombobox } from './SongTitleCombobox'
import './PredictionSongGrid.css'

export interface PredictionSongGridProps {
  gridSize: GridSize
  slots: readonly PredictionSongDraft[]
  songs: readonly Song[]
  errors: readonly (string | undefined)[]
  disabled?: boolean
  onChange: (slots: PredictionSongDraft[]) => void
}

function normalizeSlots(
  slots: readonly PredictionSongDraft[],
  slotCount: number
): PredictionSongDraft[] {
  return Array.from({ length: slotCount }, (_, index) => slots[index] ?? { songTitle: '' })
}

/** Fixed-cardinality prediction editor whose DOM order is the bingo row-major order. */
export function PredictionSongGrid({
  gridSize,
  slots,
  songs,
  errors,
  disabled = false,
  onChange,
}: PredictionSongGridProps) {
  const generatedId = useId().replaceAll(':', '')
  const slotCount = gridSizeToSongCount(gridSize)
  const normalizedSlots = useMemo(() => normalizeSlots(slots, slotCount), [slots, slotCount])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [announcement, setAnnouncement] = useState('')
  const descriptionId = `${generatedId}-description`

  const updateSlot = (index: number, value: PredictionSongDraft) => {
    if (value.registeredSongId) {
      onChange(
        selectPredictionSong(normalizedSlots, index, {
          id: value.registeredSongId,
          title: value.songTitle,
        })
      )
      return
    }

    onChange(updatePredictionSongTitle(normalizedSlots, index, value.songTitle))
  }

  const moveSlot = (fromIndex: number, toIndex: number) => {
    onChange(movePredictionSong(normalizedSlots, fromIndex, toIndex))
    setAnnouncement(`${fromIndex + 1}曲目を${toIndex + 1}曲目へ移動しました。`)
    inputRefs.current[toIndex]?.focus()
  }

  return (
    <fieldset className="prediction-song-grid" aria-describedby={descriptionId}>
      <legend className="prediction-song-grid__legend">予想曲</legend>
      <p id={descriptionId} className="prediction-song-grid__description">
        {slotCount}曲を入力してください。候補を選ばず自由に入力することもできます。
      </p>
      <ol className="prediction-song-grid__slots">
        {normalizedSlots.map((slot, index) => {
          const inputId = `${generatedId}-prediction-song-${index}`

          return (
            <li key={inputId} className="prediction-song-grid__slot">
              <div className="prediction-song-grid__editor">
                <SongTitleCombobox
                  id={inputId}
                  label={`${index + 1}曲目`}
                  value={slot}
                  songs={songs}
                  error={errors[index]}
                  disabled={disabled}
                  inputRef={(element) => {
                    inputRefs.current[index] = element
                  }}
                  onChange={(value) => updateSlot(index, value)}
                />
              </div>
              <div className="prediction-song-grid__actions">
                <button
                  className="prediction-song-grid__action"
                  type="button"
                  disabled={disabled || index === 0}
                  aria-label={`${index + 1}曲目を上へ`}
                  title="上へ"
                  onClick={() => moveSlot(index, index - 1)}
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  className="prediction-song-grid__action"
                  type="button"
                  disabled={disabled || index === slotCount - 1}
                  aria-label={`${index + 1}曲目を下へ`}
                  title="下へ"
                  onClick={() => moveSlot(index, index + 1)}
                >
                  <span aria-hidden="true">↓</span>
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="prediction-song-grid__announcement" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </fieldset>
  )
}
