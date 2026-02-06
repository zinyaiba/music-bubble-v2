/**
 * ライブ情報管理サービス
 * Music Bubble Explorer V2
 * ライブデータのCRUD操作を管理
 */

import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Live, CreateLiveData, UpdateLiveData } from '../types'

/**
 * Firestore用のライブデータ型
 */
interface FirebaseLive extends Omit<Live, 'id' | 'createdAt' | 'updatedAt'> {
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

/**
 * ライブ情報管理サービスクラス
 */
export class LiveService {
  private static instance: LiveService
  private readonly COLLECTION_NAME = 'lives'

  private constructor() {}

  public static getInstance(): LiveService {
    if (!LiveService.instance) {
      LiveService.instance = new LiveService()
    }
    return LiveService.instance
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
        return new Date((timestamp as { seconds: number }).seconds * 1000).toISOString()
      } else {
        return new Date().toISOString()
      }
    } catch (error) {
      console.warn('🎤 LiveService: Timestamp変換エラー:', error)
      return new Date().toISOString()
    }
  }

  /**
   * FirebaseLiveをLiveに変換
   */
  private convertFirebaseLiveToLive(docSnapshot: { id: string; data: () => FirebaseLive }): Live {
    const data = docSnapshot.data()
    const live: Live = {
      id: docSnapshot.id,
      liveType: data.liveType,
      title: data.title || '',
      venueName: data.venueName || '',
      dateTime: data.dateTime || '',
      setlist: data.setlist || [],
      createdAt: this.convertTimestampToString(data.createdAt),
      updatedAt: data.updatedAt ? this.convertTimestampToString(data.updatedAt) : undefined,
    }

    // ツアーの場合のみ公演地を追加
    if (data.tourLocation) {
      live.tourLocation = data.tourLocation
    }

    // 埋め込みコンテンツを追加
    if (data.embeds && data.embeds.length > 0) {
      live.embeds = data.embeds
    }

    return live
  }

  /**
   * ライブを日時の降順でソート
   */
  public sortLivesByDate(lives: Live[]): Live[] {
    return [...lives].sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime()
      const dateB = new Date(b.dateTime).getTime()
      return dateB - dateA // 降順（新しい順）
    })
  }

  /**
   * 全てのライブを取得
   */
  public async getAllLives(): Promise<Live[]> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        console.log('🎤 LiveService: Firebase設定が無効です')
        return []
      }

      const q = query(collection(db, this.COLLECTION_NAME), orderBy('dateTime', 'desc'))

      const querySnapshot = await getDocs(q)
      const lives: Live[] = []

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as FirebaseLive
        lives.push(
          this.convertFirebaseLiveToLive({
            id: docSnapshot.id,
            data: () => data,
          })
        )
      })

      if (import.meta.env.DEV) {
        console.log(`🎤 LiveService: ${lives.length}件のライブを取得しました`)
      }

      return lives
    } catch (error) {
      console.error('🎤 LiveService: ライブ取得エラー', error)
      throw new Error('ライブデータの取得に失敗しました')
    }
  }

  /**
   * ライブをIDで取得
   */
  public async getLiveById(liveId: string): Promise<Live | null> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        console.log('🎤 LiveService: Firebase設定が無効です')
        return null
      }

      const docRef = doc(db, this.COLLECTION_NAME, liveId)
      const docSnapshot = await getDoc(docRef)

      if (!docSnapshot.exists()) {
        return null
      }

      const data = docSnapshot.data() as FirebaseLive
      return this.convertFirebaseLiveToLive({
        id: docSnapshot.id,
        data: () => data,
      })
    } catch (error) {
      console.error('🎤 LiveService: ライブ取得エラー', error)
      throw new Error('ライブデータの取得に失敗しました')
    }
  }

  /**
   * セトリ項目からundefined値を除去してFirestore用に変換
   */
  private sanitizeSetlistForFirestore(
    setlist: CreateLiveData['setlist']
  ): Record<string, unknown>[] {
    return (setlist || []).map((item) => {
      const sanitizedItem: Record<string, unknown> = {
        songTitle: item.songTitle,
        order: item.order,
        isDailySong: item.isDailySong,
      }
      // songIdが存在する場合のみ追加（undefinedを除去）
      if (item.songId) {
        sanitizedItem.songId = item.songId
      }
      return sanitizedItem
    })
  }

  /**
   * ライブを作成
   */
  public async createLive(liveData: CreateLiveData): Promise<string> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        throw new Error('Firebase設定が無効です')
      }

      const docData: Record<string, unknown> = {
        liveType: liveData.liveType,
        title: liveData.title,
        venueName: liveData.venueName,
        dateTime: liveData.dateTime,
        setlist: this.sanitizeSetlistForFirestore(liveData.setlist),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // ツアーの場合のみ公演地を追加
      if (liveData.liveType === 'tour' && liveData.tourLocation) {
        docData.tourLocation = liveData.tourLocation
      }

      // 埋め込みコンテンツを追加
      if (liveData.embeds && liveData.embeds.length > 0) {
        docData.embeds = liveData.embeds
      }

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), docData)

      if (import.meta.env.DEV) {
        console.log(`🎤 LiveService: ライブを作成しました (ID: ${docRef.id})`)
      }

      return docRef.id
    } catch (error) {
      console.error('🎤 LiveService: ライブ作成エラー', error)
      throw new Error('ライブの作成に失敗しました')
    }
  }

  /**
   * ライブを更新
   */
  public async updateLive(liveId: string, liveData: UpdateLiveData): Promise<void> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        throw new Error('Firebase設定が無効です')
      }

      const docRef = doc(db, this.COLLECTION_NAME, liveId)

      const updateData: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      }

      // 更新データを設定
      if (liveData.liveType !== undefined) {
        updateData.liveType = liveData.liveType
      }
      if (liveData.title !== undefined) {
        updateData.title = liveData.title
      }
      if (liveData.venueName !== undefined) {
        updateData.venueName = liveData.venueName
      }
      if (liveData.dateTime !== undefined) {
        updateData.dateTime = liveData.dateTime
      }
      if (liveData.setlist !== undefined) {
        // セトリのundefined値を除去
        updateData.setlist = this.sanitizeSetlistForFirestore(liveData.setlist)
      }
      if (liveData.tourLocation !== undefined) {
        updateData.tourLocation = liveData.tourLocation
      }
      if (liveData.embeds !== undefined) {
        updateData.embeds = liveData.embeds
      }

      await updateDoc(docRef, updateData)

      if (import.meta.env.DEV) {
        console.log(`🎤 LiveService: ライブを更新しました (ID: ${liveId})`)
      }
    } catch (error) {
      console.error('🎤 LiveService: ライブ更新エラー', error)
      throw new Error('ライブの更新に失敗しました')
    }
  }

  /**
   * ライブを削除
   */
  public async deleteLive(liveId: string): Promise<void> {
    try {
      if (!this.isFirebaseAvailable() || !db) {
        throw new Error('Firebase設定が無効です')
      }

      const docRef = doc(db, this.COLLECTION_NAME, liveId)
      await deleteDoc(docRef)

      if (import.meta.env.DEV) {
        console.log(`🎤 LiveService: ライブを削除しました (ID: ${liveId})`)
      }
    } catch (error) {
      console.error('🎤 LiveService: ライブ削除エラー', error)
      throw new Error('ライブの削除に失敗しました')
    }
  }

  /**
   * リアルタイムでライブデータを監視
   */
  public subscribeToLives(callback: (lives: Live[]) => void): () => void {
    if (!this.isFirebaseAvailable() || !db) {
      console.log('🎤 LiveService: Firebase設定が無効です')
      callback([])
      return () => {}
    }

    const q = query(collection(db, this.COLLECTION_NAME), orderBy('dateTime', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const lives: Live[] = []

        querySnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data() as FirebaseLive
          lives.push(
            this.convertFirebaseLiveToLive({
              id: docSnapshot.id,
              data: () => data,
            })
          )
        })

        callback(lives)
      },
      (error) => {
        console.error('🎤 LiveService: リアルタイム監視エラー', error)
      }
    )

    return unsubscribe
  }
}

// シングルトンインスタンスをエクスポート
export const liveService = LiveService.getInstance()
