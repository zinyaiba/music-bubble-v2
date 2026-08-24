/**
 * ライブ検索サービス
 * Music Bubble Explorer V2
 *
 * ライブデータの検索機能を提供
 */

import type { Live } from '../types'
import { LIVE_TYPE_LABELS } from '../types'

/**
 * 検索オプション
 */
export interface LiveSearchOptions {
  /** 大文字小文字を区別するか（デフォルト: false） */
  caseSensitive?: boolean
}

/**
 * 文字列が検索クエリに一致するかチェック（部分一致）
 */
function matchesQuery(text: string, query: string, caseSensitive: boolean): boolean {
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
 * ライブが検索クエリに一致するかチェック（全フィールド検索）
 * 検索対象:
 * - 公演名
 * - 会場名
 * - セトリの楽曲名・備考
 * - メモ
 * - 公演地
 * - ライブ種別名（カテゴリ表示名 / その他・海外の自由入力名）
 */
export function matchesSearchQuery(
  live: Live,
  query: string,
  options: LiveSearchOptions = {}
): boolean {
  const { caseSensitive = false } = options

  // 空のクエリは全てのライブに一致
  if (!query || query.trim() === '') {
    return true
  }

  const trimmedQuery = query.trim()

  // 公演名での検索
  if (matchesQuery(live.title, trimmedQuery, caseSensitive)) {
    return true
  }

  // 会場名での検索
  if (matchesQuery(live.venueName, trimmedQuery, caseSensitive)) {
    return true
  }

  // 公演地での検索
  if (live.tourLocation && matchesQuery(live.tourLocation, trimmedQuery, caseSensitive)) {
    return true
  }

  // ライブ種別名での検索（カテゴリの表示名: ツアー/フェス/海外/その他 など）
  const liveTypeLabel = LIVE_TYPE_LABELS[live.liveType]
  if (liveTypeLabel && matchesQuery(liveTypeLabel, trimmedQuery, caseSensitive)) {
    return true
  }

  // ライブ種別名での検索（その他・海外カテゴリの自由入力名）
  if (live.otherCategory && matchesQuery(live.otherCategory, trimmedQuery, caseSensitive)) {
    return true
  }

  // メモでの検索
  if (live.memo && matchesQuery(live.memo, trimmedQuery, caseSensitive)) {
    return true
  }

  // セトリの楽曲名・備考での検索
  if (
    live.setlist &&
    matchesQueryInArray(
      live.setlist.flatMap((item) => [item.songTitle, item.note ?? '']),
      trimmedQuery,
      caseSensitive
    )
  ) {
    return true
  }

  return false
}

/**
 * ライブリストを検索クエリでフィルタリング
 */
export function searchLives(lives: Live[], query: string, options: LiveSearchOptions = {}): Live[] {
  return lives.filter((live) => matchesSearchQuery(live, query, options))
}

/**
 * ライブ検索サービスクラス
 */
export class LiveSearchService {
  private static instance: LiveSearchService

  private constructor() {}

  public static getInstance(): LiveSearchService {
    if (!LiveSearchService.instance) {
      LiveSearchService.instance = new LiveSearchService()
    }
    return LiveSearchService.instance
  }

  /**
   * ライブを検索
   */
  public search(lives: Live[], query: string, options: LiveSearchOptions = {}): Live[] {
    return searchLives(lives, query, options)
  }

  /**
   * ライブが検索クエリに一致するかチェック
   */
  public matches(live: Live, query: string, options: LiveSearchOptions = {}): boolean {
    return matchesSearchQuery(live, query, options)
  }
}

// シングルトンインスタンスをエクスポート
export const liveSearchService = LiveSearchService.getInstance()
