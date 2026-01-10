/**
 * 楽曲の並び替えユーティリティ
 * Music Bubble Explorer V2
 */

import type { Song } from '../types'

/**
 * 楽曲の並び替えタイプ
 */
export type SongSortType = 'newest' | 'oldest' | 'updated' | 'alphabetical' | 'artist' | 'minami'

/**
 * アーティスト名の優先順位を取得（栗林みな実優先）
 * 栗林みな実のみ → Minimiのみ → その他（複数アーティストや他のアーティスト）
 */
function getArtistPriorityKuribayashi(artists: string[] | undefined): number {
  if (!artists || artists.length === 0) return 3
  
  // 複数アーティストの場合は「その他」
  if (artists.length > 1) return 2
  
  const artist = artists[0]
  if (artist === '栗林みな実') return 0
  if (artist === 'Minami') return 1
  return 2
}

/**
 * アーティスト名の優先順位を取得（Minami優先）
 * Minimiのみ → 栗林みな実のみ → その他（複数アーティストや他のアーティスト）
 */
function getArtistPriorityMinami(artists: string[] | undefined): number {
  if (!artists || artists.length === 0) return 3
  
  // 複数アーティストの場合は「その他」
  if (artists.length > 1) return 2
  
  const artist = artists[0]
  if (artist === 'Minami') return 0
  if (artist === '栗林みな実') return 1
  return 2
}

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

    case 'artist':
      // 栗林みな実を優先（栗林みな実 → Minami → その他（五十音順））
      sorted.sort((a, b) => {
        const priorityA = getArtistPriorityKuribayashi(a.artists)
        const priorityB = getArtistPriorityKuribayashi(b.artists)

        // 優先順位が異なる場合
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }

        // 同じ優先順位の場合、「その他」グループは五十音順
        if (priorityA === 2) {
          const artistA = a.artists?.[0] || ''
          const artistB = b.artists?.[0] || ''
          return artistA.localeCompare(artistB, 'ja')
        }

        // 同じアーティストの場合はタイトルで並び替え
        return a.title.localeCompare(b.title, 'ja')
      })
      break

    case 'minami':
      // Minamiを優先（Minami → 栗林みな実 → その他（五十音順））
      sorted.sort((a, b) => {
        const priorityA = getArtistPriorityMinami(a.artists)
        const priorityB = getArtistPriorityMinami(b.artists)

        // 優先順位が異なる場合
        if (priorityA !== priorityB) {
          return priorityA - priorityB
        }

        // 同じ優先順位の場合、「その他」グループは五十音順
        if (priorityA === 2) {
          const artistA = a.artists?.[0] || ''
          const artistB = b.artists?.[0] || ''
          return artistA.localeCompare(artistB, 'ja')
        }

        // 同じアーティストの場合はタイトルで並び替え
        return a.title.localeCompare(b.title, 'ja')
      })
      break
  }

  return sorted
}
