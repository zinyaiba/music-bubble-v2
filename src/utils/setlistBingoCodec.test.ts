import { describe, expect, it } from 'vitest'

import {
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  MAX_DECODED_PAYLOAD_BYTES,
  type BingoState,
} from '../types'
import { decodeBingoState, encodeBingoState } from './setlistBingoCodec'

function createValidState(overrides: Partial<BingoState> = {}): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: '日本語ライブ 🎵',
    gridSize: 2,
    songTitles: ['<script>alert(1)</script>', '曲名 🎤', 'e\u0301', '& text'],
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

function encodeJson(value: unknown): string {
  return encodeBytes(new TextEncoder().encode(JSON.stringify(value)))
}

function createValidPayload() {
  const state = createValidState()
  return {
    v: state.schemaVersion,
    p: state.performanceName,
    g: state.gridSize,
    s: state.songTitles,
    d: state.designId,
  }
}

describe('setlistBingoCodec', () => {
  it('round-trips Japanese, emoji, combining characters, markup-like plain text, and participant name', () => {
    const state = createValidState({ participantName: '参加者 🎤' })
    const encoded = encodeBingoState(state)

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(encoded).not.toContain('=')
    expect(decodeBingoState(encoded)).toEqual({ ok: true, value: state })
  })

  it('serializes only the fixed-order compact V1 keys', () => {
    const encoded = encodeBingoState(createValidState())
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (value) =>
        value.charCodeAt(0)
      )
    )

    expect(json).toBe(JSON.stringify(createValidPayload()))
    expect(Object.keys(JSON.parse(json) as object)).toEqual(['v', 'p', 'g', 's', 'd'])
  })

  it('adds only the optional compact name key while legacy payloads remain decodable', () => {
    const state = createValidState({ participantName: '参加者' })
    const encoded = encodeBingoState(state)
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (value) =>
        value.charCodeAt(0)
      )
    )

    expect(Object.keys(JSON.parse(json) as object)).toEqual(['v', 'p', 'g', 's', 'd', 'n'])
    expect(decodeBingoState(encodeJson(createValidPayload()))).toEqual({
      ok: true,
      value: createValidState(),
    })
  })

  it.each(['', 'abc=', 'abc+', 'abc/', 'abc!', 'A'])(
    'classifies malformed Base64url %j without exposing input',
    (encoded) => {
      expect(decodeBingoState(encoded)).toEqual({
        ok: false,
        code: 'malformed_base64url',
      })
    }
  )

  it('rejects a non-canonical Base64url trailing-bit encoding', () => {
    expect(decodeBingoState('AB')).toEqual({
      ok: false,
      code: 'malformed_base64url',
    })
  })

  it('checks decoded byte size before UTF-8 and JSON parsing', () => {
    const oversizedMalformedJson = new Uint8Array(MAX_DECODED_PAYLOAD_BYTES + 1).fill(
      0x20
    )

    expect(decodeBingoState(encodeBytes(oversizedMalformedJson))).toEqual({
      ok: false,
      code: 'decoded_payload_too_large',
    })
  })

  it('distinguishes malformed UTF-8 from malformed JSON', () => {
    expect(decodeBingoState(encodeBytes(Uint8Array.from([0xc3, 0x28])))).toEqual({
      ok: false,
      code: 'malformed_utf8',
    })
    expect(decodeBingoState(encodeBytes(new TextEncoder().encode('{')))).toEqual({
      ok: false,
      code: 'malformed_json',
    })
  })

  it.each([null, [], 'text', 1, true])('rejects non-object JSON root %j', (root) => {
    expect(decodeBingoState(encodeJson(root))).toEqual({
      ok: false,
      code: 'not_an_object',
    })
  })

  it('distinguishes missing and unknown own fields', () => {
    const payload = createValidPayload()
    const missingDesign = {
      v: payload.v,
      p: payload.p,
      g: payload.g,
      s: payload.s,
    }

    expect(decodeBingoState(encodeJson(missingDesign))).toEqual({
      ok: false,
      code: 'missing_field',
    })
    expect(decodeBingoState(encodeJson({ ...payload, extra: true }))).toEqual({
      ok: false,
      code: 'unknown_field',
    })
    expect(decodeBingoState(encodeJson({ ...payload, __proto_marker__: 'data' }))).toEqual({
      ok: false,
      code: 'unknown_field',
    })
  })

  it('distinguishes unsupported versions from invalid field types', () => {
    expect(decodeBingoState(encodeJson({ ...createValidPayload(), v: 2 }))).toEqual({
      ok: false,
      code: 'unsupported_version',
    })

    for (const payload of [
      { ...createValidPayload(), v: '1' },
      { ...createValidPayload(), p: 42 },
      { ...createValidPayload(), g: '2' },
      { ...createValidPayload(), s: 'song' },
      { ...createValidPayload(), s: ['A', 2, 'C', 'D'] },
      { ...createValidPayload(), d: 1 },
      { ...createValidPayload(), n: 42 },
    ]) {
      expect(decodeBingoState(encodeJson(payload))).toEqual({
        ok: false,
        code: 'invalid_field_type',
      })
    }
  })

  it.each([
    { ...createValidPayload(), p: '' },
    { ...createValidPayload(), g: 5 },
    { ...createValidPayload(), s: ['only one'] },
    { ...createValidPayload(), d: 'unknown-design' },
    { ...createValidPayload(), n: '' },
    { ...createValidPayload(), n: '参加者'.repeat(11) },
  ])('classifies schema-valid types with invalid BingoState semantics', (payload) => {
    expect(decodeBingoState(encodeJson(payload))).toEqual({
      ok: false,
      code: 'invalid_state',
    })
  })
})
