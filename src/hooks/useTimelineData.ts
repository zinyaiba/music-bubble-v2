/**
 * useTimelineData フック
 * タイムラインデータの取得とローディング・エラー状態を管理
 *
 * Requirements: 8.1, 8.2, 8.4
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { TimelineService } from '../services/timelineService'
import { firebaseService } from '../services/firebaseService'
import { liveService } from '../services/liveService'
import { tourGroupingService } from '../services/tourGroupingService'
import type { TimelineYearMonthGroup } from '../types'

interface UseTimelineDataResult {
  /** 年月グループの配列（取得前はnull） */
  data: TimelineYearMonthGroup[] | null
  /** データ取得中かどうか */
  loading: boolean
  /** エラーメッセージ（エラーがない場合はnull） */
  error: string | null
  /** データを再取得する */
  retry: () => void
}

interface UseTimelineDataOptions {
  /** グループのソート順（'asc' | 'desc'、デフォルト: 'desc'） */
  sortOrder?: 'asc' | 'desc'
}

// タイムラインサービスのシングルトンインスタンスを取得
const timelineService = TimelineService.getInstance(
  firebaseService,
  liveService,
  tourGroupingService
)

/**
 * タイムラインデータの取得とエラーハンドリングを統合したフック
 * @param options ソート順などのオプション
 * @returns { data, loading, error, retry }
 */
export function useTimelineData(
  options: UseTimelineDataOptions = {}
): UseTimelineDataResult {
  const { sortOrder = 'desc' } = options

  const [data, setData] = useState<TimelineYearMonthGroup[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isMounted = useRef(true)

  // データ取得関数
  const loadTimelineData = useCallback(async () => {
    if (!isMounted.current) return

    setLoading(true)
    setError(null)

    try {
      const groups = await timelineService.fetchTimelineData(sortOrder)

      if (isMounted.current) {
        setData(groups)
        setError(null)
      }
    } catch (err) {
      if (isMounted.current) {
        const message =
          err instanceof Error
            ? err.message
            : 'タイムラインデータの取得に失敗しました'
        setError(message)
        setData(null)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [sortOrder])

  // リトライ関数
  const retry = useCallback(() => {
    loadTimelineData()
  }, [loadTimelineData])

  // 初回およびソート順変更時のデータ取得
  useEffect(() => {
    isMounted.current = true

    loadTimelineData()

    return () => {
      isMounted.current = false
    }
  }, [loadTimelineData])

  return {
    data,
    loading,
    error,
    retry,
  }
}

export default useTimelineData
