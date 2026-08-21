import { describe, expect, it } from 'vitest'

import type { KaraokeSong } from '../types'
import {
  KARAOKE_UNREGISTERED_VALUE,
  createKaraokeDetailViewModel,
  formatKaraokeOptionalValue,
  formatKaraokeReleaseYear,
  getKaraokeEpisodeDisplayItems,
} from './karaokeDetailViewModel'

const completeSong: KaraokeSong = {
  id: 'karaoke-1',
  title: 'Shining☆Days',
  originalArtist: '栗林みな実',
  releaseYear: 2004,
  streamingEpisodes: [10, 3, 20],
  notes: 'キーを変更',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('formatKaraokeReleaseYear', () => {
  it.each([
    [1000, '1000'],
    [2004, '2004'],
    [9999, '9999'],
  ])('%iを月日なしの4桁だけで表示する', (year, expected) => {
    expect(formatKaraokeReleaseYear(year)).toBe(expected)
  })

  it.each([undefined, 999, 10000, 2024.5])(
    '未登録または有効範囲外の年 %s は未登録と表示する',
    (year) => {
      expect(formatKaraokeReleaseYear(year)).toBe(KARAOKE_UNREGISTERED_VALUE)
    }
  )
})

describe('formatKaraokeOptionalValue', () => {
  it.each([undefined, '', '   ', '\n\t'])('値 %s がない場合は未登録と表示する', (value) => {
    expect(formatKaraokeOptionalValue(value)).toBe(KARAOKE_UNREGISTERED_VALUE)
  })

  it('登録済みの値をそのまま返す', () => {
    expect(formatKaraokeOptionalValue('原曲アーティスト')).toBe('原曲アーティスト')
  })
})

describe('getKaraokeEpisodeDisplayItems', () => {
  it('全ての配信回を保存順で個別の項目として返す', () => {
    const savedEpisodes = [10, 3, 20]

    const displayItems = getKaraokeEpisodeDisplayItems(savedEpisodes)

    expect(displayItems).toEqual(['第10回', '第3回', '第20回'])
    expect(displayItems).not.toBe(savedEpisodes)
  })

  it('配信回が0件なら未登録を1項目返す', () => {
    expect(getKaraokeEpisodeDisplayItems([])).toEqual([KARAOKE_UNREGISTERED_VALUE])
  })
})

describe('createKaraokeDetailViewModel', () => {
  it('全項目を詳細表示用の値へ変換する', () => {
    expect(createKaraokeDetailViewModel(completeSong)).toEqual({
      title: 'Shining☆Days',
      originalArtist: '栗林みな実',
      releaseYear: '2004',
      streamingEpisodes: ['第10回', '第3回', '第20回'],
      notes: 'キーを変更',
    })
  })

  it('optional項目が未登録なら各項目を未登録表示へ変換する', () => {
    const song: KaraokeSong = {
      ...completeSong,
      originalArtist: undefined,
      releaseYear: undefined,
      streamingEpisodes: [],
      notes: undefined,
    }

    expect(createKaraokeDetailViewModel(song)).toEqual({
      title: 'Shining☆Days',
      originalArtist: KARAOKE_UNREGISTERED_VALUE,
      releaseYear: KARAOKE_UNREGISTERED_VALUE,
      streamingEpisodes: [KARAOKE_UNREGISTERED_VALUE],
      notes: KARAOKE_UNREGISTERED_VALUE,
    })
  })
})
