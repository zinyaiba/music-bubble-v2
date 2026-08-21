import { describe, expect, it } from 'vitest'

import type { KaraokeSong } from '../types'
import {
  clearKaraokeSongSearch,
  filterKaraokeSongs,
  normalizeSearchQuery,
  projectKaraokeSongList,
} from './karaokeSearch'

const song = (
  id: string,
  title: string,
  originalArtist?: string,
): KaraokeSong => ({
  id,
  title,
  originalArtist,
  streamingEpisodes: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

const songs = [
  song('1', 'Shining Days', 'Minami Kuribayashi'),
  song('2', '翼はPleasure Line', '栗林みな実'),
  song('3', 'STRAIGHT JET'),
  song('4', 'moving soul', 'Minami'),
]

describe('normalizeSearchQuery', () => {
  it('前後空白を除去し、ラテン文字を小文字化する', () => {
    expect(normalizeSearchQuery('  MiNaMi\t')).toBe('minami')
  })

  it('空白のみの入力を空文字へ正規化する', () => {
    expect(normalizeSearchQuery(' \n\t ')).toBe('')
  })
})

describe('filterKaraokeSongs', () => {
  it('空文字または空白のみなら全件を入力順で返す', () => {
    expect(filterKaraokeSongs(songs, '   ')).toEqual(songs)
  })

  it('前後空白を除去し、曲名をラテン文字の大小文字非区別で部分一致検索する', () => {
    expect(filterKaraokeSongs(songs, '  JET ')).toEqual([songs[2]])
  })

  it('原曲アーティストを検索し、一致結果の入力順を保持する', () => {
    expect(filterKaraokeSongs(songs, 'MINAMI')).toEqual([songs[0], songs[3]])
  })

  it('原曲アーティスト未登録の曲を安全に扱い、一致なしなら空配列を返す', () => {
    expect(filterKaraokeSongs(songs, 'not found')).toEqual([])
  })
})

describe('projectKaraokeSongList', () => {
  it('raw query、表示結果、表示件数、登録総件数を返す', () => {
    expect(projectKaraokeSongList(songs, ' minami ')).toEqual({
      query: ' minami ',
      songs: [songs[0], songs[3]],
      visibleCount: 2,
      totalCount: 4,
    })
  })

  it('空の入力では両方の件数を0にする', () => {
    expect(projectKaraokeSongList([], 'anything')).toEqual({
      query: 'anything',
      songs: [],
      visibleCount: 0,
      totalCount: 0,
    })
  })
})

describe('clearKaraokeSongSearch', () => {
  it('queryを空文字にし、全件と一致する件数を入力順で返す', () => {
    expect(clearKaraokeSongSearch(songs)).toEqual({
      query: '',
      songs,
      visibleCount: songs.length,
      totalCount: songs.length,
    })
  })
})
