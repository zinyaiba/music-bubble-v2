import type {
  BingoCardRenderModel,
  Rect,
  TextBlock,
} from '../../utils/setlistBingoRenderModel'

/** OS-provided fonts only; PNG generation never waits for or fetches a web font. */
export const BINGO_CANVAS_FONT_FAMILY =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const CARD_BORDER_WIDTH = 8
const HEADER_BORDER_WIDTH = 4
const CELL_BORDER_WIDTH = 2
const GRID_BORDER_WIDTH = 6

interface TextLayout {
  fontSize: number
  lineHeight: number
  lines: readonly string[]
}

function getTextUnits(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
  }

  // Array.from iterates Unicode code points and never splits a surrogate pair.
  return Array.from(text)
}

function isLineBreak(unit: string): boolean {
  return unit === '\n' || unit === '\r' || unit === '\r\n' || unit === '\u2028' || unit === '\u2029'
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let currentLine = ''

  for (const unit of getTextUnits(text)) {
    if (isLineBreak(unit)) {
      lines.push(currentLine)
      currentLine = ''
      continue
    }

    const candidate = currentLine + unit
    if (currentLine !== '' && ctx.measureText(candidate).width > maxWidth) {
      lines.push(currentLine)
      currentLine = unit
    } else {
      currentLine = candidate
    }
  }

  if (currentLine !== '' || lines.length === 0) {
    lines.push(currentLine)
  }

  return lines
}

function createFont(block: TextBlock, fontSize: number): string {
  return `${block.fontWeight} ${fontSize}px ${BINGO_CANVAS_FONT_FAMILY}`
}

function layoutText(ctx: CanvasRenderingContext2D, block: TextBlock): TextLayout {
  const maximum = Math.max(block.minFontSize, Math.floor(block.maxFontSize))
  const minimum = Math.max(1, Math.floor(block.minFontSize))
  let fallback: TextLayout | undefined

  for (let fontSize = maximum; fontSize >= minimum; fontSize -= 1) {
    ctx.font = createFont(block, fontSize)
    const lines = wrapText(ctx, block.text, block.rect.width)
    const lineHeight = fontSize * block.lineHeight
    const candidate = { fontSize, lineHeight, lines }
    fallback = candidate

    if (lines.length * lineHeight <= block.rect.height) {
      return candidate
    }
  }

  // Valid states are bounded to 80/50 code points and fit at the model minimum.
  // Keep every text unit if a non-browser/mock metric reports an unusually wide glyph.
  return fallback ?? {
    fontSize: minimum,
    lineHeight: minimum * block.lineHeight,
    lines: [block.text],
  }
}

function drawFilledRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  fillStyle: string,
): void {
  ctx.fillStyle = fillStyle
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
}

function drawStrokedRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  strokeStyle: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  color: string,
): void {
  const layout = layoutText(ctx, block)
  const centerX = block.rect.x + block.rect.width / 2
  const firstLineY =
    block.rect.y + block.rect.height / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2

  ctx.fillStyle = color
  ctx.font = createFont(block, layout.fontSize)
  ctx.textAlign = block.horizontalAlign
  ctx.textBaseline = block.verticalAlign

  layout.lines.forEach((line, index) => {
    ctx.fillText(line, centerX, firstLineY + index * layout.lineHeight, block.rect.width)
  })
}

/**
 * Draws the shared, fully resolved bingo render model without consulting the DOM,
 * loading resources, or performing network access.
 */
export function renderBingoCardToCanvas(
  ctx: CanvasRenderingContext2D,
  model: BingoCardRenderModel,
): void {
  ctx.save()

  try {
    ctx.clearRect(0, 0, model.width, model.height)
    ctx.lineJoin = 'round'

    drawFilledRect(
      ctx,
      { x: 0, y: 0, width: model.width, height: model.height },
      model.theme.cardBackground,
    )
    drawStrokedRect(
      ctx,
      {
        x: CARD_BORDER_WIDTH / 2,
        y: CARD_BORDER_WIDTH / 2,
        width: model.width - CARD_BORDER_WIDTH,
        height: model.height - CARD_BORDER_WIDTH,
      },
      model.theme.cardBorder,
      CARD_BORDER_WIDTH,
    )

    drawFilledRect(ctx, model.headerRect, model.theme.headingBackground)
    drawStrokedRect(
      ctx,
      model.headerRect,
      model.theme.cardBorder,
      HEADER_BORDER_WIDTH,
    )

    for (const cell of model.cells) {
      drawFilledRect(ctx, cell.rect, cell.background)
      drawStrokedRect(ctx, cell.rect, model.theme.gridBorder, CELL_BORDER_WIDTH)
    }
    drawStrokedRect(ctx, model.gridRect, model.theme.gridBorder, GRID_BORDER_WIDTH)

    drawTextBlock(ctx, model.title, model.theme.headingText)
    if (model.participantName) {
      drawTextBlock(ctx, model.participantName, model.theme.headingText)
    }
    for (const cell of model.cells) {
      drawTextBlock(ctx, cell.text, model.theme.cellText)
    }
  } finally {
    ctx.restore()
  }
}
