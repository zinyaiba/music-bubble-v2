/**
 * Setlist Bingo domain types and shared limits.
 *
 * Bingo content is intentionally limited to in-memory/router state and the
 * versioned share URL. These types do not include persistence metadata.
 */

/** Current schema version used by valid bingo state. */
export const BINGO_SCHEMA_VERSION = 1 as const

/** Supported square grid dimensions. */
export const GRID_SIZES = [2, 3, 4] as const
export type GridSize = (typeof GRID_SIZES)[number]

/** Supported prediction counts derived from the square grid dimensions. */
export const BINGO_SONG_COUNTS = [4, 9, 16] as const
export type BingoSongCount = (typeof BINGO_SONG_COUNTS)[number]

export interface GridSizeOption {
  gridSize: GridSize
  songCount: BingoSongCount
  label: string
}

/** Selectable grid options shown by the create form. */
export const GRID_SIZE_OPTIONS = [
  { gridSize: 2, songCount: 4, label: '4曲' },
  { gridSize: 3, songCount: 9, label: '9曲' },
  { gridSize: 4, songCount: 16, label: '16曲' },
] as const satisfies readonly GridSizeOption[]

/** Stable identifiers for the Design System based bingo variants. */
export const BINGO_DESIGN_IDS = ['rose-bubble', 'violet-ribbon', 'duo-pop'] as const
export type BingoDesignId = (typeof BINGO_DESIGN_IDS)[number]

export const DEFAULT_BINGO_DESIGN_ID: BingoDesignId = 'rose-bubble'

/** Input limits are measured in Unicode code points after trimming. */
export const MAX_PERFORMANCE_NAME_LENGTH = 80
export const MAX_PARTICIPANT_NAME_LENGTH = 30
export const MAX_SONG_TITLE_LENGTH = 50

/** Canonical share URL and decoded UTF-8 payload limits. */
export const MAX_SHARE_URL_LENGTH = 2_000
export const MAX_DECODED_PAYLOAD_BYTES = 8_192

/** Editable prediction slot used only while creating a bingo. */
export interface PredictionSongDraft {
  songTitle: string
  registeredSongId?: string
}

/** Unvalidated state owned by the create page. */
export interface DraftBingoState {
  performanceName: string
  participantName: string
  gridSize: GridSize
  songs: PredictionSongDraft[]
  designId: BingoDesignId | ''
}

/**
 * Minimal normalized state required to reproduce a bingo card.
 * Registered song IDs, source live data, UI state, and timestamps are excluded.
 */
export interface BingoState {
  schemaVersion: typeof BINGO_SCHEMA_VERSION
  performanceName: string
  /** Optional participant name; omitted only by legacy in-memory/shared states. */
  participantName?: string
  gridSize: GridSize
  songTitles: string[]
  designId: BingoDesignId
}

export interface SourceLive {
  id: string
  performanceName: string
  /** Present only when the create flow originated from a tour detail page. */
  tourName?: string
}

export type CreateRouteState =
  | { kind: 'source-live'; sourceLive: SourceLive }
  | { kind: 'edit-bingo'; bingoState: BingoState; sourceLive?: SourceLive }

export interface PreviewRouteState {
  kind: 'preview-bingo'
  bingoState: BingoState
  sourceLive?: SourceLive
}

export type ValidationIssueCode =
  | 'performance_name_required'
  | 'performance_name_too_long'
  | 'participant_name_too_long'
  | 'invalid_grid_size'
  | 'song_count_mismatch'
  | 'song_title_too_long'
  | 'design_required'
  | 'unknown_design'

export type ValidationIssuePath =
  | 'performanceName'
  | 'participantName'
  | 'gridSize'
  | 'designId'
  | `songs.${number}`

export interface ValidationIssue {
  code: ValidationIssueCode
  path: ValidationIssuePath
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] }
