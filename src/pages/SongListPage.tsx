/**
 * SongListPage コンポーネント
 * 楽曲一覧ページ
 *
 * Requirements:
 * - 7.1: 全ての楽曲をスクロール可能なリストで表示
 * - 7.4: 新規楽曲を追加するボタンを提供
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { SongSortType } from '../utils/songSorting'
import type { SongDisplayMode } from '../components/song/SongCard'
import type { ContentFilterValue } from '../components/song/SongList'
import { AnalyticsEvents, trackEvent, trackSearch } from '../services/analyticsService'
import { useDataFetch } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { SongList } from '../components/song/SongList'
import './SongListPage.css'

/**
 * SongListPage コンポーネント
 * 楽曲一覧ページ - 検索機能と新規追加ボタン付き
 */
export function SongListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URLから検索状態を復元、なければlocalStorageから復元
  const getInitialState = () => {
    // URLパラメータが優先
    if (searchParams.toString()) {
      return {
        query: searchParams.get('q') || '',
        titleOnly: searchParams.get('titleOnly') === 'true',
        sortBy: (searchParams.get('sort') as SongSortType) || 'newest',
        displayMode: (searchParams.get('display') as SongDisplayMode) || 'all',
        contentFilter: (searchParams.get('content') as ContentFilterValue) || 'all',
        yearFilter: searchParams.get('year') || 'all',
        monthFilter: searchParams.get('month') || 'all',
        dayFilter: searchParams.get('day') || 'all',
        weekdayFilter: searchParams.get('weekday') || 'all',
      }
    }

    // localStorageから復元を試みる
    try {
      const saved = localStorage.getItem('songListState')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          query: parsed.query || '',
          titleOnly: parsed.titleOnly || false,
          sortBy: parsed.sortBy || 'newest',
          displayMode: parsed.displayMode || 'all',
          contentFilter: parsed.contentFilter || 'all',
          yearFilter: parsed.yearFilter || 'all',
          monthFilter: parsed.monthFilter || 'all',
          dayFilter: parsed.dayFilter || 'all',
          weekdayFilter: parsed.weekdayFilter || 'all',
        }
      }
    } catch (err) {
      console.error('Failed to restore song list state:', err)
    }

    // デフォルト値
    return {
      query: '',
      titleOnly: false,
      sortBy: 'newest' as SongSortType,
      displayMode: 'all' as SongDisplayMode,
      contentFilter: 'all' as ContentFilterValue,
      yearFilter: 'all',
      monthFilter: 'all',
      dayFilter: 'all',
      weekdayFilter: 'all',
    }
  }

  const initialState = getInitialState()
  const initialQuery = initialState.query
  const initialTitleOnly = initialState.titleOnly
  const initialSortBy = initialState.sortBy
  const initialDisplayMode = initialState.displayMode
  const initialContentFilter = initialState.contentFilter
  const initialYearFilter = initialState.yearFilter
  const initialMonthFilter = initialState.monthFilter
  const initialDayFilter = initialState.dayFilter
  const initialWeekdayFilter = initialState.weekdayFilter

  // 楽曲データの取得（エラーハンドリング統合）
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()
  const [scrollPosition, setScrollPosition] = useState<number>(0)

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_曲一覧)
  }, [])

  // スクロール位置を復元（マウント時）
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('songListScrollPosition')
      if (saved) {
        const position = parseInt(saved, 10)
        if (!isNaN(position)) {
          setScrollPosition(position)
        }
      }
    } catch (err) {
      console.error('Failed to restore scroll position:', err)
    }
  }, [])

  // スクロール位置を保存
  const handleSaveScrollPosition = useCallback((scrollTop: number) => {
    try {
      sessionStorage.setItem('songListScrollPosition', scrollTop.toString())
    } catch (err) {
      console.error('Failed to save scroll position:', err)
    }
  }, [])

  // 楽曲詳細ページへ遷移
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // 検索状態の変更をURLとlocalStorageに反映
  const handleSearchStateChange = useCallback(
    (
      query: string,
      titleOnly: boolean,
      sortBy: SongSortType,
      displayMode: SongDisplayMode,
      contentFilter: ContentFilterValue,
      yearFilter: string,
      monthFilter: string,
      dayFilter: string,
      weekdayFilter: string
    ) => {
      // URLパラメータを更新
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (titleOnly) params.set('titleOnly', 'true')
      if (sortBy !== 'newest') params.set('sort', sortBy)
      if (displayMode !== 'all') params.set('display', displayMode)
      if (contentFilter !== 'all') params.set('content', contentFilter)
      if (yearFilter !== 'all') params.set('year', yearFilter)
      if (monthFilter !== 'all') params.set('month', monthFilter)
      if (dayFilter !== 'all') params.set('day', dayFilter)
      if (weekdayFilter !== 'all') params.set('weekday', weekdayFilter)
      setSearchParams(params, { replace: true })

      // localStorageに保存
      try {
        const state = {
          query,
          titleOnly,
          sortBy,
          displayMode,
          contentFilter,
          yearFilter,
          monthFilter,
          dayFilter,
          weekdayFilter,
        }
        localStorage.setItem('songListState', JSON.stringify(state))
      } catch (err) {
        console.error('Failed to save song list state:', err)
      }

      // 検索実行時にトラッキング
      if (query) {
        trackSearch('曲', query)
      }
      // ソート変更時にトラッキング
      if (sortBy !== 'newest') {
        trackEvent(AnalyticsEvents.曲_ソート変更, { sort_type: sortBy })
      }
    },
    [setSearchParams]
  )

  // 新規楽曲追加ページへ遷移
  const handleAddSong = useCallback(() => {
    trackEvent(AnalyticsEvents.曲_新規作成)
    navigate('/songs/new')
  }, [navigate])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // ローディング中
  if (isLoading && songs.length === 0) {
    return (
      <div className="song-list-page">
        <Header title="楽曲一覧" showBackButton onBack={() => navigate('/')} />
        <main className="song-list-page__main">
          <LoadingSpinner size="large" message="楽曲データを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/songs" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="song-list-page">
      <Header title="楽曲一覧" showBackButton onBack={() => navigate('/')} />

      <main className="song-list-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="song-list-page__error">
            <ErrorMessage
              message={error}
              type={isOffline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={isOffline || error.includes('オフライン') ? undefined : retry}
            />
          </div>
        )}

        {/* 楽曲リスト */}
        <div className="song-list-page__content">
          <SongList
            songs={songs}
            onSongClick={handleSongClick}
            emptyMessage="楽曲が登録されていません"
            initialQuery={initialQuery}
            initialTitleOnly={initialTitleOnly}
            initialSortBy={initialSortBy}
            initialDisplayMode={initialDisplayMode}
            initialContentFilter={initialContentFilter}
            initialYearFilter={initialYearFilter}
            initialMonthFilter={initialMonthFilter}
            initialDayFilter={initialDayFilter}
            initialWeekdayFilter={initialWeekdayFilter}
            onSearchStateChange={handleSearchStateChange}
            initialScrollPosition={scrollPosition}
            onSaveScrollPosition={handleSaveScrollPosition}
          />
        </div>

        {/* 新規追加ボタン */}
        <button
          type="button"
          className="song-list-page__add-button"
          onClick={handleAddSong}
          aria-label="新規楽曲を追加"
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

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default SongListPage
