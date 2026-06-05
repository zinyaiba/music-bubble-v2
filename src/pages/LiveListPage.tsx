/**
 * LiveListPage コンポーネント
 * ライブ一覧ページ
 *
 * Requirements:
 * - 4.1: 登録されたすべてのライブをリスト形式で表示
 * - 4.3: ライブ項目をタップするとライブ詳細ページに遷移
 * - 4.5: ライブが登録されていない場合、空の状態メッセージを表示
 * - 2.1: ツアーをグループ化して1つのカードとして表示
 * - 2.4: 単独公演またはフェスは従来通り個別のカードとして表示
 * - 2.5: ツアーは代表日時、その他は公演日時で降順ソート
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Live, LiveType } from '../types'
import { liveService } from '../services/liveService'
import type { LiveSortType } from '../utils/liveSorting'
import type { LiveContentFilterValue } from '../components/live/LiveList'
import { AnalyticsEvents, trackEvent, trackSearch } from '../services/analyticsService'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { LiveList } from '../components/live/LiveList'
import './LiveListPage.css'

/**
 * LiveListPage コンポーネント
 * ライブ一覧ページ
 */
export function LiveListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [lives, setLives] = useState<Live[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // URLから検索状態を復元、なければlocalStorageから復元
  const getInitialState = () => {
    // URLパラメータが優先
    if (searchParams.toString()) {
      return {
        query: searchParams.get('q') || '',
        sortBy: (searchParams.get('sort') as LiveSortType) || 'newest',
        contentFilter: (searchParams.get('content') as LiveContentFilterValue) || 'all',
        liveTypeFilter: (searchParams.get('type') as LiveType | 'all') || 'all',
        yearFilter: searchParams.get('year') || 'all',
        monthFilter: searchParams.get('month') || 'all',
        locationFilter: searchParams.get('location') || 'all',
      }
    }

    // localStorageから復元を試みる
    try {
      const saved = localStorage.getItem('liveListState')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          query: parsed.query || '',
          sortBy: parsed.sortBy || 'newest',
          contentFilter: parsed.contentFilter || 'all',
          liveTypeFilter: parsed.liveTypeFilter || 'all',
          yearFilter: parsed.yearFilter || 'all',
          monthFilter: parsed.monthFilter || 'all',
          locationFilter: parsed.locationFilter || 'all',
        }
      }
    } catch (err) {
      console.error('Failed to restore live list state:', err)
    }

    // デフォルト値
    return {
      query: '',
      sortBy: 'newest' as LiveSortType,
      contentFilter: 'all' as LiveContentFilterValue,
      liveTypeFilter: 'all' as LiveType | 'all',
      yearFilter: 'all',
      monthFilter: 'all',
      locationFilter: 'all',
    }
  }

  const initialState = getInitialState()
  const initialQuery = initialState.query
  const initialSortBy = initialState.sortBy
  const initialContentFilter = initialState.contentFilter
  const initialLiveTypeFilter = initialState.liveTypeFilter
  const initialYearFilter = initialState.yearFilter
  const initialMonthFilter = initialState.monthFilter
  const initialLocationFilter = initialState.locationFilter

  // ライブデータの取得
  useEffect(() => {
    // ページ閲覧をトラッキング
    trackEvent(AnalyticsEvents.ページ閲覧_ライブ一覧)

    const fetchLives = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await liveService.getAllLives()
        setLives(data)
      } catch (err) {
        console.error('ライブデータの取得に失敗しました:', err)
        setError('ライブデータの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLives()
  }, [])

  // リトライ処理
  const handleRetry = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await liveService.getAllLives()
      setLives(data)
    } catch (err) {
      console.error('ライブデータの取得に失敗しました:', err)
      setError('ライブデータの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ライブ詳細ページへ遷移（検索状態を保持）
  const handleLiveClick = useCallback(
    (liveId: string) => {
      navigate(`/lives/${liveId}`)
    },
    [navigate]
  )

  // ツアー詳細ページへ遷移（検索状態を保持）
  const handleTourClick = useCallback(
    (tourName: string) => {
      // ツアー名をURLエンコードして遷移
      const encodedTourName = encodeURIComponent(tourName)
      navigate(`/tours/${encodedTourName}`)
    },
    [navigate]
  )

  // 検索状態の変更をURLとlocalStorageに反映
  const handleSearchStateChange = useCallback(
    (
      query: string,
      sortBy: LiveSortType,
      contentFilter: LiveContentFilterValue,
      liveTypeFilter: LiveType | 'all',
      yearFilter: string,
      monthFilter: string,
      locationFilter: string
    ) => {
      // URLパラメータを更新
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (sortBy !== 'newest') params.set('sort', sortBy)
      if (contentFilter !== 'all') params.set('content', contentFilter)
      if (liveTypeFilter !== 'all') params.set('type', liveTypeFilter)
      if (yearFilter !== 'all') params.set('year', yearFilter)
      if (monthFilter !== 'all') params.set('month', monthFilter)
      if (locationFilter !== 'all') params.set('location', locationFilter)
      setSearchParams(params, { replace: true })

      // localStorageに保存
      try {
        const state = {
          query,
          sortBy,
          contentFilter,
          liveTypeFilter,
          yearFilter,
          monthFilter,
          locationFilter,
        }
        localStorage.setItem('liveListState', JSON.stringify(state))
      } catch (err) {
        console.error('Failed to save live list state:', err)
      }

      // 検索実行時にトラッキング
      if (query) {
        trackSearch('ライブ', query)
      }
      // ソート変更時にトラッキング
      if (sortBy !== 'newest') {
        trackEvent(AnalyticsEvents.ページ閲覧_ライブ一覧, { sort_type: sortBy })
      }
    },
    [setSearchParams]
  )

  // 新規ライブ追加ページへ遷移
  const handleAddLive = useCallback(() => {
    navigate('/lives/new')
  }, [navigate])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // ローディング中
  if (isLoading && lives.length === 0) {
    return (
      <div className="live-list-page">
        <Header title="ライブ一覧" showBackButton onBack={() => navigate('/')} />
        <main className="live-list-page__main">
          <LoadingSpinner size="large" message="ライブデータを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="live-list-page">
      <Header title="ライブ一覧" showBackButton onBack={() => navigate('/')} />

      <main className="live-list-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="live-list-page__error">
            <ErrorMessage message={error} type="error" onRetry={handleRetry} />
          </div>
        )}

        {/* ライブリスト */}
        <div className="live-list-page__content">
          {lives.length === 0 && !isLoading ? (
            <div className="live-list-page__empty">
              <div className="live-list-page__empty-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="live-list-page__empty-message">ライブが登録されていません</p>
              <p className="live-list-page__empty-hint">
                右下の「+」ボタンから新しいライブを登録できます
              </p>
            </div>
          ) : (
            <LiveList
              lives={lives}
              onLiveClick={handleLiveClick}
              onTourClick={handleTourClick}
              emptyMessage="ライブが見つかりません"
              initialQuery={initialQuery}
              initialSortBy={initialSortBy}
              initialContentFilter={initialContentFilter}
              initialLiveTypeFilter={initialLiveTypeFilter}
              initialYearFilter={initialYearFilter}
              initialMonthFilter={initialMonthFilter}
              initialLocationFilter={initialLocationFilter}
              onSearchStateChange={handleSearchStateChange}
            />
          )}
        </div>

        {/* 新規追加ボタン */}
        <button
          type="button"
          className="live-list-page__add-button"
          onClick={handleAddLive}
          aria-label="新規ライブを追加"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </main>

      <Navigation currentPath="/lives" onNavigate={handleNavigate} />
    </div>
  )
}

export default LiveListPage
