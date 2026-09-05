import {
  BINGO_SCHEMA_VERSION,
  MAX_DECODED_PAYLOAD_BYTES,
  type BingoDesignId,
  type BingoState,
  type GridSize,
} from '../types'
import { parseBingoState } from './setlistBingoValidation'

interface BingoPayloadV1 {
  v: typeof BINGO_SCHEMA_VERSION
  p: string
  g: GridSize
  s: string[]
  d: BingoDesignId
  n?: string
}

export type DecodeFailureCode =
  | 'malformed_base64url'
  | 'decoded_payload_too_large'
  | 'malformed_utf8'
  | 'malformed_json'
  | 'not_an_object'
  | 'unsupported_version'
  | 'missing_field'
  | 'unknown_field'
  | 'invalid_field_type'
  | 'invalid_state'

export type DecodeResult =
  | { ok: true; value: BingoState }
  | { ok: false; code: DecodeFailureCode }

const REQUIRED_PAYLOAD_KEYS = ['v', 'p', 'g', 's', 'd'] as const
const ALLOWED_PAYLOAD_KEY_SET = new Set<string>([
  ...REQUIRED_PAYLOAD_KEYS,
  'n',
])
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/
const BINARY_STRING_CHUNK_SIZE = 0x8000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function isDenseStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!hasOwn(value, index) || typeof value[index] !== 'string') {
      return false
    }
  }

  return true
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += BINARY_STRING_CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, offset + BINARY_STRING_CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function bytesToBase64url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '')
}

function decodeBase64url(encoded: string): Uint8Array | undefined {
  if (!BASE64URL_PATTERN.test(encoded) || encoded.length % 4 === 1) {
    return undefined
  }

  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

  try {
    const binary = atob(paddedBase64)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

    // Reject non-canonical encodings whose unused trailing bits are non-zero.
    return bytesToBase64url(bytes) === encoded ? bytes : undefined
  } catch {
    return undefined
  }
}

function toPayload(state: BingoState): BingoPayloadV1 {
  return {
    v: state.schemaVersion,
    p: state.performanceName,
    g: state.gridSize,
    s: state.songTitles,
    d: state.designId,
    ...(state.participantName ? { n: state.participantName } : {}),
  }
}

/** Encodes a valid BingoState as deterministic, unpadded V1 Base64url. */
export function encodeBingoState(state: BingoState): string {
  const json = JSON.stringify(toPayload(state))
  return bytesToBase64url(new TextEncoder().encode(json))
}

/** Decodes and strictly validates current and legacy V1 shared-state values. */
export function decodeBingoState(encoded: string): DecodeResult {
  const bytes = decodeBase64url(encoded)
  if (bytes === undefined) {
    return { ok: false, code: 'malformed_base64url' }
  }

  if (bytes.byteLength > MAX_DECODED_PAYLOAD_BYTES) {
    return { ok: false, code: 'decoded_payload_too_large' }
  }

  let json: string
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return { ok: false, code: 'malformed_utf8' }
  }

  let payload: unknown
  try {
    payload = JSON.parse(json)
  } catch {
    return { ok: false, code: 'malformed_json' }
  }

  if (!isRecord(payload)) {
    return { ok: false, code: 'not_an_object' }
  }

  const actualKeys = Object.keys(payload)
  if (REQUIRED_PAYLOAD_KEYS.some((key) => !hasOwn(payload, key))) {
    return { ok: false, code: 'missing_field' }
  }
  if (actualKeys.some((key) => !ALLOWED_PAYLOAD_KEY_SET.has(key))) {
    return { ok: false, code: 'unknown_field' }
  }

  const hasParticipantName = hasOwn(payload, 'n')
  if (
    typeof payload.v !== 'number' ||
    typeof payload.p !== 'string' ||
    typeof payload.g !== 'number' ||
    !isDenseStringArray(payload.s) ||
    typeof payload.d !== 'string' ||
    (hasParticipantName && typeof payload.n !== 'string')
  ) {
    return { ok: false, code: 'invalid_field_type' }
  }

  if (payload.v !== BINGO_SCHEMA_VERSION) {
    return { ok: false, code: 'unsupported_version' }
  }

  const parsed = parseBingoState({
    schemaVersion: payload.v,
    performanceName: payload.p,
    ...(hasParticipantName ? { participantName: payload.n as string } : {}),
    gridSize: payload.g,
    songTitles: payload.s,
    designId: payload.d,
  })

  return parsed.ok
    ? { ok: true, value: parsed.value }
    : { ok: false, code: 'invalid_state' }
}
