/**
 * フィルタサービス
 * Music Bubble Explorer V2
 *
 * 楽曲データのフィルタリングロジックを提供
 *
 * Requirements:
 * - 3.3: 「栗林みな実」選択時は該当楽曲のみ表示
 * - 3.4: 「Minami」選択時は該当楽曲のみ表示
 * - 3.5: 「それ以外」選択時は栗林みな実/Minami以外の楽曲を表示
 * - 3.6: 未選択時は全アーティストを表示
 * - 4.2: アーティストフィルタがアクティブな時、ジャンルフィルタはそのアーティストの楽曲で利用可能なジャンルのみを表示
 * - 4.3: ジャンル選択時は両方のフィルタに一致する楽曲のみを表示
 * - 4.4: ジャンル未選択時はアーティストフィルタに一致する全ての楽曲を表示
 * - 4.5: アーティストフィルタ変更時はジャンルオプションを動的に更新
 */

import type { Song, ArtistFilterValue, CategoryFilterValue, FilterState, BubbleType } from '../types'

/**
 * 楽曲がアーティストフィルタに一致するかチェック
 */
export function matchesArtistFilter(
  song: Song,
  artistFilter: ArtistFilterValue
): boolean {
  // フィルタ未選択時は全て表示
  if (artistFilter === null) {
    return true
  }

  const artists = song.artists || []
  const artistString = artists.join(' ')

  switch (artistFilter) {
    case '栗林みな実':
      // アーティスト名に「栗林みな実」を含む楽曲
      return artistString.includes('栗林みな実')

    case 'Minami':
      // アーティスト名に「Minami」を含む楽曲
      return artistString.includes('Minami')

    case 'other':
      // 「栗林みな実」「Minami」を含まない楽曲
      return !artistString.includes('栗林みな実') && !artistString.includes('Minami')

    default:
      return true
  }
}

/**
 * 楽曲がジャンルフィルタに一致するかチェック
 */
export function matchesGenreFilter(song: Song, genres: string[]): boolean {
  // ジャンル未選択時は全て表示
  if (genres.length === 0) {
    return true
  }

  const songTags = song.tags || []
  // 選択されたジャンルのいずれかに一致すればOK
  return genres.some((genre) => songTags.includes(genre))
}

/**
 * 楽曲がフィルタ状態に一致するかチェック
 */
export function matchesFilter(song: Song, filterState: FilterState): boolean {
  return (
    matchesArtistFilter(song, filterState.artist) &&
    matchesGenreFilter(song, filterState.genres)
  )
}

/**
 * フィルタ状態に基づいて楽曲をフィルタリング
 */
export function filterSongs(songs: Song[], filterState: FilterState): Song[] {
  return songs.filter((song) => matchesFilter(song, filterState))
}

/**
 * アーティストフィルタに基づいて楽曲をフィルタリング
 */
export function filterSongsByArtist(
  songs: Song[],
  artistFilter: ArtistFilterValue
): Song[] {
  return songs.filter((song) => matchesArtistFilter(song, artistFilter))
}

/**
 * 楽曲リストから利用可能なジャンル（タグ）を抽出
 * アーティストフィルタ適用後の楽曲から抽出することで、
 * 動的にジャンルオプションを更新する
 */
export function extractAvailableGenres(songs: Song[]): string[] {
  const genreSet = new Set<string>()

  songs.forEach((song) => {
    const tags = song.tags || []
    tags.forEach((tag) => {
      genreSet.add(tag)
    })
  })

  // アルファベット順にソート
  return Array.from(genreSet).sort((a, b) => a.localeCompare(b, 'ja'))
}

/**
 * アーティストフィルタ適用後の楽曲から利用可能なジャンルを取得
 */
export function getAvailableGenresForArtist(
  songs: Song[],
  artistFilter: ArtistFilterValue
): string[] {
  const filteredSongs = filterSongsByArtist(songs, artistFilter)
  return extractAvailableGenres(filteredSongs)
}

/**
 * カテゴリに基づいてシャボン玉タイプをフィルタリング
 */
export function matchesCategoryFilter(
  bubbleType: BubbleType,
  categories: CategoryFilterValue[]
): boolean {
  // カテゴリ未選択時は全て表示
  if (categories.length === 0) {
    return true
  }
  return categories.includes(bubbleType as CategoryFilterValue)
}

/**
 * カテゴリフィルタのオプション定義
 */
export const CATEGORY_OPTIONS: { value: CategoryFilterValue; label: string; icon: string }[] = [
  { value: 'song', label: '楽曲', icon: '🎵' },
  { value: 'lyricist', label: '作詞', icon: '✍️' },
  { value: 'composer', label: '作曲', icon: '🎼' },
  { value: 'arranger', label: '編曲', icon: '🎧' },
  { value: 'tag', label: 'タグ', icon: '🏷️' },
]

/**
 * フィルタサービスクラス
 */
export class FilterService {
  private static instance: FilterService

  private constructor() {}

  public static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService()
    }
    return FilterService.instance
  }

  /**
   * 楽曲をフィルタリング
   */
  public filterSongs(songs: Song[], filterState: FilterState): Song[] {
    return filterSongs(songs, filterState)
  }

  /**
   * アーティストフィルタのみ適用
   */
  public filterByArtist(
    songs: Song[],
    artistFilter: ArtistFilterValue
  ): Song[] {
    return filterSongsByArtist(songs, artistFilter)
  }

  /**
   * 利用可能なジャンルを取得
   */
  public getAvailableGenres(
    songs: Song[],
    artistFilter: ArtistFilterValue
  ): string[] {
    return getAvailableGenresForArtist(songs, artistFilter)
  }

  /**
   * カテゴリフィルタをチェック
   */
  public matchesCategory(
    bubbleType: BubbleType,
    categories: CategoryFilterValue[]
  ): boolean {
    return matchesCategoryFilter(bubbleType, categories)
  }
}

// シングルトンインスタンスをエクスポート
export const filterService = FilterService.getInstance()
