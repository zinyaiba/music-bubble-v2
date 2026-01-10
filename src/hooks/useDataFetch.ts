/**
 * useDataFetch フック
 * データ取得とエラーハンドリングを統合
 * 
 * Requirements: 15.1, 15.2, 15.4
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { errorService } from '../services/errorService'
import { cacheService } from '../services/cacheService'
import { firebaseService } from '../services/firebaseService'
import type { Song } from '../types'

interface UseDataFetchResult {
  songs: Song[]
  isLoading: boolean
  error: string | null
  isOffline: boolean
  retry: () => void
}

interface UseDataFetchOptions {
  /** 自動的にデータを取得するかどうか */
  autoFetch?: boolean
  /** リトライ時のコールバック */
  onRetry?: () => void
}

/**
 * 楽曲データの取得とエラーハンドリングを統合したフック
 */
export function useDataFetch(options: UseDataFetchOptions = {}): UseDataFetchResult {
  const { autoFetch = true, onRetry } = options

  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!errorService.getOnlineStatus())
  
  const isMounted = useRef(true)

  // オンライン状態の監視
  useEffect(() => {
    const unsubscribe = errorService.addOnlineListener((online) => {
      setIsOffline(!online)
      
      // オンラインに復帰したら自動的にデータを再取得
      if (online && error) {
        loadSongs()
      }
    })

    return () => {
      unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // データ取得関数
  const loadSongs = useCallback(async () => {
    if (!isMounted.current) return

    setIsLoading(true)
    setError(null)

    try {
      // まずキャッシュから取得を試みる
      const cachedSongs = cacheService.getCachedSongs()
      if (cachedSongs && cachedSongs.length > 0) {
        setSongs(cachedSongs)
        // キャッシュがある場合はローディングを解除
        setIsLoading(false)
      }

      // オフラインの場合はキャッシュのみ使用
      if (!errorService.getOnlineStatus()) {
        if (cachedSongs && cachedSongs.length > 0) {
          setError('オフラインモード: キャッシュデータを表示しています')
        } else {
          setError('オフラインです。インターネット接続を確認してください。')
        }
        setIsLoading(false)
        return
      }

      // Firebaseから最新データを取得（リトライ付き）
      const fetchedSongs = await errorService.withRetry(
        () => firebaseService.getAllSongs(),
        {
          maxRetries: 2,
          onRetry: (attempt) => {
            if (import.meta.env.DEV) {
              console.log(`🔄 useDataFetch: リトライ中 (${attempt}/2)`)
            }
          },
        }
      )

      if (isMounted.current) {
        setSongs(fetchedSongs)
        cacheService.cacheSongs(fetchedSongs)
        setError(null)
        setIsLoading(false)
      }
    } catch (err) {
      errorService.logError(err, 'useDataFetch.loadSongs')

      if (isMounted.current) {
        // キャッシュがあればそれを使用
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(cachedSongs)
          setError('オフラインモード: キャッシュデータを表示しています')
        } else {
          setError(errorService.getUserFriendlyMessage(err))
        }
        setIsLoading(false)
      }
    }
  }, [])

  // リトライ関数
  const retry = useCallback(() => {
    if (onRetry) {
      onRetry()
    }
    loadSongs()
  }, [loadSongs, onRetry])

  // 初回データ取得
  useEffect(() => {
    isMounted.current = true

    if (autoFetch) {
      loadSongs()
    }

    return () => {
      isMounted.current = false
    }
  }, [autoFetch, loadSongs])

  return {
    songs,
    isLoading,
    error,
    isOffline,
    retry,
  }
}

export default useDataFetch
