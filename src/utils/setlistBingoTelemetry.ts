import type { BingoDesignId, GridSize } from '../types'

/** Content-independent actions that may be recorded for setlist bingo. */
export const SETLIST_BINGO_TELEMETRY_ACTION_TYPES = [
  'save-image',
  'share-image',
  'share-url',
] as const

export type SetlistBingoTelemetryActionType =
  (typeof SETLIST_BINGO_TELEMETRY_ACTION_TYPES)[number]

/**
 * The only metadata accepted by the setlist bingo analytics boundary.
 * Bingo content, URLs, files, and Source Live identifiers have no place in
 * this contract.
 */
export interface SetlistBingoTelemetryProjection {
  readonly actionType: SetlistBingoTelemetryActionType
  readonly gridSize: GridSize
  readonly designId: BingoDesignId
}

/** Content-independent operation names used by error and diagnostic logs. */
export type SetlistBingoLogOperation =
  | 'load-registered-songs'
  | 'resolve-preview'
  | 'generate-png'
  | 'download-png'
  | 'share-image'
  | 'build-share-url'
  | 'open-x-intent'

/** Fixed codes that may cross the setlist bingo error/log boundary. */
export type BingoOperationErrorCode =
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
  | 'share_url_too_long'
  | 'missing_shared_state'
  | 'invalid_navigation_state'
  | 'registered_songs_load_failed'
  | 'canvas_unavailable'
  | 'png_blob_failed'
  | 'download_failed'
  | 'file_share_failed'
  | 'x_intent_blocked'

/**
 * Public error and diagnostic payload. Raw exceptions and their messages are
 * intentionally absent so browser/input content cannot cross the boundary.
 */
export interface SetlistBingoSafeLogPayload {
  readonly code: BingoOperationErrorCode
  readonly operation: SetlistBingoLogOperation
}

export interface SetlistBingoTelemetryAdapter {
  track(payload: SetlistBingoTelemetryProjection): void
}

export interface SetlistBingoErrorAdapter {
  report(payload: SetlistBingoSafeLogPayload): void
}

export interface SetlistBingoDiagnosticAdapter {
  log(payload: SetlistBingoSafeLogPayload): void
}

/** Rebuilds analytics metadata with the exact three permitted own keys. */
export function projectSetlistBingoTelemetry(
  input: SetlistBingoTelemetryProjection,
): SetlistBingoTelemetryProjection {
  return {
    actionType: input.actionType,
    gridSize: input.gridSize,
    designId: input.designId,
  }
}

/** Rebuilds an error/log payload with the exact two permitted own keys. */
export function projectSetlistBingoSafeLog(
  input: SetlistBingoSafeLogPayload,
): SetlistBingoSafeLogPayload {
  return {
    code: input.code,
    operation: input.operation,
  }
}

/** Sends only the projected non-content analytics metadata to the adapter. */
export function trackSetlistBingoTelemetry(
  adapter: SetlistBingoTelemetryAdapter,
  input: SetlistBingoTelemetryProjection,
): void {
  adapter.track(projectSetlistBingoTelemetry(input))
}

/** Reports only a fixed code and operation; this API does not accept an exception. */
export function reportSetlistBingoError(
  adapter: SetlistBingoErrorAdapter,
  input: SetlistBingoSafeLogPayload,
): void {
  adapter.report(projectSetlistBingoSafeLog(input))
}

/** Logs diagnostics using the same content-free public payload as errors. */
export function logSetlistBingoDiagnostic(
  adapter: SetlistBingoDiagnosticAdapter,
  input: SetlistBingoSafeLogPayload,
): void {
  adapter.log(projectSetlistBingoSafeLog(input))
}
