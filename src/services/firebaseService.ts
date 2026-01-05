/**
 * Firebase Firestoreサービス
 * Music Bubble Explorer V2
 * 楽曲データの取得を管理
 */

import {
  collection,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Song } from '../types'

interface FirebaseSong extends Omit<Song, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt?: Timestamp
  updatedAt?: Timestamp
  userId?: string
  isPublic?: boolean
}

/**
 * Firebase Firestoreサービスクラス
 */
export class FirebaseService {
  private static instance: FirebaseService
  private readonly COLLECTION_NAME = 'songs'

  private constructor() {}

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService()
    }
    return FirebaseService.instance
  }

  /**
   * Firebase設定が有効かチェック
   */
  private isFirebaseAvailable(): boolean {
    return db !== null
  }

  /**
   * Firebaseのタイムスタンプを安全にISO文字列に変換
   */
  private convertTimestampToString(timestamp: unknown): string {
    try {
      if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
        return (timestamp as Timestamp).toDate().toISOString()
      } else if (timestamp && typeof timestamp === 'string') {
        return timestamp
      } else if (timestamp && (timestamp as { seconds: number }).seconds) {
        return new Date(
          (timestamp as { seconds: number }).seconds * 1000
        ).toISOString()
      } else {
        return new Date().toISOString()
      }
    } catch (error) {
      console.warn('🔥 Firebase: Timestamp変換エラー:', error)
      return new Date().toISOString()
    }
  }

  /**
   * FirebaseSongをSongに変換
   */
  private convertFirebaseSongToSong(
    doc: { id: string; data: () => FirebaseSong }
  ): Song {
    const data = doc.data()
    const song: Song = {
      id: doc.id,
      title: data.title || '',
      lyricists: data.lyricists || [],
      composers: data.composers || [],
      arrangers: data.arrangers || [],
      tags: data.tags || [],
      notes: data.notes || '',
      createdAt: this.convertTimestampToString(data.createdAt),
      updatedAt: data.updatedAt
        ? this.convertTimestampToString(data.updatedAt)
        : undefined,
    }

    // 拡張フィールド - 値が存在する場合のみ追加
    if (data.artists) song.artists = data.artists
    if (data.releaseYear) song.releaseYear = data.releaseYear
    if (data.releaseDate) song.releaseDate = data.releaseDate
    if (data.singleName) song.singleName = data.singleName
    if (data.albumName) song.albumName = data.albumName
    if (data.musicServiceEmbed) song.musicServiceEmbed = data.musicServiceEmbed
    if (data.detailPageUrls) song.detailPageUrls = data.detailPageUrls

    return song
  }

  /**
   * 全ての楽曲を取得
   */
  public async getAllSongs(): Promise<Song[]> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        console.log('🔥 Firebase: 設定が無効です')
        return []
      }

      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const songs: Song[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseSong
        // isPublicがtrueまたは未設定の楽曲のみを含める
        if (data.isPublic !== false) {
          songs.push(
            this.convertFirebaseSongToSong({
              id: doc.id,
              data: () => data,
            })
          )
        }
      })

      if (import.meta.env.DEV) {
        console.log(`🔥 Firebase: ${songs.length}曲を取得しました`)
      }

      return songs
    } catch (error) {
      console.error('🔥 Firebase: 楽曲取得エラー', error)
      throw new Error('楽曲データの取得に失敗しました')
    }
  }

  /**
   * リアルタイムで楽曲データを監視
   */
  public subscribeToSongs(callback: (songs: Song[]) => void): () => void {
    if (!this.isFirebaseAvailable() || !db) {
      console.log('🔥 Firebase: 設定が無効です')
      callback([])
      return () => {}
    }

    const q = query(
      collection(db, this.COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const songs: Song[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirebaseSong
          // isPublicがtrueまたは未設定の楽曲のみを含める
          if (data.isPublic !== false) {
            songs.push(
              this.convertFirebaseSongToSong({
                id: doc.id,
                data: () => data,
              })
            )
          }
        })

        callback(songs)
      },
      (error) => {
        console.error('🔥 Firebase: リアルタイム監視エラー', error)
      }
    )

    return unsubscribe
  }

  /**
   * 接続状態をチェック
   */
  public async checkConnection(): Promise<boolean> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        return false
      }

      // 空のクエリを実行して接続をテスト（タイムアウト付き）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })

      const connectionPromise = (async () => {
        const q = query(collection(db, this.COLLECTION_NAME))
        await getDocs(q)
        return true
      })()

      await Promise.race([connectionPromise, timeoutPromise])
      return true
    } catch (error) {
      console.error('🔥 Firebase: 接続エラー', error)
      return false
    }
  }
}

// シングルトンインスタンスをエクスポート
export const firebaseService = FirebaseService.getInstance()
