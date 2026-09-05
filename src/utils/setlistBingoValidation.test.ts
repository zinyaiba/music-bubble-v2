import { describe, expect, it } from 'vitest'

import {
  BINGO_SCHEMA_VERSION,
  DEFAULT_BINGO_DESIGN_ID,
  type BingoState,
  type DraftBingoState,
} from '../types'
import {
  countUnicodeCodePoints,
  initializeDraft,
  parseBingoState,
  validateDraftBingoState,
} from './setlistBingoValidation'

function createValidDraft(overrides: Partial<DraftBingoState> = {}): DraftBingoState {
  return {
    performanceName: ' Anniversary Live ',
    participantName: '',
    gridSize: 2,
    songs: [' Song 1 ', 'Song 2', 'Song 3', ' Song 4 '].map((songTitle) => ({
      songTitle,
    })),
    designId: DEFAULT_BINGO_DESIGN_ID,
    ...overrides,
  }
}

function createValidState(overrides: Partial<BingoState> = {}): BingoState {
  return {
    schemaVersion: BINGO_SCHEMA_VERSION,
    performanceName: 'Anniversary Live',
    gridSize: 2,
    songTitles: ['Song 1', 'Song 2', 'Song 3', 'Song 4'],
    designId: DEFAULT_BINGO_DESIGN_ID,
    ...overrides,
  }
}

describe('initializeDraft', () => {
  it('creates a nine-song default draft with no route state', () => {
    expect(initializeDraft(undefined)).toEqual({
      draft: {
        performanceName: '',
        participantName: '',
        gridSize: 3,
        songs: Array.from({ length: 9 }, () => ({ songTitle: '' })),
        designId: DEFAULT_BINGO_DESIGN_ID,
      },
    })
  })

  it('preserves a valid source live identity and unchanged display name', () => {
    const sourceLive = { id: 'live-1', performanceName: '  公演名  ' }
    const initialized = initializeDraft({ kind: 'source-live', sourceLive })

    expect(initialized.sourceLive).toBe(sourceLive)
    expect(initialized.draft.performanceName).toBe(sourceLive.performanceName)
    expect(initialized.draft.gridSize).toBe(3)
    expect(initialized.draft.songs).toHaveLength(9)
    expect(initialized.draft.designId).toBe(DEFAULT_BINGO_DESIGN_ID)
  })

  it('losslessly restores a strictly valid edit state', () => {
    const bingoState = createValidState({
      performanceName: '<script>alert(1)</script> 🎵',
      participantName: '参加者 🎤',
      songTitles: ['A', 'B', 'e\u0301', '🎵'],
      designId: 'violet-ribbon',
    })
    const sourceLive = { id: 'live-2', performanceName: 'Source' }

    expect(initializeDraft({ kind: 'edit-bingo', bingoState, sourceLive })).toEqual({
      draft: {
        performanceName: bingoState.performanceName,
        participantName: bingoState.participantName ?? '',
        gridSize: bingoState.gridSize,
        songs: bingoState.songTitles.map((songTitle) => ({ songTitle })),
        designId: bingoState.designId,
      },
      sourceLive,
    })
  })

  it('accepts an explicitly undefined optional source live', () => {
    const bingoState = createValidState()

    expect(
      initializeDraft({ kind: 'edit-bingo', bingoState, sourceLive: undefined })
    ).toEqual({
      draft: {
        performanceName: bingoState.performanceName,
        participantName: '',
        gridSize: bingoState.gridSize,
        songs: bingoState.songTitles.map((songTitle) => ({ songTitle })),
        designId: bingoState.designId,
      },
    })
  })

  it.each([
    ['an edit state with unknown bingo fields', {
      kind: 'edit-bingo',
      bingoState: { ...createValidState(), unexpected: true },
    }],
    ['an edit state with an invalid optional source', {
      kind: 'edit-bingo',
      bingoState: createValidState(),
      sourceLive: { id: '', performanceName: 'Source' },
    }],
    ['a source state with unknown route fields', {
      kind: 'source-live',
      sourceLive: { id: 'live-1', performanceName: 'Source' },
      unexpected: true,
    }],
  ])('falls back to an empty new draft for %s', (_label, routeState) => {
    expect(initializeDraft(routeState)).toEqual({
      draft: {
        performanceName: '',
        participantName: '',
        gridSize: 3,
        songs: Array.from({ length: 9 }, () => ({ songTitle: '' })),
        designId: DEFAULT_BINGO_DESIGN_ID,
      },
    })
  })
})

