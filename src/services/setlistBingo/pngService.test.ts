import { describe, expect, it, vi } from 'vitest'
import { BINGO_SCHEMA_VERSION, type BingoState } from '../../types'
import { BINGO_CARD_SIZE } from '../../utils/setlistBingoRenderModel'
import {
  BingoPngError,
  DEFAULT_BINGO_PNG_FILENAME,
  PNG_MIME_TYPE,
  createBingoPngFilename,
  downloadPng,
  generateBingoPng,
  type PngDownloadDependencies,
  type PngGenerationDependencies,
} from './pngService'

function createState(): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: 'PNGテスト公演',
    gridSize: 2,
    songTitles: ['曲1', '曲2', '曲3', '曲4'],
    designId: 'rose-bubble',
  }
}

function createRootStyle(): CSSStyleDeclaration {
  return {
    getPropertyValue: () => '',
  } as unknown as CSSStyleDeclaration
}

interface GenerationFixture {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  toBlob: ReturnType<typeof vi.fn>
  renderToCanvas: ReturnType<typeof vi.fn>
  dependencies: PngGenerationDependencies
}

function createGenerationFixture(blob: Blob | null): GenerationFixture {
  const context = {} as CanvasRenderingContext2D
  const toBlob = vi.fn((callback: BlobCallback, type?: string) => {
    expect(type).toBe(PNG_MIME_TYPE)
    callback(blob)
  })
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
    toBlob,
  } as unknown as HTMLCanvasElement
  const renderToCanvas = vi.fn()

  return {
    canvas,
    context,
    toBlob,
    renderToCanvas,
    dependencies: {
      createCanvas: vi.fn(() => canvas),
      renderToCanvas,
    },
  }
}

function expectCode(error: unknown, code: BingoPngError['code']): boolean {
  expect(error).toBeInstanceOf(BingoPngError)
  expect(error).toMatchObject({ code, message: code })
  return true
}

describe('generateBingoPng', () => {
  it('creates and renders a 1080 canvas, then returns an image/png Blob', async () => {
    const pngBlob = new Blob(['png'], { type: PNG_MIME_TYPE })
    const fixture = createGenerationFixture(pngBlob)

    const result = await generateBingoPng(
      createState(),
      createRootStyle(),
      fixture.dependencies,
    )

    expect(result).toBe(pngBlob)
    expect(fixture.canvas.width).toBe(BINGO_CARD_SIZE)
    expect(fixture.canvas.height).toBe(BINGO_CARD_SIZE)
    expect(fixture.canvas.getContext).toHaveBeenCalledOnce()
    expect(fixture.canvas.getContext).toHaveBeenCalledWith('2d')
    expect(fixture.renderToCanvas).toHaveBeenCalledOnce()
    expect(fixture.renderToCanvas.mock.calls[0]?.[0]).toBe(fixture.context)
    expect(fixture.renderToCanvas.mock.calls[0]?.[1]).toMatchObject({
      width: BINGO_CARD_SIZE,
      height: BINGO_CARD_SIZE,
      title: { text: 'PNGテスト公演' },
    })
    expect(fixture.toBlob).toHaveBeenCalledOnce()
  })

  it('returns canvas_unavailable when a 2D context cannot be obtained', async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
      toBlob: vi.fn(),
    } as unknown as HTMLCanvasElement

    await expect(
      generateBingoPng(createState(), createRootStyle(), {
        createCanvas: () => canvas,
        renderToCanvas: vi.fn(),
      }),
    ).rejects.toSatisfy((error: unknown) => expectCode(error, 'canvas_unavailable'))
    expect(canvas.toBlob).not.toHaveBeenCalled()
  })

  it.each([
    ['a null Blob', null],
    ['a non-PNG Blob', new Blob(['not png'], { type: 'image/jpeg' })],
  ])('returns png_blob_failed when toBlob supplies %s', async (_label, blob) => {
    const fixture = createGenerationFixture(blob)

    await expect(
      generateBingoPng(createState(), createRootStyle(), fixture.dependencies),
    ).rejects.toSatisfy((error: unknown) => expectCode(error, 'png_blob_failed'))
  })

  it('maps renderer and synchronous toBlob failures without exposing exceptions', async () => {
    const renderFixture = createGenerationFixture(
      new Blob(['png'], { type: PNG_MIME_TYPE }),
    )
    renderFixture.renderToCanvas.mockImplementation(() => {
      throw new Error('input-derived renderer detail')
    })

    await expect(
      generateBingoPng(createState(), createRootStyle(), renderFixture.dependencies),
    ).rejects.toSatisfy((error: unknown) => expectCode(error, 'png_blob_failed'))

    const blobFixture = createGenerationFixture(
      new Blob(['png'], { type: PNG_MIME_TYPE }),
    )
    blobFixture.toBlob.mockImplementation(() => {
      throw new Error('browser implementation detail')
    })

    await expect(
      generateBingoPng(createState(), createRootStyle(), blobFixture.dependencies),
    ).rejects.toSatisfy((error: unknown) => expectCode(error, 'png_blob_failed'))
  })
})

