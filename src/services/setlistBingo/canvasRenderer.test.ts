import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BINGO_SCHEMA_VERSION,
  GRID_SIZES,
  type BingoDesignId,
  type BingoState,
  type GridSize,
} from '../../types'
import {
  BINGO_CARD_SIZE,
  BINGO_DESIGNS,
  buildBingoCardRenderModel,
  resolveBingoTheme,
} from '../../utils/setlistBingoRenderModel'
import {
  BINGO_CANVAS_FONT_FAMILY,
  renderBingoCardToCanvas,
} from './canvasRenderer'

type CanvasOperation =
  | { kind: 'save' | 'restore' }
  | { kind: 'clear'; x: number; y: number; width: number; height: number }
  | {
      kind: 'fill-rect' | 'stroke-rect'
      x: number
      y: number
      width: number
      height: number
      style: string
      lineWidth: number
    }
  | {
      kind: 'text'
      text: string
      x: number
      y: number
      maxWidth: number | undefined
      style: string
      font: string
    }

interface MockContextResult {
  ctx: CanvasRenderingContext2D
  operations: CanvasOperation[]
  drawImage: ReturnType<typeof vi.fn>
}

function createMockContext(): MockContextResult {
  const operations: CanvasOperation[] = []
  const drawImage = vi.fn()
  const context = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineJoin: 'miter',
    font: `10px ${BINGO_CANVAS_FONT_FAMILY}`,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    save() {
      operations.push({ kind: 'save' })
    },
    restore() {
      operations.push({ kind: 'restore' })
    },
    clearRect(x: number, y: number, width: number, height: number) {
      operations.push({ kind: 'clear', x, y, width, height })
    },
    fillRect(x: number, y: number, width: number, height: number) {
      operations.push({
        kind: 'fill-rect',
        x,
        y,
        width,
        height,
        style: String(this.fillStyle),
        lineWidth: this.lineWidth,
      })
    },
    strokeRect(x: number, y: number, width: number, height: number) {
      operations.push({
        kind: 'stroke-rect',
        x,
        y,
        width,
        height,
        style: String(this.strokeStyle),
        lineWidth: this.lineWidth,
      })
    },
    measureText(text: string) {
      const fontSize = Number.parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '10')
      return { width: Array.from(text).length * fontSize * 0.62 } as TextMetrics
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      operations.push({
        kind: 'text',
        text,
        x,
        y,
        maxWidth,
        style: String(this.fillStyle),
        font: this.font,
      })
    },
    drawImage,
  }

  return {
    ctx: context as unknown as CanvasRenderingContext2D,
    operations,
    drawImage,
  }
}

function createRootStyle(): CSSStyleDeclaration {
  return {
    getPropertyValue: () => '',
  } as unknown as CSSStyleDeclaration
}

function createState(gridSize: GridSize, designId: BingoDesignId): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: `${gridSize}×${gridSize} 🎤テスト公演`,
    gridSize,
    songTitles: Array.from(
      { length: gridSize * gridSize },
      (_, index) => `予想曲 ${index + 1} 🌸`,
    ),
    designId,
  }
}

function createModel(gridSize: GridSize, designId: BingoDesignId) {
  const state = createState(gridSize, designId)
  return {
    state,
    model: buildBingoCardRenderModel(
      state,
      resolveBingoTheme(designId, createRootStyle()),
    ),
  }
}

function getTextOperations(operations: readonly CanvasOperation[]) {
  return operations.filter(
    (operation): operation is Extract<CanvasOperation, { kind: 'text' }> =>
      operation.kind === 'text',
  )
}

