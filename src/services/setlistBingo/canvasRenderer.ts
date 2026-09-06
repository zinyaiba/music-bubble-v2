import type {
  BingoHeadingRenderModel,
  BingoCardRenderModel,
  HeadingLine,
  Rect,
  TextBlock,
} from '../../utils/setlistBingoRenderModel'

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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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
  return `${block.fontWeight} ${fontSize}px ${block.fontFamily}`
}

/**
 * Lays out text at the model's fixed font size, wrapping only. This mirrors the
 * DOM card, which keeps its CSS `clamp()` size and never shrinks text, so the
 * PNG produces the same font size and line breaks as the preview.
 */
function layoutText(ctx: CanvasRenderingContext2D, block: TextBlock): TextLayout {
  const fontSize = Math.max(1, block.fontSize)
  ctx.font = createFont(block, fontSize)
  return {
    fontSize,
    lineHeight: fontSize * block.lineHeight,
    lines: wrapText(ctx, block.text, block.rect.width),
  }
}

function drawFilledRect(ctx: CanvasRenderingContext2D, rect: Rect, fillStyle: string): void {
  ctx.fillStyle = fillStyle
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
}

function drawStrokedRect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  strokeStyle: string,
  lineWidth: number
): void {
  ctx.strokeStyle = strokeStyle
  ctx.lineWidth = lineWidth
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
}

function drawTextBlock(ctx: CanvasRenderingContext2D, block: TextBlock, color: string): void {
  const layout = layoutText(ctx, block)
  const centerX = block.rect.x + block.rect.width / 2
  const firstLineY =
    block.rect.y + block.rect.height / 2 - ((layout.lines.length - 1) * layout.lineHeight) / 2

  ctx.fillStyle = color
  ctx.font = createFont(block, layout.fontSize)
  ctx.textAlign = block.horizontalAlign
  ctx.textBaseline = block.verticalAlign

  layout.lines.forEach((line, index) => {
    ctx.fillText(line, centerX, firstLineY + index * layout.lineHeight)
  })
}

interface WrappedHeadingLine {
  lines: readonly string[]
  fontSize: number
  lineHeight: number
  fontFamily: string
  fontWeight: HeadingLine['fontWeight']
}

/**
 * Draws the header as a vertically centered stack of wrapped lines, mirroring
 * the DOM `.bingo-card__heading` flex column. Each entry keeps its fixed font
 * size and the whole stack is centered, so a multi-line title or name never
 * clips the way a fixed rectangle would.
 */
function drawHeading(
  ctx: CanvasRenderingContext2D,
  heading: BingoHeadingRenderModel,
  color: string
): void {
  const wrapped: WrappedHeadingLine[] = heading.lines.map((line) => {
    const fontSize = Math.max(1, line.fontSize)
    ctx.font = `${line.fontWeight} ${fontSize}px ${line.fontFamily}`
    return {
      lines: wrapText(ctx, line.text, heading.contentWidth),
      fontSize,
      lineHeight: fontSize * line.lineHeight,
      fontFamily: line.fontFamily,
      fontWeight: line.fontWeight,
    }
  })

  const totalHeight =
    wrapped.reduce((sum, entry) => sum + entry.lines.length * entry.lineHeight, 0) +
    heading.gap * Math.max(0, wrapped.length - 1)

  const centerX = heading.rect.x + heading.rect.width / 2
  let cursorY = heading.rect.y + heading.rect.height / 2 - totalHeight / 2

  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  wrapped.forEach((entry, entryIndex) => {
    ctx.font = `${entry.fontWeight} ${entry.fontSize}px ${entry.fontFamily}`
    entry.lines.forEach((line) => {
      ctx.fillText(line, centerX, cursorY)
      cursorY += entry.lineHeight
    })
    if (entryIndex < wrapped.length - 1) {
      cursorY += heading.gap
    }
  })
}

/**
 * Draws the shared, fully resolved bingo render model without consulting the DOM,
 * loading resources, or performing network access.
 */
export function renderBingoCardToCanvas(
  ctx: CanvasRenderingContext2D,
  model: BingoCardRenderModel
): void {
  ctx.save()

  try {
    ctx.clearRect(0, 0, model.width, model.height)
    ctx.lineJoin = 'round'

    drawFilledRect(
      ctx,
      { x: 0, y: 0, width: model.width, height: model.height },
      model.theme.cardBackground
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
      CARD_BORDER_WIDTH
    )

    drawFilledRect(ctx, model.headerRect, model.theme.headingBackground)
    drawStrokedRect(ctx, model.headerRect, model.theme.cardBorder, HEADER_BORDER_WIDTH)

    for (const cell of model.cells) {
      drawFilledRect(ctx, cell.rect, cell.background)
      drawStrokedRect(ctx, cell.rect, model.theme.gridBorder, CELL_BORDER_WIDTH)
    }
    drawStrokedRect(ctx, model.gridRect, model.theme.gridBorder, GRID_BORDER_WIDTH)

    drawHeading(ctx, model.heading, model.theme.headingText)
    for (const cell of model.cells) {
      drawTextBlock(ctx, cell.text, model.theme.cellText)
    }
  } finally {
    ctx.restore()
  }
}
