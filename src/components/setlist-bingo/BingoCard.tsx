import type { CSSProperties, Ref } from 'react'
import type { BingoState } from '../../types'
import {
  buildBingoCardRenderModel,
  resolveBingoTheme,
} from '../../utils/setlistBingoRenderModel'
import './BingoCard.css'

export interface BingoCardProps {
  state: BingoState
  mode: 'preview' | 'thumbnail'
  cardRef?: Ref<HTMLDivElement>
}

const FALLBACK_ROOT_STYLE = {
  getPropertyValue: () => '',
} as unknown as CSSStyleDeclaration

function getRootStyle(): CSSStyleDeclaration {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACK_ROOT_STYLE
  }

  return getComputedStyle(document.documentElement)
}

function getHeadingLengthClass(title: string): string {
  const length = Array.from(title).length
  if (length > 48) return ' bingo-card__heading--very-long'
  if (length > 24) return ' bingo-card__heading--long'
  return ''
}

/** DOM adapter for the render model shared with the PNG canvas renderer. */
export function BingoCard({ state, mode, cardRef }: BingoCardProps) {
  const model = buildBingoCardRenderModel(
    state,
    resolveBingoTheme(state.designId, getRootStyle()),
  )
  const cardStyle = {
    '--bingo-grid-size': state.gridSize,
    '--bingo-grid-width': `${(model.gridRect.width / model.headerRect.width) * 100}%`,
    backgroundColor: model.theme.cardBackground,
    borderColor: model.theme.cardBorder,
  } as CSSProperties
  const headingClass = `bingo-card__heading${getHeadingLengthClass(model.title.text)}${
    model.participantName ? ' bingo-card__heading--with-participant' : ''
  }`
  const accessibleName = model.participantName
    ? `${model.participantName.text}、${model.title.text}のセトリ予想ビンゴ`
    : `${model.title.text}のセトリ予想ビンゴ`

  return (
    <div
      ref={cardRef}
      className={`bingo-card bingo-card--${mode}`}
      style={cardStyle}
      role="group"
      aria-label={accessibleName}
      data-design-id={model.theme.id}
      data-mode={mode}
    >
      <div
        className={headingClass}
        style={{
          backgroundColor: model.theme.headingBackground,
          borderColor: model.theme.cardBorder,
          color: model.theme.headingText,
        }}
      >
        {model.participantName ? (
          <>
            <span className="bingo-card__title">{model.title.text}</span>
            <span className="bingo-card__participant-name">
              {model.participantName.text}
            </span>
          </>
        ) : (
          model.title.text
        )}
      </div>
      <div
        className="bingo-card__grid"
        role="grid"
        aria-label={`${state.gridSize}行${state.gridSize}列の予想曲`}
        aria-rowcount={state.gridSize}
        aria-colcount={state.gridSize}
        style={{ borderColor: model.theme.gridBorder }}
      >
        {model.cells.map((cell) => (
          <div
            key={cell.index}
            className="bingo-card__cell"
            role="gridcell"
            aria-rowindex={cell.row + 1}
            aria-colindex={cell.column + 1}
            data-cell-index={cell.index}
            style={{
              backgroundColor: cell.background,
              borderColor: model.theme.gridBorder,
              color: model.theme.cellText,
            }}
          >
            {cell.text.text}
          </div>
        ))}
      </div>
    </div>
  )
}
