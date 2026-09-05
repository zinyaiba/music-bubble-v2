import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  BINGO_DESIGN_IDS,
  BINGO_SCHEMA_VERSION,
  BINGO_SONG_COUNTS,
  DEFAULT_BINGO_DESIGN_ID,
  GRID_SIZES,
  GRID_SIZE_OPTIONS,
  MAX_DECODED_PAYLOAD_BYTES,
  MAX_PARTICIPANT_NAME_LENGTH,
  MAX_PERFORMANCE_NAME_LENGTH,
  MAX_SHARE_URL_LENGTH,
  MAX_SONG_TITLE_LENGTH,
  type BingoState,
  type CreateRouteState,
  type DraftBingoState,
  type PreviewRouteState,
  type SourceLive,
  type ValidationResult,
} from './index'

const sourceLiveFixture = {
  id: 'live-1',
  performanceName: 'Anniversary Live',
} satisfies SourceLive

const bingoStateFixture = {
  schemaVersion: BINGO_SCHEMA_VERSION,
  performanceName: 'Anniversary Live',
  gridSize: 2,
  songTitles: ['Song 1', 'Song 2', 'Song 3', 'Song 4'],
  designId: DEFAULT_BINGO_DESIGN_ID,
} satisfies BingoState

const draftFixture = {
  performanceName: sourceLiveFixture.performanceName,
  participantName: '',
  gridSize: 2,
  songs: bingoStateFixture.songTitles.map((songTitle) => ({ songTitle })),
  designId: DEFAULT_BINGO_DESIGN_ID,
} satisfies DraftBingoState

const sourceRouteFixture = {
  kind: 'source-live',
  sourceLive: sourceLiveFixture,
} satisfies CreateRouteState

const editRouteFixture = {
  kind: 'edit-bingo',
  bingoState: bingoStateFixture,
  sourceLive: sourceLiveFixture,
} satisfies CreateRouteState

const previewRouteFixture = {
  kind: 'preview-bingo',
  bingoState: bingoStateFixture,
  sourceLive: sourceLiveFixture,
} satisfies PreviewRouteState

describe('setlist bingo domain constants', () => {
  it('defines schema, grid dimensions, and prediction counts centrally', () => {
    expect(BINGO_SCHEMA_VERSION).toBe(1)
    expect(GRID_SIZES).toEqual([2, 3, 4])
    expect(BINGO_SONG_COUNTS).toEqual([4, 9, 16])
    expect(GRID_SIZE_OPTIONS).toEqual([
      { gridSize: 2, songCount: 4, label: '4曲' },
      { gridSize: 3, songCount: 9, label: '9曲' },
      { gridSize: 4, songCount: 16, label: '16曲' },
    ])
  })

  it('defines at least three designs and a valid default design', () => {
    expect(BINGO_DESIGN_IDS).toEqual(['rose-bubble', 'violet-ribbon', 'duo-pop'])
    expect(BINGO_DESIGN_IDS).toContain(DEFAULT_BINGO_DESIGN_ID)
    expect(BINGO_DESIGN_IDS.length).toBeGreaterThanOrEqual(3)
  })

  it('defines the specified text and share-size boundaries', () => {
    expect(MAX_PERFORMANCE_NAME_LENGTH).toBe(80)
    expect(MAX_PARTICIPANT_NAME_LENGTH).toBe(30)
    expect(MAX_SONG_TITLE_LENGTH).toBe(50)
    expect(MAX_SHARE_URL_LENGTH).toBe(2_000)
    expect(MAX_DECODED_PAYLOAD_BYTES).toBe(8_192)
  })
})

describe('setlist bingo compile-time contracts', () => {
  it('keeps BingoState limited to reproducible card content', () => {
    expectTypeOf<keyof BingoState>().toEqualTypeOf<
      | 'schemaVersion'
      | 'performanceName'
      | 'participantName'
      | 'gridSize'
      | 'songTitles'
      | 'designId'
    >()
    expect(bingoStateFixture.songTitles).toHaveLength(4)
    expect(draftFixture.songs).toHaveLength(4)
  })

  it('provides discriminated create and preview route states', () => {
    expectTypeOf(sourceRouteFixture).toMatchTypeOf<CreateRouteState>()
    expectTypeOf(editRouteFixture).toMatchTypeOf<CreateRouteState>()
    expectTypeOf(previewRouteFixture).toMatchTypeOf<PreviewRouteState>()
    expect(sourceRouteFixture.kind).toBe('source-live')
    expect(editRouteFixture.kind).toBe('edit-bingo')
    expect(previewRouteFixture.kind).toBe('preview-bingo')
  })

  it('provides a discriminated validation result', () => {
    expectTypeOf<ValidationResult<BingoState>>().toEqualTypeOf<
      | { ok: true; value: BingoState }
      | {
          ok: false
          issues: Array<{
            code:
              | 'performance_name_required'
              | 'performance_name_too_long'
              | 'participant_name_too_long'
              | 'invalid_grid_size'
              | 'song_count_mismatch'
              | 'song_title_too_long'
              | 'design_required'
              | 'unknown_design'
            path:
              | 'performanceName'
              | 'participantName'
              | 'gridSize'
              | 'designId'
              | `songs.${number}`
          }>
        }
    >()
  })
})
