/**
 * タグサービス
 * Music Bubble Explorer V2
 *
 * タグデータの生成、検索、ソート、追加・削除を管理
 *
 * Requirements:
 * - 5.4: タグを追加した時、システムはタグを即座にデータベースに保存すること
 * - 5.5: タグを削除した時、システムは即座にデータベースを更新すること
 * - 6.2: タグ名でフィルタリングする検索機能を提供すること
 * - 6.3: タグをタップした時、そのタグに関連する全ての楽曲を表示すること
 * - 6.4: 各タグの楽曲数を表示すること
 * - 6.6: デフォルトでタグをアルファベット順にソートし、楽曲数でのソートオプションも提供すること
 */

import type { Song, Tag } from '../types'
import { firebaseService } from './firebaseService'

/**
 * タグのソート順
 */
export type TagSortOrder = 'alphabetical' | 'songCount' | 'recentlyUpdated'

/**
 * タグ検索オプション
 */
export interface TagSearchOptions {
  query?: string
  sortOrder?: TagSortOrder
}

/**
 * 楽曲リストからタグデータを生成
 * クライアント側でタグを集計し、Tag型のオブジェクトを生成する
 */
export function generateTagsFromSongs(songs: Song[]): Tag[] {
  const tagMap = new Map<string, { songIds: string[]; lastUpdatedAt: string | undefined }>()

  songs.forEach((song) => {
    const tags = song.tags || []
    tags.forEach((tagName) => {
      if (!tagMap.has(tagName)) {
        tagMap.set(tagName, { songIds: [], lastUpdatedAt: undefined })
      }
      const tagData = tagMap.get(tagName)!
      tagData.songIds.push(song.id)
      
      // 最終更新日時を更新（より新しい日時を保持）
      if (song.updatedAt) {
        if (!tagData.lastUpdatedAt || song.updatedAt > tagData.lastUpdatedAt) {
          tagData.lastUpdatedAt = song.updatedAt
        }
      }
    })
  })

  const tags: Tag[] = []
  tagMap.forEach((value, name) => {
    tags.push({
      id: generateTagId(name),
      name,
      songIds: value.songIds,
      songCount: value.songIds.length,
      lastUpdatedAt: value.lastUpdatedAt,
    })
  })

  return tags
}

/**
 * タグ名からIDを生成
 * タグ名をBase64エンコードしてIDとして使用
 */
export function generateTagId(tagName: string): string {
  // シンプルにタグ名をそのままIDとして使用（URLセーフな形式に変換）
  return encodeURIComponent(tagName)
}

/**
 * タグIDからタグ名を復元
 */
export function getTagNameFromId(tagId: string): string {
  return decodeURIComponent(tagId)
}

/**
 * タグをアルファベット順（日本語対応）でソート
 */
export function sortTagsAlphabetically(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

/**
 * タグを楽曲数の降順でソート
 */
export function sortTagsBySongCount(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    // 楽曲数の降順
    if (b.songCount !== a.songCount) {
      return b.songCount - a.songCount
    }
    // 同数の場合はアルファベット順
    return a.name.localeCompare(b.name, 'ja')
  })
}

/**
 * タグを更新順（最終更新日時の降順）でソート
 * 更新日時がないタグは後ろに配置
 */
export function sortTagsByRecentlyUpdated(tags: Tag[]): Tag[] {
  return [...tags].sort((a, b) => {
    // 両方とも更新日時がない場合はアルファベット順
    if (!a.lastUpdatedAt && !b.lastUpdatedAt) {
      return a.name.localeCompare(b.name, 'ja')
    }
    // 片方だけ更新日時がない場合、ある方を優先
    if (!a.lastUpdatedAt) return 1
    if (!b.lastUpdatedAt) return -1
    // 両方とも更新日時がある場合は降順（新しい順）
    if (b.lastUpdatedAt !== a.lastUpdatedAt) {
      return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt)
    }
    // 同じ日時の場合はアルファベット順
    return a.name.localeCompare(b.name, 'ja')
  })
}

/**
 * タグをソート
 */
export function sortTags(tags: Tag[], sortOrder: TagSortOrder): Tag[] {
  switch (sortOrder) {
    case 'alphabetical':
      return sortTagsAlphabetically(tags)
    case 'songCount':
      return sortTagsBySongCount(tags)
    case 'recentlyUpdated':
      return sortTagsByRecentlyUpdated(tags)
    default:
      return sortTagsAlphabetically(tags)
  }
}

/**
 * タグ名で検索（部分一致）
 */
