import {
  MAX_SHARE_URL_LENGTH,
  type BingoState,
  type SourceLive,
} from '../types'
import type { DecodeFailureCode } from './setlistBingoCodec'
import {
  SHARE_QUERY_KEY,
  readSharedStateFromLocation,
  type ReadSharedStateResult,
} from './setlistBingoShareUrl'
import { parseBingoState } from './setlistBingoValidation'

export type PreviewResolutionErrorCode =
  | DecodeFailureCode
  | 'share_url_too_long'
  | 'missing_shared_state'
  | 'invalid_navigation_state'

export type PreviewResolution =
  | {
      kind: 'valid'
      state: BingoState
      source: 'memory' | 'url'
      sourceLive?: SourceLive
    }
  | { kind: 'invalid'; code: PreviewResolutionErrorCode }

type SharedStateReader = (href: string) => ReadSharedStateResult

const ERROR_MESSAGES = {
  share_url_too_long: '共有URLが長すぎます。',
  decoded_payload_too_large: '共有データが大きすぎます。',
  malformed_base64url: '共有URLの形式が正しくありません。',
  malformed_utf8: '共有データの文字コードが正しくありません。',
  malformed_json: '共有データを読み取れません。',
  not_an_object: '共有データの構造が正しくありません。',
  unsupported_version: '対応していない共有形式です。',
  missing_field: '共有データに必要な項目がありません。',
  unknown_field: '共有データに未対応の項目が含まれています。',
  invalid_field_type: '共有データの項目形式が正しくありません。',
  invalid_state: '共有データの内容が正しくありません。',
  missing_shared_state: '共有URLに必要な情報がありません。',
  invalid_navigation_state: 'プレビューに必要なビンゴ情報が無効です。',
} as const satisfies Record<PreviewResolutionErrorCode, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]) {
  const actualKeys = Object.keys(value)
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  )
}

function parseSourceLive(input: unknown): SourceLive | undefined {
  if (!isRecord(input)) return undefined

  const hasTourName = hasOwn(input, 'tourName')
  if (
    !hasExactKeys(input, hasTourName ? ['id', 'performanceName', 'tourName'] : ['id', 'performanceName']) ||
    typeof input.id !== 'string' ||
    input.id.trim().length === 0 ||
    typeof input.performanceName !== 'string' ||
    input.performanceName.trim().length === 0 ||
    (hasTourName && (typeof input.tourName !== 'string' || input.tourName.trim().length === 0))
  ) {
    return undefined
  }

  return {
    id: input.id,
    performanceName: input.performanceName,
    ...(hasTourName ? { tourName: input.tourName as string } : {}),
  }
}

function hasSharedStateQuery(href: string): boolean {
  try {
    return new URL(href, 'http://localhost').searchParams.has(SHARE_QUERY_KEY)
  } catch {
    return false
  }
}

function resolveFromMemory(navigationState: unknown): PreviewResolution {
  if (!isRecord(navigationState) || navigationState.kind !== 'preview-bingo') {
    return { kind: 'invalid', code: 'invalid_navigation_state' }
  }

  const includesSourceLive = hasOwn(navigationState, 'sourceLive')
  const expectedKeys = includesSourceLive
    ? ['kind', 'bingoState', 'sourceLive']
    : ['kind', 'bingoState']

  if (!hasExactKeys(navigationState, expectedKeys)) {
    return { kind: 'invalid', code: 'invalid_navigation_state' }
  }

  const parsedState = parseBingoState(navigationState.bingoState)
  if (!parsedState.ok) {
    return { kind: 'invalid', code: 'invalid_navigation_state' }
  }

  if (!includesSourceLive || navigationState.sourceLive === undefined) {
    return { kind: 'valid', state: parsedState.value, source: 'memory' }
  }

  const sourceLive = parseSourceLive(navigationState.sourceLive)
  if (sourceLive === undefined) {
    return { kind: 'invalid', code: 'invalid_navigation_state' }
  }

  return {
    kind: 'valid',
    state: parsedState.value,
    source: 'memory',
    sourceLive,
  }
}

/** Returns a fixed, content-independent Japanese message for a preview failure. */
export function getBingoErrorMessage(code: PreviewResolutionErrorCode): string {
  return ERROR_MESSAGES[code]
}

/**
 * Resolves the preview input once. A present `b` query is authoritative and
 * never falls back to React Router state, even when decoding fails.
 */
export function resolvePreviewInput(
  href: string,
  navigationState: unknown,
  sharedStateReader: SharedStateReader = readSharedStateFromLocation
): PreviewResolution {
  if (href.length > MAX_SHARE_URL_LENGTH) {
    return { kind: 'invalid', code: 'share_url_too_long' }
  }

  if (!hasSharedStateQuery(href)) {
    return resolveFromMemory(navigationState)
  }

  const sharedState = sharedStateReader(href)
  if (sharedState.ok) {
    return { kind: 'valid', state: sharedState.value, source: 'url' }
  }

  return {
    kind: 'invalid',
    code:
      sharedState.code === 'missing_state'
        ? 'missing_shared_state'
        : sharedState.code,
  }
}
