/**
 * SongListPage コンポーネント
 * 楽曲一覧ページ
 *
 * Requirements:
 * - 7.1: 全ての楽曲をスクロール可能なリストで表示
 * - 7.4: 新規楽曲を追加するボタンを提供
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { SongSortType } from '../utils/songSorting'
import type { SongDisplayMode } from '../components/song/SongCard'
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

  // URLから検索状態を復元
  const initialQuery = searchParams.get('q') || ''
  const initialTitleOnly = searchParams.get('titleOnly') === 'true'
  const initialSortBy = (searchParams.get('sort') as SongSortType) || 'newest'
  const initialDisplayMode = (searchParams.get('display') as SongDisplayMode) || 'all'

  // 楽曲データの取得（エラーハンドリング統合）
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_曲一覧)
  }, [])

  // 楽曲詳細ページへ遷移（検索状態を保持）
  const handleSongClick = useCallback(
    (songId: string) => {
      // 現在の検索状態をsessionStorageに保存
      const currentParams = searchParams.toString()
      if (currentParams) {
        sessionStorage.setItem('songListParams', currentParams)
      } else {
        sessionStorage.removeItem('songListParams')
      }
      navigate(`/songs/${songId}`)
    },
    [navigate, searchParams]
  )

  // 検索状態の変更をURLに反映
  const handleSearchStateChange = useCallback(
    (query: string, titleOnly: boolean, sortBy: SongSortType, displayMode: SongDisplayMode) => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (titleOnly) params.set('titleOnly', 'true')
      if (sortBy !== 'newest') params.set('sort', sortBy)
      if (displayMode !== 'all') params.set('display', displayMode)
      setSearchParams(params, { replace: true })

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
    // 現在の検索状態をsessionStorageに保存
    const currentParams = searchParams.toString()
    if (currentParams) {
      sessionStorage.setItem('songListParams', currentParams)
    } else {
      sessionStorage.removeItem('songListParams')
    }
    trackEvent(AnalyticsEvents.曲_新規作成)
    navigate('/songs/new')
  }, [navigate, searchParams])

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
          <LoadingSpinner
            size="large"
            message="楽曲データを読み込んでいます..."
            fullScreen
          />
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
            onSearchStateChange={handleSearchStateChange}
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
