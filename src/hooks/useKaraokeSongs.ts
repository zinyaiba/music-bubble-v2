import { useCallback, useEffect, useRef, useState } from 'react'
import { errorService } from '../services/errorService'
import {
  classifyKaraokeRepositoryError,
  karaokeSongService,
} from '../services/karaokeSongService'
import type { KaraokeRepositoryError, KaraokeSong } from '../types/karaoke'

export interface UseKaraokeSongsResult {
  karaokeSongs: KaraokeSong[]
  isLoading: boolean
  error: KaraokeRepositoryError | null
  isOffline: boolean
  retry: () => void
}

/** カラオケ専用サービスから全件を取得し、一覧画面向けの状態を提供する。 */
export function useKaraokeSongs(): UseKaraokeSongsResult {
  const [karaokeSongs, setKaraokeSongs] = useState<KaraokeSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<KaraokeRepositoryError | null>(null)
  const [isOffline, setIsOffline] = useState(!errorService.getOnlineStatus())
  const isMounted = useRef(false)
  const requestId = useRef(0)

  const loadKaraokeSongs = useCallback(async (): Promise<void> => {
    if (!isMounted.current) return

    const currentRequestId = ++requestId.current
    setIsLoading(true)
    setError(null)

    try {
      const songs = await errorService.withRetry(() => karaokeSongService.getAll(), {
        maxRetries: 2,
        onRetry: (attempt) => {
          if (import.meta.env.DEV) console.log(`🔄 useKaraokeSongs: リトライ中 (${attempt}/2)`)
        },
      })

      if (isMounted.current && requestId.current === currentRequestId) {
        setKaraokeSongs(songs)
      }
    } catch (caughtError) {
      const classifiedError = classifyKaraokeRepositoryError(caughtError)
      errorService.logError(classifiedError, 'useKaraokeSongs.loadKaraokeSongs')

      if (isMounted.current && requestId.current === currentRequestId) {
        setError(classifiedError)
        setIsOffline(
          classifiedError.type === 'offline' || !errorService.getOnlineStatus(),
        )
      }
    } finally {
      if (isMounted.current && requestId.current === currentRequestId) {
        setIsLoading(false)
      }
    }
  }, [])

  const retry = useCallback(() => {
    void loadKaraokeSongs()
  }, [loadKaraokeSongs])

  useEffect(() => {
    isMounted.current = true
    const unsubscribe = errorService.addOnlineListener((online) => {
      if (isMounted.current) setIsOffline(!online)
    })

    void loadKaraokeSongs()

    return () => {
      isMounted.current = false
      requestId.current += 1
      unsubscribe()
    }
  }, [loadKaraokeSongs])

  return { karaokeSongs, isLoading, error, isOffline, retry }
}

export default useKaraokeSongs
