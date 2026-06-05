/**
 * ライブソートユーティリティ
 * Music Bubble Explorer V2
 *
 * ライブデータのソート機能を提供
 */

import type { Live } from '../types'

/**
 * ソート種別の型定義
 */
export type LiveSortType = 'newest' | 'oldest' | 'updated'

/**
 * 日時文字列を比較用に変換
 */
function parseDateTime(dateTime: string): number {
  try {
    const date = new Date(dateTime)
    return date.getTime()
  } catch {
    return 0
  }
}

/**
 * ライブを新しい順にソート
 */
function sortByNewest(lives: Live[]): Live[] {
  return [...lives].sort((a, b) => {
    const timeA = parseDateTime(a.dateTime)
    const timeB = parseDateTime(b.dateTime)
    return timeB - timeA // 降順
  })
}

/**
 * ライブを古い順にソート
 */
function sortByOldest(lives: Live[]): Live[] {
  return [...lives].sort((a, b) => {
    const timeA = parseDateTime(a.dateTime)
    const timeB = parseDateTime(b.dateTime)
    return timeA - timeB // 昇順
  })
}

/**
 * ライブを更新順にソート（ユーザの更新日付で新しい順）
 */
function sortByUpdated(lives: Live[]): Live[] {
  return [...lives].sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
    return timeB - timeA // 降順
  })
}

/**
 * ライブリストをソート
 */
export function sortLives(lives: Live[], sortType: LiveSortType): Live[] {
  switch (sortType) {
    case 'newest':
      return sortByNewest(lives)
    case 'oldest':
      return sortByOldest(lives)
    case 'updated':
      return sortByUpdated(lives)
    default:
      return lives
  }
}
