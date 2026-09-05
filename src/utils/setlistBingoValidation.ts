import {
  BINGO_DESIGN_IDS,
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  GRID_SIZES,
  MAX_PARTICIPANT_NAME_LENGTH,
  MAX_PERFORMANCE_NAME_LENGTH,
  MAX_SONG_TITLE_LENGTH,
  type BingoDesignId,
  type BingoState,
  type CreateRouteState,
  type DraftBingoState,
  type GridSize,
  type SourceLive,
  type ValidationIssue,
  type ValidationResult,
} from '../types'

const LEGACY_BINGO_STATE_KEYS = [
  'schemaVersion',
  'performanceName',
  'gridSize',
  'songTitles',
  'designId',
] as const
const CURRENT_BINGO_STATE_KEYS = [
  ...LEGACY_BINGO_STATE_KEYS,
  'participantName',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value)
  return (
    actualKeys.length === expectedKeys.length &&
    actualKeys.every((key) => expectedKeys.includes(key))
  )
}

function isGridSize(value: unknown): value is GridSize {
  return typeof value === 'number' && (GRID_SIZES as readonly number[]).includes(value)
}

function isBingoDesignId(value: unknown): value is BingoDesignId {
  return (
    typeof value === 'string' && (BINGO_DESIGN_IDS as readonly string[]).includes(value)
  )
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

function isSourceLive(value: unknown): value is SourceLive {
  if (!isRecord(value)) return false

  const hasTourName = hasOwn(value, 'tourName')
  if (!hasExactKeys(value, hasTourName ? ['id', 'performanceName', 'tourName'] : ['id', 'performanceName'])) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.performanceName === 'string' &&
    value.performanceName.trim().length > 0 &&
    (!hasTourName || (typeof value.tourName === 'string' && value.tourName.trim().length > 0))
  )
}

function emptyPredictionSongs(gridSize: GridSize) {
  return Array.from({ length: gridSize * gridSize }, () => ({ songTitle: '' }))
}

function createNewDraft(performanceName = ''): DraftBingoState {
  const gridSize: GridSize = 3
  return {
    performanceName,
    participantName: '',
    gridSize,
    songs: emptyPredictionSongs(gridSize),
    designId: DEFAULT_BINGO_DESIGN_ID,
  }
}

/** Counts Unicode code points rather than UTF-16 code units. */
export function countUnicodeCodePoints(value: string): number {
  return Array.from(value).length
}

/**
 * Creates the page-local draft from an untrusted React Router state.
 * Invalid route state is never partially restored.
 */
export function initializeDraft(state: unknown): {
  draft: DraftBingoState
  sourceLive?: SourceLive
} {
  if (!isRecord(state) || typeof state.kind !== 'string') {
    return { draft: createNewDraft() }
  }

  if (
    state.kind === 'source-live' &&
    hasExactKeys(state, ['kind', 'sourceLive']) &&
    isSourceLive(state.sourceLive)
  ) {
    return {
      draft: createNewDraft(state.sourceLive.performanceName),
      sourceLive: state.sourceLive,
    }
  }

  if (state.kind === 'edit-bingo') {
    const hasSourceLive = hasOwn(state, 'sourceLive')
    const expectedKeys = hasSourceLive
      ? ['kind', 'bingoState', 'sourceLive']
      : ['kind', 'bingoState']

    if (hasExactKeys(state, expectedKeys)) {
      const sourceLive = hasSourceLive ? state.sourceLive : undefined
      if (sourceLive !== undefined && !isSourceLive(sourceLive)) {
        return { draft: createNewDraft() }
      }

      const parsed = parseBingoState(state.bingoState)
      if (parsed.ok) {
        return {
          draft: {
            performanceName: parsed.value.performanceName,
            participantName: parsed.value.participantName ?? '',
            gridSize: parsed.value.gridSize,
            songs: parsed.value.songTitles.map((songTitle) => ({ songTitle })),
            designId: parsed.value.designId,
          },
          ...(isSourceLive(sourceLive) ? { sourceLive } : {}),
        }
      }
    }
  }

  return { draft: createNewDraft() }
}