describe('validateDraftBingoState', () => {
  it('trims only surrounding whitespace and preserves order, Unicode, and plain text', () => {
    const draft = createValidDraft({
      performanceName: ' \t<b>公演  名</b> 🎵\n',
      participantName: '  <b>参加者</b> 🎤  ',
      songs: [
        { songTitle: '  <script>alert(1)</script>  ', registeredSongId: 'song-1' },
        { songTitle: '\te\u0301\n' },
        { songTitle: ' A  B ' },
        { songTitle: ' & text ' },
      ],
    })
    const snapshot = structuredClone(draft)

    expect(validateDraftBingoState(draft)).toEqual({
      ok: true,
      value: {
        schemaVersion: BINGO_SCHEMA_VERSION,
        performanceName: '<b>公演  名</b> 🎵',
        participantName: '<b>参加者</b> 🎤',
        gridSize: 2,
        songTitles: ['<script>alert(1)</script>', 'e\u0301', 'A  B', '& text'],
        designId: DEFAULT_BINGO_DESIGN_ID,
      },
    })
    expect(draft).toEqual(snapshot)
  })

  it('counts 30/31, 80/81, and 50/51 Unicode code point boundaries correctly', () => {
    expect(countUnicodeCodePoints('🎵')).toBe(1)
    expect(countUnicodeCodePoints('e\u0301')).toBe(2)

    expect(
      validateDraftBingoState(
        createValidDraft({
          performanceName: '🎵'.repeat(80),
          participantName: '🎵'.repeat(30),
          songs: [
            { songTitle: '🎵'.repeat(50) },
            { songTitle: 'A' },
            { songTitle: 'B' },
            { songTitle: 'C' },
          ],
        })
      ).ok
    ).toBe(true)

    expect(
      validateDraftBingoState(
        createValidDraft({
          performanceName: '🎵'.repeat(81),
          participantName: '🎵'.repeat(31),
          songs: [
            { songTitle: '🎵'.repeat(51) },
            { songTitle: 'A' },
            { songTitle: 'B' },
            { songTitle: 'C' },
          ],
        })
      )
    ).toEqual({
      ok: false,
      issues: [
        { code: 'performance_name_too_long', path: 'performanceName' },
        { code: 'participant_name_too_long', path: 'participantName' },
        { code: 'song_title_too_long', path: 'songs.0' },
      ],
    })
  })

  it('collects all relevant field issues without changing the draft', () => {
    const draft = createValidDraft({
      performanceName: '　 ',
      songs: [{ songTitle: '' }, { songTitle: 'A'.repeat(51) }],
      designId: '',
    })
    const snapshot = structuredClone(draft)

    expect(validateDraftBingoState(draft)).toEqual({
      ok: false,
      issues: [
        { code: 'performance_name_required', path: 'performanceName' },
        { code: 'song_count_mismatch', path: 'gridSize' },
        { code: 'song_title_too_long', path: 'songs.1' },
        { code: 'design_required', path: 'designId' },
      ],
    })
    expect(draft).toEqual(snapshot)
  })

  it('accepts blank titles and normalizes a hole to an empty card cell', () => {
    const songs = Array(4) as DraftBingoState['songs']
    songs[0] = { songTitle: 'A' }
    songs[1] = { songTitle: 'B' }
    songs[3] = { songTitle: 'D' }

    expect(validateDraftBingoState(createValidDraft({ songs }))).toEqual({
      ok: true,
      value: {
        schemaVersion: 1,
        performanceName: 'Anniversary Live',
        gridSize: 2,
        songTitles: ['A', 'B', '', 'D'],
        designId: 'rose-bubble',
      },
    })
  })
})

describe('parseBingoState', () => {
  it('accepts only the exact normalized BingoState field set', () => {
    const state = createValidState({
      performanceName: '<b>公演</b>',
      songTitles: ['<script>', '🎵', 'e\u0301', '& text'],
    })

    expect(parseBingoState(state)).toEqual({ ok: true, value: state })
    expect(parseBingoState({ ...state, unknown: 'value' }).ok).toBe(false)
    const missingDesign = {
      schemaVersion: state.schemaVersion,
      performanceName: state.performanceName,
      gridSize: state.gridSize,
      songTitles: state.songTitles,
    }
    expect(parseBingoState(missingDesign).ok).toBe(false)
  })

  it.each([
    ['unsupported schema version', { ...createValidState(), schemaVersion: 2 }],
    ['string grid size', { ...createValidState(), gridSize: '2' }],
    ['non-string performance name', { ...createValidState(), performanceName: 42 }],
    ['non-array song titles', { ...createValidState(), songTitles: 'Song' }],
    ['non-string song title', { ...createValidState(), songTitles: ['A', 2, 'C', 'D'] }],
    ['non-string design ID', { ...createValidState(), designId: 1 }],
    ['array root', []],
    ['null root', null],
  ])('rejects %s', (_label, value) => {
    expect(parseBingoState(value).ok).toBe(false)
  })

  it('rejects unnormalized surrounding whitespace', () => {
    expect(
      parseBingoState(createValidState({ performanceName: ' Anniversary Live' })).ok
    ).toBe(false)
    expect(
      parseBingoState(
        createValidState({ songTitles: ['Song 1', 'Song 2 ', 'Song 3', 'Song 4'] })
      ).ok
    ).toBe(false)
  })

  it('rejects invalid counts, values, and every over-limit field', () => {
    expect(parseBingoState(createValidState({ songTitles: ['only one'] })).ok).toBe(false)
    expect(parseBingoState(createValidState({ designId: 'unknown' as never })).ok).toBe(false)
    expect(
      parseBingoState(createValidState({ performanceName: 'A'.repeat(81) })).ok
    ).toBe(false)
    expect(
      parseBingoState(
        createValidState({ songTitles: ['A'.repeat(51), 'B', 'C', 'D'] })
      ).ok
    ).toBe(false)
  })

  it('rejects a sparse song title array', () => {
    const songTitles = Array(4) as string[]
    songTitles[0] = 'A'
    songTitles[1] = 'B'
    songTitles[3] = 'D'

    expect(parseBingoState(createValidState({ songTitles })).ok).toBe(false)
  })
})
