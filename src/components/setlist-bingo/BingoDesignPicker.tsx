import { useId } from 'react'
import {
  BINGO_SCHEMA_VERSION,
  type BingoDesignId,
  type BingoState,
  type GridSize,
} from '../../types'
import { BINGO_DESIGNS } from '../../utils/setlistBingoRenderModel'
import { BingoCard } from './BingoCard'
import './BingoDesignPicker.css'

export interface BingoDesignPickerProps {
  performanceName: string
  participantName?: string
  gridSize: GridSize
  value: BingoDesignId | ''
  onChange: (designId: BingoDesignId) => void
  error?: string
  disabled?: boolean
  name?: string
}

function createThumbnailState(
  performanceName: string,
  participantName: string,
  gridSize: GridSize,
  designId: BingoDesignId,
): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: performanceName || '公演名',
    ...(participantName.trim() ? { participantName: participantName.trim() } : {}),
    gridSize,
    songTitles: Array.from({ length: gridSize ** 2 }, (_, index) =>
      index % 2 === 0 ? `予想曲 ${index + 1}` : '',
    ),
    designId,
  }
}

/** Accessible single-select design control with live card thumbnails. */
export function BingoDesignPicker({
  performanceName,
  participantName = '',
  gridSize,
  value,
  onChange,
  error,
  disabled = false,
  name,
}: BingoDesignPickerProps) {
  const generatedId = useId()
  const groupName = name ?? `bingo-design-${generatedId}`
  const descriptionId = `${generatedId}-description`
  const errorId = `${generatedId}-error`
  const describedBy = error ? `${descriptionId} ${errorId}` : descriptionId

  return (
    <fieldset
      className="bingo-design-picker"
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className="bingo-design-picker__legend">ビンゴデザイン</legend>
      <p id={descriptionId} className="bingo-design-picker__description">
        カードのデザインを1つ選択してください。
      </p>
      <div className="bingo-design-picker__options">
        {BINGO_DESIGNS.map((design) => {
          const selected = value === design.id
          const labelId = `${generatedId}-${design.id}-label`

          return (
            <label
              key={design.id}
              className="bingo-design-picker__option"
              data-selected={selected ? 'true' : 'false'}
            >
              <input
                className="bingo-design-picker__radio"
                type="radio"
                name={groupName}
                value={design.id}
                checked={selected}
                disabled={disabled}
                aria-labelledby={labelId}
                aria-describedby={error ? errorId : undefined}
                onChange={() => onChange(design.id)}
              />
              <span className="bingo-design-picker__option-content">
                <span className="bingo-design-picker__option-header">
                  <span id={labelId} className="bingo-design-picker__option-label">
                    {design.label}
                  </span>
                  {selected && (
                    <span className="bingo-design-picker__selected" aria-label="選択中">
                      <span aria-hidden="true">✓</span> 選択中
                    </span>
                  )}
                </span>
                <span className="bingo-design-picker__thumbnail" aria-hidden="true">
                  <BingoCard
                    state={createThumbnailState(
                      performanceName,
                      participantName,
                      gridSize,
                      design.id,
                    )}
                    mode="thumbnail"
                  />
                </span>
              </span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="bingo-design-picker__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
