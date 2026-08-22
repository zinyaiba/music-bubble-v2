import { describe, expect, it } from 'vitest'
import type { KaraokeListState } from '../types'
import {
  KARAOKE_LIST_STATE_STORAGE_KEY,
  buildKaraokeListUrl,
  deserializeListState,
  loadKaraokeListState,
  saveKaraokeListState,
  serializeListState,
} from './karaokeListState'

const DEFAULT_STATE: KaraokeListState = {
  query: '',
  sortBy: 'streaming-newest',
  displayMode: 'all',
  episodeFilter: null,
  releaseYearFilter: null,
  scrollTop: 0,
}

describe('karaoke list state serialization', () => {
  it('serializes and restores the query and scroll position', () => {
    const state = {
      query: '  日本語 & rock  ',
      sortBy: 'release-oldest' as const,
      displayMode: 'compact' as const,
      episodeFilter: 10,
      releaseYearFilter: 2024,
      scrollTop: 123.5,
    }

    expect(deserializeListState(serializeListState(state))).toEqual(state)
  })

  it.each([
    null,
    '{not-json',
    '[]',
    '{}',
    '{"query":1,"scrollTop":10}',
    '{"query":"rock","scrollTop":-1}',
    '{"query":"rock","scrollTop":null}',
    '{"query":"rock","scrollTop":"NaN"}',
    '{"query":"rock","scrollTop":NaN}',
    '{"query":"rock","scrollTop":Infinity}',
  ])('falls back to defaults for invalid stored state: %s', (raw) => {
    expect(deserializeListState(raw)).toEqual(DEFAULT_STATE)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    'serializes invalid scrollTop %s as the default state',
    (scrollTop) => {
      expect(
        serializeListState({
          query: 'rock',
          sortBy: 'updated',
          displayMode: 'all',
          episodeFilter: null,
          releaseYearFilter: null,
          scrollTop,
        })
      ).toBe(JSON.stringify(DEFAULT_STATE))
    }
  )
})

describe('karaoke list state session store', () => {
  it('uses the dedicated key when saving and loading', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const state = {
      query: 'Minami',
      sortBy: 'release-newest' as const,
      displayMode: 'compact' as const,
      episodeFilter: 3,
      releaseYearFilter: 2004,
      scrollTop: 480,
    }

    saveKaraokeListState(state, storage)

    expect(values.get(KARAOKE_LIST_STATE_STORAGE_KEY)).toBe(serializeListState(state))
    expect(loadKaraokeListState(storage)).toEqual(state)
  })

  it('returns defaults without leaking storage access errors', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error('unavailable')
      },
      setItem: () => {
        throw new Error('unavailable')
      },
    }

    expect(loadKaraokeListState(unavailableStorage)).toEqual(DEFAULT_STATE)
    expect(() => saveKaraokeListState(DEFAULT_STATE, unavailableStorage)).not.toThrow()
  })
})

describe('buildKaraokeListUrl', () => {
  it('builds a list URL with an encoded q parameter', () => {
    expect(buildKaraokeListUrl('  日本語 & rock  ')).toBe(
      '/karaoke-songs?q=++%E6%97%A5%E6%9C%AC%E8%AA%9E+%26+rock++'
    )
  })

  it('keeps the q parameter when the query is empty', () => {
    expect(buildKaraokeListUrl('')).toBe('/karaoke-songs?q=')
  })
})
