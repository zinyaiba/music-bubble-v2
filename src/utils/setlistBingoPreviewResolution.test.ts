import { describe, expect, it, vi } from 'vitest'

import {
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  MAX_SHARE_URL_LENGTH,
  type BingoState,
} from '../types'
import { encodeBingoState, type DecodeFailureCode } from './setlistBingoCodec'
import {
  getBingoErrorMessage,
  resolvePreviewInput,
  type PreviewResolutionErrorCode,
} from './setlistBingoPreviewResolution'

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

function createPreviewRouteState(bingoState: unknown = createValidState()) {
  return {
    kind: 'preview-bingo',
    bingoState,
    sourceLive: { id: 'live-secret-id', performanceName: '非公開ライブ名' },
  }
}

function encodeJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function expectContentFreeInvalidResult(
  result: ReturnType<typeof resolvePreviewInput>,
  code: PreviewResolutionErrorCode
) {
  expect(result).toEqual({ kind: 'invalid', code })
  expect(Object.keys(result).sort()).toEqual(['code', 'kind'])
  expect(JSON.stringify(result)).not.toContain('日本語ライブ')
  expect(JSON.stringify(result)).not.toContain('非公開ライブ名')
  expect(JSON.stringify(result)).not.toContain('live-secret-id')
}

describe('resolvePreviewInput', () => {
  it('strictly revalidates a valid Router state when the query is absent', () => {
    const routeState = createPreviewRouteState()

    expect(resolvePreviewInput('https://example.com/setlist-bingo/preview', routeState)).toEqual({
      kind: 'valid',
      state: createValidState(),
      source: 'memory',
      sourceLive: routeState.sourceLive,
    })
  })

  it.each([
    ['missing route state', undefined],
    ['wrong route kind', { ...createPreviewRouteState(), kind: 'edit-bingo' }],
    ['unknown route field', { ...createPreviewRouteState(), unexpected: true }],
    [
      'unknown BingoState field',
      createPreviewRouteState({ ...createValidState(), leaked: '日本語ライブ' }),
    ],
    [
      'unnormalized BingoState',
      createPreviewRouteState(createValidState({ performanceName: ' 日本語ライブ 🎵' })),
    ],
    [
      'invalid Source Live',
      { ...createPreviewRouteState(), sourceLive: { id: '', performanceName: '非公開ライブ名' } },
    ],
  ])('rejects %s without exposing navigation content', (_label, routeState) => {
    expectContentFreeInvalidResult(
      resolvePreviewInput('https://example.com/setlist-bingo/preview', routeState),
      'invalid_navigation_state'
    )
  })

  it('resolves a valid shared URL without retaining memory-only Source Live data', () => {
    const encoded = encodeBingoState(createValidState())

    expect(
      resolvePreviewInput(
        `https://example.com/setlist-bingo/preview?b=${encoded}`,
        createPreviewRouteState()
      )
    ).toEqual({ kind: 'valid', state: createValidState(), source: 'url' })
  })

  it.each([
    ['malformed query', '%%%'],
    ['unsupported version', encodeJson({ v: 2, p: '公演', g: 2, s: ['A', 'B', 'C', 'D'], d: 'rose-bubble' })],
    ['unknown field', encodeJson({ v: 1, p: '公演', g: 2, s: ['A', 'B', 'C', 'D'], d: 'rose-bubble', secret: '日本語ライブ' })],
  ])('does not fall back to valid memory state for a present %s', (_label, encoded) => {
    const result = resolvePreviewInput(
      `https://example.com/setlist-bingo/preview?b=${encoded}`,
      createPreviewRouteState()
    )

    expect(result.kind).toBe('invalid')
    expect(result.kind === 'invalid' ? result.code : undefined).not.toBe(
      'invalid_navigation_state'
    )
    expect(Object.keys(result).sort()).toEqual(['code', 'kind'])
  })

  it.each([
    ['empty query', 'https://example.com/setlist-bingo/preview?b='],
    ['duplicate query', 'https://example.com/setlist-bingo/preview?b=YQ&b=Yg'],
  ])('maps a present %s to missing shared state without memory fallback', (_label, href) => {
    expectContentFreeInvalidResult(
      resolvePreviewInput(href, createPreviewRouteState()),
      'missing_shared_state'
    )
  })

  it('gates an oversized URL before reading query or memory state', () => {
    const href = `https://example.com/?${'x'.repeat(MAX_SHARE_URL_LENGTH)}`
    const reader = vi.fn()

    expectContentFreeInvalidResult(
      resolvePreviewInput(href, createPreviewRouteState(), reader),
      'share_url_too_long'
    )
    expect(reader).not.toHaveBeenCalled()
  })

  it.each<DecodeFailureCode>([
    'malformed_base64url',
    'decoded_payload_too_large',
    'malformed_utf8',
    'malformed_json',
    'not_an_object',
    'unsupported_version',
    'missing_field',
    'unknown_field',
    'invalid_field_type',
    'invalid_state',
  ])('preserves content-independent shared-state reason %s', (code) => {
    const reader = vi.fn(() => ({ ok: false as const, code }))

    expectContentFreeInvalidResult(
      resolvePreviewInput(
        'https://example.com/setlist-bingo/preview?b=redacted',
        createPreviewRouteState(),
        reader
      ),
      code
    )
    expect(reader).toHaveBeenCalledOnce()
  })
})

describe('getBingoErrorMessage', () => {
  it.each<[PreviewResolutionErrorCode, string]>([
    ['share_url_too_long', '共有URLが長すぎます。'],
    ['decoded_payload_too_large', '共有データが大きすぎます。'],
    ['malformed_base64url', '共有URLの形式が正しくありません。'],
    ['malformed_utf8', '共有データの文字コードが正しくありません。'],
    ['malformed_json', '共有データを読み取れません。'],
    ['not_an_object', '共有データの構造が正しくありません。'],
    ['unsupported_version', '対応していない共有形式です。'],
    ['missing_field', '共有データに必要な項目がありません。'],
    ['unknown_field', '共有データに未対応の項目が含まれています。'],
    ['invalid_field_type', '共有データの項目形式が正しくありません。'],
    ['invalid_state', '共有データの内容が正しくありません。'],
    ['missing_shared_state', '共有URLに必要な情報がありません。'],
    ['invalid_navigation_state', 'プレビューに必要なビンゴ情報が無効です。'],
  ])('maps %s to fixed content-independent Japanese text', (code, message) => {
    expect(getBingoErrorMessage(code)).toBe(message)
  })
})
