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
  designId: BingoDesignId
): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: performanceName || '公演名',
    ...(participantName.trim() ? { participantName: participantName.trim() } : {}),
    gridSize,
    songTitles: Array.from({ length: gridSize ** 2 }, (_, index) =>
      index % 2 === 0 ? `予想曲 ${index + 1}` : ''
    ),
    designId,
  }
}

/** Accessible single-select design carousel with a live card thumbnail. */
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
  const carouselId = `${generatedId}-carousel`
  const statusId = `${generatedId}-status`
  const describedBy = error ? `${descriptionId} ${errorId}` : descriptionId
  const selectedIndex = BINGO_DESIGNS.findIndex((design) => design.id === value)
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0
  const activeDesign = BINGO_DESIGNS[activeIndex]
  const selected = value === activeDesign.id

  const selectDesignAt = (index: number) => {
    const normalizedIndex = (index + BINGO_DESIGNS.length) % BINGO_DESIGNS.length
    onChange(BINGO_DESIGNS[normalizedIndex].id)
  }

  return (
    <fieldset
      className="bingo-design-picker"
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className="bingo-design-picker__legend">ビンゴデザイン</legend>
      <p id={descriptionId} className="bingo-design-picker__description">
        左右のボタンでカードのデザインを選択してください。
      </p>
      <div className="bingo-design-picker__carousel">
        <div className="bingo-design-picker__controls">
          <button
            className="bingo-design-picker__control"
            type="button"
            disabled={disabled}
            aria-label="前のデザイン"
            aria-controls={carouselId}
            onClick={() => selectDesignAt(activeIndex - 1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <span
            id={statusId}
            className="bingo-design-picker__status"
            aria-live="polite"
            aria-atomic="true"
          >
            {activeDesign.label} {activeIndex + 1}/{BINGO_DESIGNS.length}
            {selected ? '（選択中）' : ''}
          </span>
          <button
            className="bingo-design-picker__control"
            type="button"
            disabled={disabled}
            aria-label="次のデザイン"
            aria-controls={carouselId}
            onClick={() => selectDesignAt(activeIndex + 1)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div
          id={carouselId}
          className="bingo-design-picker__options"
          role="region"
          aria-roledescription="カルーセル"
          aria-label="ビンゴデザイン"
        >
          {BINGO_DESIGNS.map((design, index) => {
            const inputId = `${generatedId}-${design.id}`
            const isActive = index === activeIndex
            const isSelected = value === design.id

            return (
              <div
                key={design.id}
                className="bingo-design-picker__option-shell"
                data-active={isActive ? 'true' : 'false'}
              >
                <input
                  id={inputId}
                  className="bingo-design-picker__radio"
                  type="radio"
                  name={groupName}
                  value={design.id}
                  checked={isSelected}
                  disabled={disabled}
                  aria-label={design.label}
                  aria-describedby={error ? errorId : undefined}
                  onChange={() => onChange(design.id)}
                />
                <label
                  className="bingo-design-picker__option"
                  data-selected={isSelected ? 'true' : 'false'}
                  htmlFor={inputId}
                  hidden={!isActive}
                >
                  <span className="bingo-design-picker__option-content">
                    <span className="bingo-design-picker__thumbnail" aria-hidden="true">
                      <BingoCard
                        state={createThumbnailState(
                          performanceName,
                          participantName,
                          gridSize,
                          design.id
                        )}
                        mode="thumbnail"
                      />
                    </span>
                  </span>
                </label>
              </div>
            )
          })}
        </div>
      </div>
      {error && (
        <p id={errorId} className="bingo-design-picker__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
