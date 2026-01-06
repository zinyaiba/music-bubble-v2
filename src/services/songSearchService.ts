/**
 * 楽曲検索サービス
 * Music Bubble Explorer V2
 *
 * 楽曲データの検索機能を提供
 *
 * Requirements:
 * - 7.2: タイトル、アーティスト、作詞家、作曲家、編曲家、タグで楽曲をフィルタリングする検索機能を提供
 */

import type { Song } from '../types'

/**
 * 検索対象フィールドの型定義
 */
export type SearchField =
  | 'title'
  | 'artist'
  | 'lyricist'
  | 'composer'
  | 'arranger'
  | 'tag'
  | 'all'

/**
 * 検索オプション
 */
export interface SearchOptions {
  /** 検索対象フィールド（デフォルト: 'all'） */
  field?: SearchField
  /** 大文字小文字を区別するか（デフォルト: false） */
  caseSensitive?: boolean
  /** タイトルのみで検索するか（デフォルト: false） */
  titleOnly?: boolean
}

/**
 * 文字列が検索クエリに一致するかチェック
 */
function matchesQuery(
  text: string,
  query: string,
  caseSensitive: boolean
): boolean {
  if (!text || !query) return false
  const normalizedText = caseSensitive ? text : text.toLowerCase()
  const normalizedQuery = caseSensitive ? query : query.toLowerCase()
  return normalizedText.includes(normalizedQuery)
}

/**
 * 配列内のいずれかの文字列が検索クエリに一致するかチェック
 */
function matchesQueryInArray(
  arr: string[] | undefined,
  query: string,
  caseSensitive: boolean
): boolean {
  if (!arr || arr.length === 0) return false
  return arr.some((item) => matchesQuery(item, query, caseSensitive))
}

/**
 * 楽曲がタイトルで検索クエリに一致するかチェック
 */
export function matchesTitleSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQuery(song.title, query, caseSensitive)
}

/**
 * 楽曲がアーティストで検索クエリに一致するかチェック
 */
export function matchesArtistSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQueryInArray(song.artists, query, caseSensitive)
}

/**
 * 楽曲が作詞家で検索クエリに一致するかチェック
 */
export function matchesLyricistSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQueryInArray(song.lyricists, query, caseSensitive)
}

/**
 * 楽曲が作曲家で検索クエリに一致するかチェック
 */
export function matchesComposerSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQueryInArray(song.composers, query, caseSensitive)
}

/**
 * 楽曲が編曲家で検索クエリに一致するかチェック
 */
export function matchesArrangerSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQueryInArray(song.arrangers, query, caseSensitive)
}

/**
 * 楽曲がタグで検索クエリに一致するかチェック
 */
export function matchesTagSearch(
  song: Song,
  query: string,
  caseSensitive = false
): boolean {
  return matchesQueryInArray(song.tags, query, caseSensitive)
}

/**
 * 楽曲が検索クエリに一致するかチェック（全フィールド検索）
 */
export function matchesSearchQuery(
  song: Song,
  query: string,
  options: SearchOptions = {}
): boolean {
  const { field = 'all', caseSensitive = false, titleOnly = false } = options

  // 空のクエリは全ての楽曲に一致
  if (!query || query.trim() === '') {
    return true
  }

  const trimmedQuery = query.trim()

  // タイトルのみ検索オプションが有効な場合
  if (titleOnly) {
    return matchesTitleSearch(song, trimmedQuery, caseSensitive)
  }

  switch (field) {
    case 'title':
      return matchesTitleSearch(song, trimmedQuery, caseSensitive)
    case 'artist':
      return matchesArtistSearch(song, trimmedQuery, caseSensitive)
    case 'lyricist':
      return matchesLyricistSearch(song, trimmedQuery, caseSensitive)
    case 'composer':
      return matchesComposerSearch(song, trimmedQuery, caseSensitive)
    case 'arranger':
      return matchesArrangerSearch(song, trimmedQuery, caseSensitive)
    case 'tag':
      return matchesTagSearch(song, trimmedQuery, caseSensitive)
    case 'all':
    default:
      // 全フィールドのいずれかに一致すればOK（タグも含む）
      return (
        matchesTitleSearch(song, trimmedQuery, caseSensitive) ||
        matchesArtistSearch(song, trimmedQuery, caseSensitive) ||
        matchesLyricistSearch(song, trimmedQuery, caseSensitive) ||
        matchesComposerSearch(song, trimmedQuery, caseSensitive) ||
        matchesArrangerSearch(song, trimmedQuery, caseSensitive) ||
        matchesTagSearch(song, trimmedQuery, caseSensitive)
      )
  }
}

/**
 * 楽曲リストを検索クエリでフィルタリング
 */
export function searchSongs(
  songs: Song[],
  query: string,
  options: SearchOptions = {}
): Song[] {
  return songs.filter((song) => matchesSearchQuery(song, query, options))
}

/**
 * 楽曲検索サービスクラス
 */
export class SongSearchService {
  private static instance: SongSearchService

  private constructor() {}

  public static getInstance(): SongSearchService {
    if (!SongSearchService.instance) {
      SongSearchService.instance = new SongSearchService()
    }
    return SongSearchService.instance
  }

  /**
   * 楽曲を検索
   */
  public search(
    songs: Song[],
    query: string,
    options: SearchOptions = {}
  ): Song[] {
    return searchSongs(songs, query, options)
  }

  /**
   * 楽曲が検索クエリに一致するかチェック
   */
  public matches(
    song: Song,
    query: string,
    options: SearchOptions = {}
  ): boolean {
    return matchesSearchQuery(song, query, options)
  }

  /**
   * タイトルで検索
   */
  public searchByTitle(songs: Song[], query: string): Song[] {
    return searchSongs(songs, query, { field: 'title' })
  }

  /**
   * アーティストで検索
   */
  public searchByArtist(songs: Song[], query: string): Song[] {
    return searchSongs(songs, query, { field: 'artist' })
  }

  /**
   * 作詞家で検索
   */
  public searchByLyricist(songs: Song[], query: string): Song[] {
    return searchSongs(songs, query, { field: 'lyricist' })
  }

  /**
   * 作曲家で検索
   */
  public searchByComposer(songs: Song[], query: string): Song[] {
    return searchSongs(songs, query, { field: 'composer' })
  }

  /**
   * 編曲家で検索
   */
  public searchByArranger(songs: Song[], query: string): Song[] {
    return searchSongs(songs, query, { field: 'arranger' })
  }
}

// シングルトンインスタンスをエクスポート
export const songSearchService = SongSearchService.getInstance()
