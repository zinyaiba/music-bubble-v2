/**
 * 楽曲の並び替えユーティリティ
 * Music Bubble Explorer V2
 */

import type { Song } from '../types'

/**
 * 楽曲の並び替えタイプ
 */
export type SongSortType = 'newest' | 'oldest' | 'updated' | 'alphabetical'

/**
 * 楽曲を並び替える共通関数
 * @param songs 並び替え対象の楽曲配列
 * @param sortBy 並び替えタイプ
 * @returns 並び替えられた楽曲配列
 */
export function sortSongs(songs: Song[], sortBy: SongSortType): Song[] {
  const sorted = [...songs]

  switch (sortBy) {
    case 'newest':
      // 新曲順（発売年・月日の降順、発売年がない場合は最後）
      sorted.sort((a, b) => {
        const yearA = a.releaseYear ?? 0
        const yearB = b.releaseYear ?? 0

        // 年が異なる場合は年で比較
        if (yearA !== yearB) {
          return yearB - yearA
        }

        // 年が同じ場合は月日で比較（MMDD形式）
        const dateA = a.releaseDate || '0000'
        const dateB = b.releaseDate || '0000'
        return dateB.localeCompare(dateA)
      })
      break

    case 'oldest':
      // 古い曲順（発売年・月日の昇順、発売年がない場合は最後）
      sorted.sort((a, b) => {
        const yearA = a.releaseYear ?? 9999
        const yearB = b.releaseYear ?? 9999

        // 年が異なる場合は年で比較
        if (yearA !== yearB) {
          return yearA - yearB
        }

        // 年が同じ場合は月日で比較（MMDD形式）
        const dateA = a.releaseDate || '9999'
        const dateB = b.releaseDate || '9999'
        return dateA.localeCompare(dateB)
      })
      break

    case 'updated':
      // 更新順（createdAtの降順）
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
      break

    case 'alphabetical':
      // 五十音順（タイトルの昇順）
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'))
      break
  }

  return sorted
}