export function searchTags(tags: Tag[], query: string): Tag[] {
  if (!query || query.trim() === '') {
    return tags
  }

  const normalizedQuery = query.toLowerCase().trim()
  return tags.filter((tag) =>
    tag.name.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * タグを検索してソート
 */
export function filterAndSortTags(
  tags: Tag[],
  options: TagSearchOptions = {}
): Tag[] {
  const { query = '', sortOrder = 'recentlyUpdated' } = options

  let result = tags

  // 検索フィルタ適用
  if (query) {
    result = searchTags(result, query)
  }

  // ソート適用
  result = sortTags(result, sortOrder)

  return result
}

/**
 * タグに関連する楽曲を取得
 */
export function getSongsByTag(songs: Song[], tagName: string): Song[] {
  return songs.filter((song) => {
    const tags = song.tags || []
    return tags.includes(tagName)
  })
}

/**
 * タグIDから関連する楽曲を取得
 */
export function getSongsByTagId(songs: Song[], tagId: string): Song[] {
  const tagName = getTagNameFromId(tagId)
  return getSongsByTag(songs, tagName)
}

/**
 * タグサービスクラス
 */
export class TagService {
  private static instance: TagService

  private constructor() {}

  public static getInstance(): TagService {
    if (!TagService.instance) {
      TagService.instance = new TagService()
    }
    return TagService.instance
  }

  /**
   * 楽曲リストからタグデータを生成
   */
  public generateTags(songs: Song[]): Tag[] {
    return generateTagsFromSongs(songs)
  }

  /**
   * タグを検索してソート
   */
  public filterAndSortTags(tags: Tag[], options: TagSearchOptions = {}): Tag[] {
    return filterAndSortTags(tags, options)
  }

  /**
   * タグに関連する楽曲を取得
   */
  public getSongsByTag(songs: Song[], tagName: string): Song[] {
    return getSongsByTag(songs, tagName)
  }

  /**
   * タグIDから関連する楽曲を取得
   */
  public getSongsByTagId(songs: Song[], tagId: string): Song[] {
    return getSongsByTagId(songs, tagId)
  }

  /**
   * 楽曲にタグを追加
   * Requirements: 5.4 - タグを追加した時、システムはタグを即座にデータベースに保存すること
   */
  public async addTagToSong(songId: string, tagName: string, currentTags: string[]): Promise<void> {
    // 既に存在するタグは追加しない
    if (currentTags.includes(tagName)) {
      return
    }

    const newTags = [...currentTags, tagName]
    await firebaseService.updateSong(songId, { tags: newTags })

    if (import.meta.env.DEV) {
      console.log(`🏷️ TagService: タグ「${tagName}」を楽曲(${songId})に追加しました`)
    }
  }

  /**
   * 楽曲からタグを削除
   * Requirements: 5.5 - タグを削除した時、システムは即座にデータベースを更新すること
   */
  public async removeTagFromSong(songId: string, tagName: string, currentTags: string[]): Promise<void> {
    const newTags = currentTags.filter((tag) => tag !== tagName)
    await firebaseService.updateSong(songId, { tags: newTags })

    if (import.meta.env.DEV) {
      console.log(`🏷️ TagService: タグ「${tagName}」を楽曲(${songId})から削除しました`)
    }
  }

  /**
   * 楽曲のタグを更新（一括）
   */
  public async updateSongTags(songId: string, tags: string[]): Promise<void> {
    await firebaseService.updateSong(songId, { tags })

    if (import.meta.env.DEV) {
      console.log(`🏷️ TagService: 楽曲(${songId})のタグを更新しました: [${tags.join(', ')}]`)
    }
  }

  /**
   * タグ名からIDを生成
   */
  public getTagId(tagName: string): string {
    return generateTagId(tagName)
  }

  /**
   * タグIDからタグ名を復元
   */
  public getTagName(tagId: string): string {
    return getTagNameFromId(tagId)
  }

  /**
   * タグを削除（関連する全ての楽曲からタグを削除）
   */
  public async deleteTag(tagName: string, songs: Song[]): Promise<void> {
    const relatedSongs = getSongsByTag(songs, tagName)
    
    // 関連する全ての楽曲からタグを削除
    const updatePromises = relatedSongs.map((song) => {
      const newTags = (song.tags || []).filter((tag) => tag !== tagName)
      return firebaseService.updateSong(song.id, { tags: newTags })
    })

    await Promise.all(updatePromises)

    if (import.meta.env.DEV) {
      console.log(`🏷️ TagService: タグ「${tagName}」を${relatedSongs.length}曲から削除しました`)
    }
  }

  /**
   * タグ名を変更（関連する全ての楽曲のタグを更新）
   * 既存タグと同名の場合は統合される
   */
  public async renameTag(oldTagName: string, newTagName: string, songs: Song[]): Promise<void> {
    if (oldTagName === newTagName) {
      return
    }

    const relatedSongs = getSongsByTag(songs, oldTagName)
    
    // 関連する全ての楽曲のタグを更新
    const updatePromises = relatedSongs.map((song) => {
      const currentTags = song.tags || []
      // 古いタグを削除し、新しいタグを追加（重複を避ける）
      const newTags = currentTags
        .filter((tag) => tag !== oldTagName)
        .concat(currentTags.includes(newTagName) ? [] : [newTagName])
      return firebaseService.updateSong(song.id, { tags: newTags })
    })

    await Promise.all(updatePromises)

    if (import.meta.env.DEV) {
      console.log(`🏷️ TagService: タグ「${oldTagName}」を「${newTagName}」に変更しました（${relatedSongs.length}曲）`)
    }
  }

  /**
   * 指定したタグ名が既に存在するかチェック
   */
  public tagExists(tagName: string, songs: Song[]): boolean {
    return songs.some((song) => (song.tags || []).includes(tagName))
  }
}

// シングルトンインスタンスをエクスポート
export const tagService = TagService.getInstance()