/** Normalizes and validates all create-page fields without mutating the draft. */
export function validateDraftBingoState(
  draft: DraftBingoState
): ValidationResult<BingoState> {
  const issues: ValidationIssue[] = []
  const performanceName =
    typeof draft.performanceName === 'string' ? draft.performanceName.trim() : ''
  const participantName =
    typeof draft.participantName === 'string' ? draft.participantName.trim() : ''

  if (performanceName.length === 0) {
    issues.push({ code: 'performance_name_required', path: 'performanceName' })
  } else if (countUnicodeCodePoints(performanceName) > MAX_PERFORMANCE_NAME_LENGTH) {
    issues.push({ code: 'performance_name_too_long', path: 'performanceName' })
  }

  if (countUnicodeCodePoints(participantName) > MAX_PARTICIPANT_NAME_LENGTH) {
    issues.push({ code: 'participant_name_too_long', path: 'participantName' })
  }

  const validGridSize = isGridSize(draft.gridSize)
  if (!validGridSize) {
    issues.push({ code: 'invalid_grid_size', path: 'gridSize' })
  }

  const songs = Array.isArray(draft.songs) ? draft.songs : []
  if (validGridSize && songs.length !== draft.gridSize * draft.gridSize) {
    issues.push({ code: 'song_count_mismatch', path: 'gridSize' })
  }

  const songTitles = Array.from(songs, (song, index) => {
    const songTitle =
      isRecord(song) && typeof song.songTitle === 'string' ? song.songTitle.trim() : ''

    if (songTitle.length > 0 && countUnicodeCodePoints(songTitle) > MAX_SONG_TITLE_LENGTH) {
      issues.push({ code: 'song_title_too_long', path: `songs.${index}` })
    }

    return songTitle
  })

  if (draft.designId === '') {
    issues.push({ code: 'design_required', path: 'designId' })
  } else if (!isBingoDesignId(draft.designId)) {
    issues.push({ code: 'unknown_design', path: 'designId' })
  }

  if (issues.length > 0 || !validGridSize || !isBingoDesignId(draft.designId)) {
    return { ok: false, issues }
  }

  return {
    ok: true,
    value: {
      schemaVersion: BINGO_SCHEMA_VERSION,
      performanceName,
      ...(participantName ? { participantName } : {}),
      gridSize: draft.gridSize,
      songTitles,
      designId: draft.designId,
    },
  }
}

/** Strictly parses current and legacy normalized BingoState values. */
export function parseBingoState(input: unknown): ValidationResult<BingoState> {
  if (!isRecord(input)) {
    return { ok: false, issues: [] }
  }

  const hasParticipantName = hasOwn(input, 'participantName')
  const expectedKeys = hasParticipantName
    ? CURRENT_BINGO_STATE_KEYS
    : LEGACY_BINGO_STATE_KEYS
  if (!hasExactKeys(input, expectedKeys)) {
    return { ok: false, issues: [] }
  }

  if (
    input.schemaVersion !== BINGO_SCHEMA_VERSION ||
    typeof input.performanceName !== 'string' ||
    (hasParticipantName && typeof input.participantName !== 'string') ||
    !isGridSize(input.gridSize) ||
    !isDenseStringArray(input.songTitles) ||
    typeof input.designId !== 'string'
  ) {
    return { ok: false, issues: [] }
  }

  const songTitles = input.songTitles
  const result = validateDraftBingoState({
    performanceName: input.performanceName,
    participantName: hasParticipantName ? (input.participantName as string) : '',
    gridSize: input.gridSize,
    songs: songTitles.map((songTitle) => ({ songTitle })),
    designId: input.designId as BingoDesignId | '',
  })

  if (
    !result.ok ||
    result.value.performanceName !== input.performanceName ||
    (hasParticipantName && result.value.participantName !== input.participantName) ||
    result.value.songTitles.some((songTitle, index) => songTitle !== songTitles[index])
  ) {
    return result.ok ? { ok: false, issues: [] } : result
  }

  return result
}

export type { CreateRouteState }
