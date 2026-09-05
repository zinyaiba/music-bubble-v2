import {
  MAX_DECODED_PAYLOAD_BYTES,
  MAX_SHARE_URL_LENGTH,
  type BingoState,
} from '../types'
import {
  decodeBingoState,
  encodeBingoState,
  type DecodeResult,
} from './setlistBingoCodec'

export const SHARE_QUERY_KEY = 'b'
const PREVIEW_PATH = 'setlist-bingo/preview'

export type ShareUrlResult =
  | { ok: true; url: string; encodedState: string }
  | {
      ok: false
      code: 'decoded_payload_too_large' | 'share_url_too_long'
    }

export type ReadSharedStateResult =
  | DecodeResult
  | { ok: false; code: 'share_url_too_long' | 'missing_state' }

type StateDecoder = (encoded: string) => DecodeResult

/** Builds the basename-relative preview path without duplicating slashes. */
export function buildPreviewPath(baseUrl: string): string {
  const normalizedBase = baseUrl
    .split('/')
    .filter((segment) => segment.length > 0)
    .join('/')

  return normalizedBase.length > 0
    ? `/${normalizedBase}/${PREVIEW_PATH}`
    : `/${PREVIEW_PATH}`
}

function getDecodedByteLength(encoded: string): number {
  const completeQuartets = Math.floor(encoded.length / 4)
  const remainder = encoded.length % 4
  const trailingBytes = remainder === 2 ? 1 : remainder === 3 ? 2 : 0

  return completeQuartets * 3 + trailingBytes
}

/** Builds a deterministic share URL containing only one `b` query parameter. */
export function buildCanonicalShareUrl(
  state: BingoState,
  origin: string,
  baseUrl: string
): ShareUrlResult {
  const encodedState = encodeBingoState(state)

  if (getDecodedByteLength(encodedState) > MAX_DECODED_PAYLOAD_BYTES) {
    return { ok: false, code: 'decoded_payload_too_large' }
  }

  const url = new URL(buildPreviewPath(baseUrl), origin)
  url.search = ''
  url.hash = ''
  url.searchParams.set(SHARE_QUERY_KEY, encodedState)

  const canonicalUrl = url.toString()
  if (canonicalUrl.length > MAX_SHARE_URL_LENGTH) {
    return { ok: false, code: 'share_url_too_long' }
  }

  return { ok: true, url: canonicalUrl, encodedState }
}

/**
 * Reads one non-empty shared-state query value after gating the full href.
 * The optional decoder is an observation seam for order-focused unit tests.
 */
export function readSharedStateFromLocation(
  href: string,
  queryKey = SHARE_QUERY_KEY,
  decoder: StateDecoder = decodeBingoState
): ReadSharedStateResult {
  if (href.length > MAX_SHARE_URL_LENGTH) {
    return { ok: false, code: 'share_url_too_long' }
  }

  let url: URL
  try {
    url = new URL(href)
  } catch {
    return { ok: false, code: 'missing_state' }
  }

  const stateValues = url.searchParams.getAll(queryKey)
  if (stateValues.length !== 1 || stateValues[0].length === 0) {
    return { ok: false, code: 'missing_state' }
  }

  return decoder(stateValues[0])
}
