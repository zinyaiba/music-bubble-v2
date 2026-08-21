import { describe, expect, it } from 'vitest'

import type { KaraokeSongDraft } from '../types/karaoke'
import {
  normalizeKaraokeDraft,
  normalizeStreamingEpisodes,
  streamingEpisodesReducer,
  validateKaraokeDraft,
} from './karaokeDraft'

const createDraft = (overrides: Partial<KaraokeSongDraft> = {}): KaraokeSongDraft => ({
  title: '曲名',
  originalArtist: '',
  releaseYear: '',
  streamingEpisodes: [],
  notes: '',
  ...overrides,
})

describe('validateKaraokeDraft', () => {
  it('rejects an empty or whitespace-only title', () => {
    expect(validateKaraokeDraft(createDraft({ title: ' \t\n ' })).title).toBe(
      '曲名を入力してください'
    )
  })

  it.each(['999', '10000', '2024.5', '1e3', '+2024', '２０２４', '02024'])(
    'rejects a non-strict release year: %s',
    (releaseYear) => {
      expect(validateKaraokeDraft(createDraft({ releaseYear })).releaseYear).toBeDefined()
    }
  )

  it.each(['1000', '9999', ' 2024 ', '   '])('accepts release year: %s', (releaseYear) => {
    expect(validateKaraokeDraft(createDraft({ releaseYear })).releaseYear).toBeUndefined()
  })
})

describe('normalizeKaraokeDraft', () => {
  it('trims values, omits blank optionals, and preserves nonblank episode order', () => {
    const result = normalizeKaraokeDraft(
      createDraft({
        title: '  曲名  ',
        originalArtist: '  原曲歌手  ',
        releaseYear: ' 2024 ',
        streamingEpisodes: ['  2  ', '  ', '\t', '1'],
        notes: '  備考  ',
      })
    )

    expect(result).toEqual({
      success: true,
      input: {
        title: '曲名',
        originalArtist: '原曲歌手',
        releaseYear: 2024,
        streamingEpisodes: [2, 1],
        notes: '備考',
      },
    })
  })

  it('omits every optional value when it is blank', () => {
    expect(
      normalizeKaraokeDraft(
        createDraft({
          originalArtist: ' ',
          releaseYear: '\t',
          streamingEpisodes: [' ', '\n'],
          notes: '  ',
        })
      )
    ).toEqual({ success: true, input: { title: '曲名', streamingEpisodes: [] } })
  })

  it('does not expose create input for an invalid draft', () => {
    const result = normalizeKaraokeDraft(createDraft({ title: ' ', releaseYear: '999' }))

    expect(result.success).toBe(false)
    expect('input' in result).toBe(false)
    if (!result.success) {
      expect(result.errors).toEqual({
        title: '曲名を入力してください',
        releaseYear: '発売年は1000から9999までの4桁の整数で入力してください',
      })
    }
  })
})

describe('normalizeStreamingEpisodes', () => {
  it('filters only blank values after trimming without changing relative order', () => {
    expect(normalizeStreamingEpisodes(['  10 ', '', ' 2', ' \t ', '30  '])).toEqual([10, 2, 30])
  })
})

describe('streamingEpisodesReducer', () => {
  it('appends one episode without mutating the previous state', () => {
    const state = ['第1回']
    const result = streamingEpisodesReducer(state, { type: 'add', value: '第2回' })

    expect(result).toEqual(['第1回', '第2回'])
    expect(state).toEqual(['第1回'])
    expect(streamingEpisodesReducer(state, { type: 'add' })).toEqual(['第1回', ''])
  })

  it('removes only the episode at the specified index', () => {
    expect(
      streamingEpisodesReducer(['第1回', '第2回', '第3回'], { type: 'remove', index: 1 })
    ).toEqual(['第1回', '第3回'])
  })

  it.each([-1, 3, 1.5])('leaves state unchanged for invalid removal index %s', (index) => {
    const state = ['第1回', '第2回', '第3回']
    expect(streamingEpisodesReducer(state, { type: 'remove', index })).toBe(state)
  })
})
