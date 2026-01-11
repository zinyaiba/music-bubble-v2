/**
 * キャッシュサービス
 * Music Bubble Explorer V2
 * ローカルストレージへのデータキャッシュを管理
 */

import type { Song, Tag } from '../types'

const CACHE_KEYS = {
  SONGS: 'music-bubble-v2-songs',
  TAGS: 'music-bubble-v2-tags',
  TIMESTAMP: 'music-bubble-v2-cache-timestamp',
  ANIMATION_STATE: 'music-bubble-v2-animation-paused',
  BUBBLE_COUNT: 'music-bubble-v2-bubble-count',
} as const

// キャッシュの有効期限（ミリ秒）- 1時間
const CACHE_EXPIRY_MS = 60 * 60 * 1000

interface CachedData<T> {
  data: T
  timestamp: number
}

/**
 * キャッシュサービスクラス
 */
export class CacheService {
  private static instance: CacheService

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  /**
   * ローカルストレージが利用可能かチェック
   */
  private isStorageAvailable(): boolean {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * データをキャッシュに保存
   */
  private setCache<T>(key: string, data: T): void {
    if (!this.isStorageAvailable()) {
      console.warn('💾 Cache: ローカルストレージが利用できません')
      return
    }

    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(key, JSON.stringify(cachedData))
    } catch (error) {
      console.error('💾 Cache: 保存エラー', error)
      // ストレージがいっぱいの場合、古いキャッシュをクリア
      this.clearCache()
    }
  }

  /**
   * キャッシュからデータを取得
   */
  private getCache<T>(key: string): T | null {
    if (!this.isStorageAvailable()) {
      return null
    }

    try {
      const cached = localStorage.getItem(key)
      if (!cached) {
        return null
      }

      const cachedData: CachedData<T> = JSON.parse(cached)

      // 有効期限チェック
      if (Date.now() - cachedData.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(key)
        return null
      }

      return cachedData.data
    } catch (error) {
      console.error('💾 Cache: 取得エラー', error)
      return null
    }
  }

  /**
   * 楽曲データをキャッシュに保存
   */
  public cacheSongs(songs: Song[]): void {
    this.setCache(CACHE_KEYS.SONGS, songs)
    if (import.meta.env.DEV) {
      console.log(`💾 Cache: ${songs.length}曲をキャッシュしました`)
    }
  }

  /**
   * タグデータをキャッシュに保存
   */
  public cacheTags(tags: Tag[]): void {
    this.setCache(CACHE_KEYS.TAGS, tags)
    if (import.meta.env.DEV) {
      console.log(`💾 Cache: ${tags.length}タグをキャッシュしました`)
    }
  }

  /**
   * キャッシュから楽曲データを取得
   */
  public getCachedSongs(): Song[] | null {
    const songs = this.getCache<Song[]>(CACHE_KEYS.SONGS)
    if (songs && import.meta.env.DEV) {
      console.log(`💾 Cache: ${songs.length}曲をキャッシュから取得`)
    }
    return songs
  }

  /**
   * キャッシュからタグデータを取得
   */
  public getCachedTags(): Tag[] | null {
    const tags = this.getCache<Tag[]>(CACHE_KEYS.TAGS)
    if (tags && import.meta.env.DEV) {
      console.log(`💾 Cache: ${tags.length}タグをキャッシュから取得`)
    }
    return tags
  }

  /**
   * キャッシュが有効かチェック
   */
  public isCacheValid(): boolean {
    if (!this.isStorageAvailable()) {
      return false
    }

    try {
      const cached = localStorage.getItem(CACHE_KEYS.SONGS)
      if (!cached) {
        return false
      }

      const cachedData: CachedData<Song[]> = JSON.parse(cached)
      return Date.now() - cachedData.timestamp <= CACHE_EXPIRY_MS
    } catch {
      return false
    }
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    if (!this.isStorageAvailable()) {
      return
    }

    try {
      localStorage.removeItem(CACHE_KEYS.SONGS)
      localStorage.removeItem(CACHE_KEYS.TAGS)
      localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
      if (import.meta.env.DEV) {
        console.log('💾 Cache: キャッシュをクリアしました')
      }
    } catch (error) {
      console.error('💾 Cache: クリアエラー', error)
    }
  }

  /**
   * アニメーション一時停止状態を保存
   */
  public setAnimationPaused(isPaused: boolean): void {
    if (!this.isStorageAvailable()) {
      return
    }

    try {
      localStorage.setItem(CACHE_KEYS.ANIMATION_STATE, JSON.stringify(isPaused))
    } catch (error) {
      console.error('💾 Cache: アニメーション状態保存エラー', error)
    }
  }

  /**
   * アニメーション一時停止状態を取得
   */
  public getAnimationPaused(): boolean {
    if (!this.isStorageAvailable()) {
      return false
    }

    try {
      const value = localStorage.getItem(CACHE_KEYS.ANIMATION_STATE)
      return value ? JSON.parse(value) : false
    } catch {
      return false
    }
  }

  /**
   * シャボン玉表示数を保存
   */
  public setBubbleCount(count: number): void {
    if (!this.isStorageAvailable()) {
      return
    }

    try {
      // 1〜15の範囲に制限
      const validCount = Math.max(1, Math.min(15, count))
      localStorage.setItem(CACHE_KEYS.BUBBLE_COUNT, JSON.stringify(validCount))
    } catch (error) {
      console.error('💾 Cache: シャボン玉数保存エラー', error)
    }
  }

  /**
   * シャボン玉表示数を取得
   */
  public getBubbleCount(): number {
    if (!this.isStorageAvailable()) {
      return 10 // デフォルト値
    }

    try {
      const value = localStorage.getItem(CACHE_KEYS.BUBBLE_COUNT)
      if (value) {
        const count = JSON.parse(value)
        return Math.max(1, Math.min(15, count))
      }
      return 10 // デフォルト値
    } catch {
      return 10 // デフォルト値
    }
  }

  /**
   * キャッシュの統計情報を取得
   */
  public getCacheStats(): {
    hasSongs: boolean
    hasTags: boolean
    isValid: boolean
    songsCount: number
    tagsCount: number
  } {
    const songs = this.getCachedSongs()
    const tags = this.getCachedTags()

    return {
      hasSongs: songs !== null,
      hasTags: tags !== null,
      isValid: this.isCacheValid(),
      songsCount: songs?.length ?? 0,
      tagsCount: tags?.length ?? 0,
    }
  }
}

// シングルトンインスタンスをエクスポート
export const cacheService = CacheService.getInstance()