function getFontSize(font: string): number {
  return Number.parseFloat(/([\d.]+)px/.exec(font)?.[1] ?? '0')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('renderBingoCardToCanvas', () => {
  it('draws the 1080 card, header, row-major cells, grid border, then all text', () => {
    const { model } = createModel(2, 'rose-bubble')
    const { ctx, operations } = createMockContext()

    renderBingoCardToCanvas(ctx, model)

    expect(operations[0]).toEqual({ kind: 'save' })
    expect(operations[1]).toEqual({
      kind: 'clear',
      x: 0,
      y: 0,
      width: BINGO_CARD_SIZE,
      height: BINGO_CARD_SIZE,
    })
    expect(operations.at(-1)).toEqual({ kind: 'restore' })

    const firstTextIndex = operations.findIndex(({ kind }) => kind === 'text')
    const shapeOperations = operations.slice(2, firstTextIndex)
    expect(shapeOperations.map(({ kind }) => kind)).toEqual([
      'fill-rect',
      'stroke-rect',
      'fill-rect',
      'stroke-rect',
      'fill-rect',
      'stroke-rect',
      'fill-rect',
      'stroke-rect',
      'fill-rect',
      'stroke-rect',
      'fill-rect',
      'stroke-rect',
      'stroke-rect',
    ])

    const cellFills = shapeOperations.filter(
      (operation): operation is Extract<CanvasOperation, { kind: 'fill-rect' }> =>
        operation.kind === 'fill-rect' && operation.x >= model.gridRect.x,
    )
    expect(cellFills.map(({ x, y }) => ({ x, y }))).toEqual(
      model.cells.map(({ rect }) => ({ x: rect.x, y: rect.y })),
    )

    const text = getTextOperations(operations)
    expect(text.map(({ text: line }) => line).join('')).toBe(
      model.title.text + model.cells.map((cell) => cell.text.text).join(''),
    )
    expect(text[0]?.style).toBe(model.theme.headingText)
    expect(text.at(-1)?.style).toBe(model.theme.cellText)
  })

  it('draws the participant name after the title and before every cell', () => {
    const state = { ...createState(2, 'rose-bubble'), participantName: '参加者 🎤' }
    const model = buildBingoCardRenderModel(
      state,
      resolveBingoTheme(state.designId, createRootStyle()),
    )
    const { ctx, operations } = createMockContext()

    renderBingoCardToCanvas(ctx, model)

    const text = getTextOperations(operations)
    expect(text.map(({ text: line }) => line).join('')).toBe(
      model.title.text +
        model.participantName!.text +
        model.cells.map((cell) => cell.text.text).join(''),
    )
    expect(text.some(({ text: line }) => line.includes('名前：参加者 🎤'))).toBe(true)
  })

  for (const design of BINGO_DESIGNS) {
    for (const gridSize of GRID_SIZES) {
      it(`renders the complete ${gridSize}x${gridSize} ${design.id} shared model`, () => {
        const { model } = createModel(gridSize, design.id)
        const { ctx, operations } = createMockContext()

        renderBingoCardToCanvas(ctx, model)

        const text = getTextOperations(operations)
        expect(text.map(({ text: line }) => line).join('')).toBe(
          model.title.text + model.cells.map((cell) => cell.text.text).join(''),
        )
        expect(text.every(({ maxWidth }) => typeof maxWidth === 'number')).toBe(true)
        expect(text.every(({ font }) => font.includes(BINGO_CANVAS_FONT_FAMILY))).toBe(true)
        expect(text.every(({ font }) => !/url\(|https?:|woff|ttf/i.test(font))).toBe(true)

        const fillStyles = operations
          .filter(
            (operation): operation is Extract<CanvasOperation, { kind: 'fill-rect' }> =>
              operation.kind === 'fill-rect',
          )
          .map(({ style }) => style)
        expect(fillStyles).toContain(model.theme.cardBackground)
        expect(fillStyles).toContain(model.theme.headingBackground)
        expect(new Set(fillStyles)).toEqual(
          new Set([
            model.theme.cardBackground,
            model.theme.headingBackground,
            ...model.cells.map(({ background }) => background),
          ]),
        )
      })
    }
  }

  it('wraps and shrinks maximum-length Unicode text without dropping code points', () => {
    const performanceName = `🎤${'公'.repeat(78)}演`
    const songTitles = Array.from(
      { length: 16 },
      (_, index) => `${index.toString().padStart(2, '0')}${'曲'.repeat(47)}🌸`,
    )
    const state: BingoState = {
      schemaVersion: BINGO_SCHEMA_VERSION,
      performanceName,
      gridSize: 4,
      songTitles,
      designId: 'violet-ribbon',
    }
    const model = buildBingoCardRenderModel(
      state,
      resolveBingoTheme(state.designId, createRootStyle()),
    )
    const { ctx, operations } = createMockContext()

    renderBingoCardToCanvas(ctx, model)

    expect(Array.from(performanceName)).toHaveLength(80)
    expect(songTitles.every((title) => Array.from(title).length === 50)).toBe(true)

    const text = getTextOperations(operations)
    expect(text.map(({ text: line }) => line).join('')).toBe(
      performanceName + songTitles.join(''),
    )
    expect(text.length).toBeGreaterThan(1 + songTitles.length)
    expect(text.some(({ font }) => getFontSize(font) < model.title.maxFontSize)).toBe(true)
    expect(
      text.every(({ text: line }) => !/[\uD800-\uDBFF]$/.test(line) && !/^[\uDC00-\uDFFF]/.test(line)),
    ).toBe(true)
  })

  it('does not use images, fonts, DOM capture, or network resources', () => {
    const fetchSpy = vi.fn()
    const imageConstructor = vi.fn()
    const fontFaceConstructor = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    vi.stubGlobal('Image', imageConstructor)
    vi.stubGlobal('FontFace', fontFaceConstructor)
    const createElementSpy = vi.spyOn(document, 'createElement')
    const { model } = createModel(3, 'duo-pop')
    const { ctx, drawImage } = createMockContext()

    renderBingoCardToCanvas(ctx, model)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(imageConstructor).not.toHaveBeenCalled()
    expect(fontFaceConstructor).not.toHaveBeenCalled()
    expect(createElementSpy).not.toHaveBeenCalled()
    expect(drawImage).not.toHaveBeenCalled()
  })

  it('uses only resolved theme values and never reads CSS tokens while drawing', () => {
    const tokenRead = vi.fn(() => '')
    const state = createState(3, 'rose-bubble')
    const theme = resolveBingoTheme(state.designId, {
      getPropertyValue: tokenRead,
    } as unknown as CSSStyleDeclaration)
    const model = buildBingoCardRenderModel(state, theme)
    tokenRead.mockClear()
    const { ctx } = createMockContext()

    renderBingoCardToCanvas(ctx, model)

    expect(tokenRead).not.toHaveBeenCalled()
  })
})
