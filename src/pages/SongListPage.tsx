/**
 * SongListPage コンポーネント
 * 楽曲一覧ページ
 *
 * Requirements:
 * - 7.1: 全ての楽曲をスクロール可能なリストで表示
 * - 7.4: 新規楽曲を追加するボタンを提供
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Live } from '../types'
import type { SongSortType } from '../utils/songSorting'
import { calculateSongPerformanceStats } from '../utils/songPerformanceStats'
import type { SongDisplayMode } from '../components/song/SongCard'
import type { ContentFilterValue } from '../components/song/SongList'
import { AnalyticsEvents, trackEvent, trackSearch } from '../services/analyticsService'
import { errorService } from '../services/errorService'
import { liveService } from '../services/liveService'
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
  const [lives, setLives] = useState<Live[] | null>(null)

  // 歌唱実績ソートに使用するライブデータを取得
  useEffect(() => {
    let isActive = true

    const loadLives = async () => {
      if (isOffline || !errorService.getOnlineStatus()) {
        setLives(null)
        return
      }

      setLives(null)
      try {
        const allLives = await errorService.withRetry(() => liveService.getAllLives(), {
          maxRetries: 2,
        })
        if (isActive) setLives(allLives)
      } catch (err) {
        errorService.logError(err, 'SongListPage.loadLives')
        if (isActive) setLives(null)
      }
    }

    loadLives()
    return () => {
      isActive = false
    }
  }, [isOffline])

  // 全曲で同一の基準日時を使い、ソート用の歌唱実績を一度だけ算出
  const performanceStatsBySongId = useMemo(() => {
    if (!lives) return undefined

    const now = new Date()
    return new Map(
      songs.map((song) => [song.id, calculateSongPerformanceStats(song, lives, now)] as const)
    )
  }, [songs, lives])

  const [scrollPosition] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('songListScrollPosition')
      if (!saved) return 0

      const position = Number.parseInt(saved, 10)
      return Number.isNaN(position) ? 0 : position
    } catch (err) {
      console.error('Failed to restore scroll position:', err)
      return 0
    }
  })

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_曲一覧)
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
            performanceStatsBySongId={performanceStatsBySongId}
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

        {/* 楽曲関連のフローティングアクション */}
        <div className="song-list-page__floating-actions">
          <button
            type="button"
            className="song-list-page__karaoke-button"
            onClick={() => handleNavigate('/karaoke-songs')}
            aria-label="カラオケ歌唱一覧を開く"
            title="カラオケ歌唱一覧を開く"
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
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>

          <button
            type="button"
            className="song-list-page__tag-button"
            onClick={() => handleNavigate('/tags')}
            aria-label="タグを開く"
            title="タグ"
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
              aria-hidden="true"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>

          <button
            type="button"
            className="song-list-page__add-button"
            onClick={handleAddSong}
            aria-label="新規楽曲を追加"
            title="新規楽曲を追加"
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
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default SongListPage