describe('createBingoPngFilename', () => {
  it('removes path, control, and reserved filename hazards and bounds the stem', () => {
    const filename = createBingoPngFilename(` ../危険<公演>?\u0000 ${'長'.repeat(100)} `)

    expect(filename).toMatch(/\.png$/u)
    expect(filename).not.toMatch(/[<>:"/\\|?*]/u)
    expect(
      Array.from(filename).every((character) => (character.codePointAt(0) ?? 0) > 0x1f),
    ).toBe(true)
    expect(Array.from(filename.replace(/\.png$/u, '')).length).toBeLessThanOrEqual(64 + 15)
  })

  it('uses the fixed fallback when no safe performance name remains', () => {
    expect(createBingoPngFilename(' ../<>:"/\\|?* ')).toBe(
      DEFAULT_BINGO_PNG_FILENAME,
    )
  })
})

describe('downloadPng', () => {
  function createDownloadFixture(): {
    anchor: HTMLAnchorElement
    click: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    dependencies: PngDownloadDependencies
  } {
    const click = vi.fn()
    const remove = vi.fn()
    const anchor = {
      href: '',
      download: '',
      hidden: false,
      click,
      remove,
    } as unknown as HTMLAnchorElement

    return {
      anchor,
      click,
      remove,
      dependencies: {
        createObjectURL: vi.fn(() => 'blob:one-time-url'),
        revokeObjectURL: vi.fn(),
        createAnchor: vi.fn(() => anchor),
        appendAnchor: vi.fn(),
      },
    }
  }

  it('clicks exactly once with a safe filename, then removes and revokes', () => {
    const fixture = createDownloadFixture()
    const blob = new Blob(['png'], { type: PNG_MIME_TYPE })

    downloadPng(blob, '../unsafe<name>?.png', fixture.dependencies)

    expect(fixture.dependencies.createObjectURL).toHaveBeenCalledOnce()
    expect(fixture.dependencies.createObjectURL).toHaveBeenCalledWith(blob)
    expect(fixture.dependencies.appendAnchor).toHaveBeenCalledOnce()
    expect(fixture.dependencies.appendAnchor).toHaveBeenCalledWith(fixture.anchor)
    expect(fixture.anchor.href).toBe('blob:one-time-url')
    expect(fixture.anchor.download).toBe('unsafe-name.png')
    expect(fixture.anchor.hidden).toBe(true)
    expect(fixture.click).toHaveBeenCalledOnce()
    expect(fixture.remove).toHaveBeenCalledOnce()
    expect(fixture.dependencies.revokeObjectURL).toHaveBeenCalledOnce()
    expect(fixture.dependencies.revokeObjectURL).toHaveBeenCalledWith(
      'blob:one-time-url',
    )
  })

  it('still removes and revokes when the download click fails', () => {
    const fixture = createDownloadFixture()
    fixture.click.mockImplementation(() => {
      throw new Error('browser detail')
    })

    expect(() =>
      downloadPng(
        new Blob(['png'], { type: PNG_MIME_TYPE }),
        'card.png',
        fixture.dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'download_failed' }))
    expect(fixture.click).toHaveBeenCalledOnce()
    expect(fixture.remove).toHaveBeenCalledOnce()
    expect(fixture.dependencies.revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('attempts revoke even if anchor cleanup fails', () => {
    const fixture = createDownloadFixture()
    fixture.remove.mockImplementation(() => {
      throw new Error('cleanup detail')
    })

    expect(() =>
      downloadPng(
        new Blob(['png'], { type: PNG_MIME_TYPE }),
        'card.png',
        fixture.dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'download_failed' }))
    expect(fixture.click).toHaveBeenCalledOnce()
    expect(fixture.remove).toHaveBeenCalledOnce()
    expect(fixture.dependencies.revokeObjectURL).toHaveBeenCalledOnce()
  })

  it('rejects a non-PNG Blob before creating an Object URL', () => {
    const fixture = createDownloadFixture()

    expect(() =>
      downloadPng(
        new Blob(['jpeg'], { type: 'image/jpeg' }),
        'card.png',
        fixture.dependencies,
      ),
    ).toThrowError(expect.objectContaining({ code: 'download_failed' }))
    expect(fixture.dependencies.createObjectURL).not.toHaveBeenCalled()
    expect(fixture.click).not.toHaveBeenCalled()
    expect(fixture.remove).not.toHaveBeenCalled()
    expect(fixture.dependencies.revokeObjectURL).not.toHaveBeenCalled()
  })
})
