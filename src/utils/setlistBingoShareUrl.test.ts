import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  MAX_DECODED_PAYLOAD_BYTES,
  MAX_SHARE_URL_LENGTH,
  type BingoState,
} from '../types'
import { decodeBingoState, type DecodeResult } from './setlistBingoCodec'
import {
  SHARE_QUERY_KEY,
  buildCanonicalShareUrl,
  buildPreviewPath,
  readSharedStateFromLocation,
} from './setlistBingoShareUrl'

function createValidState(overrides: Partial<BingoState> = {}): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: '日本語ライブ 🎵',
    gridSize: 2,
    songTitles: ['曲A', '曲B', '曲C', '曲D'],
    designId: DEFAULT_BINGO_DESIGN_ID,
    ...overrides,
  }
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function padHrefToLength(href: string, targetLength: number): string {
  if (href.length >= targetLength) {
    throw new Error('The fixture href must be shorter than its target length')
  }

  return `${href}#${'x'.repeat(targetLength - href.length - 1)}`
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('setlistBingoShareUrl', () => {
  it.each([
    ['/', '/setlist-bingo/preview'],
    ['', '/setlist-bingo/preview'],
    ['/music-bubble-v2/', '/music-bubble-v2/setlist-bingo/preview'],
    ['/music-bubble-v2', '/music-bubble-v2/setlist-bingo/preview'],
  ])('builds the preview path for BASE_URL %j', (baseUrl, expected) => {
    expect(buildPreviewPath(baseUrl)).toBe(expected)
  })

  it.each([
    ['/', '/setlist-bingo/preview'],
    ['/music-bubble-v2/', '/music-bubble-v2/setlist-bingo/preview'],
  ])('builds a canonical deterministic URL for BASE_URL %j', (baseUrl, pathname) => {
    const state = createValidState()
    const first = buildCanonicalShareUrl(state, 'https://example.com', baseUrl)
    const second = buildCanonicalShareUrl({ ...state, songTitles: [...state.songTitles] }, 'https://example.com/', baseUrl)

    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }

    const url = new URL(first.url)
    expect(url.origin).toBe('https://example.com')
    expect(url.pathname).toBe(pathname)
    expect([...url.searchParams.keys()]).toEqual([SHARE_QUERY_KEY])
    expect(url.searchParams.getAll(SHARE_QUERY_KEY)).toEqual([first.encodedState])
    expect(url.hash).toBe('')
  })

  it('round-trips a canonical URL without Source Live or repository input', () => {
    const state = createValidState()
    const built = buildCanonicalShareUrl(
      state,
      'https://example.com',
      '/music-bubble-v2/'
    )

    expect(built.ok).toBe(true)
    if (!built.ok) {
      return
    }

    expect(readSharedStateFromLocation(built.url)).toEqual({ ok: true, value: state })
  })

  it.each([
    ['https://example.com/setlist-bingo/preview', 'missing query'],
    ['https://example.com/setlist-bingo/preview?b=', 'empty query'],
    ['https://example.com/setlist-bingo/preview?b=YQ&b=Yg', 'duplicate query'],
  ])('rejects a %s state value', (href) => {
    const decoder = vi.fn((): DecodeResult => ({
      ok: true,
      value: createValidState(),
    }))

    expect(readSharedStateFromLocation(href, SHARE_QUERY_KEY, decoder)).toEqual({
      ok: false,
      code: 'missing_state',
    })
    expect(decoder).not.toHaveBeenCalled()
  })

  it('allows exactly 2,000 characters and gates 2,001 before state decoding', () => {
    const baseHref = 'https://example.com/setlist-bingo/preview?b=YQ'
    const hrefAtLimit = padHrefToLength(baseHref, MAX_SHARE_URL_LENGTH)
    const hrefOverLimit = `${hrefAtLimit}x`
    const decoder = vi.fn((): DecodeResult => ({
      ok: true,
      value: createValidState(),
    }))

    expect(hrefAtLimit).toHaveLength(2_000)
    expect(readSharedStateFromLocation(hrefAtLimit, SHARE_QUERY_KEY, decoder)).toEqual({
      ok: true,
      value: createValidState(),
    })
    expect(decoder).toHaveBeenCalledOnce()
    expect(decoder).toHaveBeenCalledWith('YQ')

    decoder.mockClear()
    expect(hrefOverLimit).toHaveLength(2_001)
    expect(readSharedStateFromLocation(hrefOverLimit, SHARE_QUERY_KEY, decoder)).toEqual({
      ok: false,
      code: 'share_url_too_long',
    })
    expect(decoder).not.toHaveBeenCalled()
  })

  it('allows 8,192 decoded bytes and rejects 8,193 before UTF-8 and JSON parsing', () => {
    const atLimit = encodeBytes(new Uint8Array(MAX_DECODED_PAYLOAD_BYTES).fill(0x20))
    expect(decodeBingoState(atLimit)).toEqual({ ok: false, code: 'malformed_json' })

    const textDecoderConstructor = vi.fn()
    class UnexpectedTextDecoder {
      constructor() {
        textDecoderConstructor()
      }

      decode(): string {
        throw new Error('UTF-8 decoding must not start for an oversized payload')
      }
    }
    vi.stubGlobal('TextDecoder', UnexpectedTextDecoder)
    const jsonParse = vi.spyOn(JSON, 'parse')
    const overLimit = encodeBytes(
      new Uint8Array(MAX_DECODED_PAYLOAD_BYTES + 1).fill(0x20)
    )

    expect(decodeBingoState(overLimit)).toEqual({
      ok: false,
      code: 'decoded_payload_too_large',
    })
    expect(textDecoderConstructor).not.toHaveBeenCalled()
    expect(jsonParse).not.toHaveBeenCalled()
  })

  it('gates decoded payload bytes before constructing an outgoing URL', () => {
    const oversizedState = createValidState({
      songTitles: Array.from({ length: 4 }, () => '🎵'.repeat(1_100)),
    })

    expect(() =>
      buildCanonicalShareUrl(oversizedState, 'not a valid origin', '/')
    ).not.toThrow()
    expect(buildCanonicalShareUrl(oversizedState, 'not a valid origin', '/')).toEqual({
      ok: false,
      code: 'decoded_payload_too_large',
    })
  })

  it('rejects a completed outgoing URL over 2,000 characters', () => {
    const longValidState = createValidState({
      performanceName: '🎵'.repeat(80),
      gridSize: 4,
      songTitles: Array.from({ length: 16 }, (_, index) =>
        `${index}`.padEnd(50, '曲')
      ),
    })

    expect(buildCanonicalShareUrl(longValidState, 'https://example.com', '/')).toEqual({
      ok: false,
      code: 'share_url_too_long',
    })
  })
})
