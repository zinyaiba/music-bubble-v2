/**
 * SongListPage コンポーネント
 * 楽曲一覧ページ
 *
 * Requirements:
 * - 7.1: 全ての楽曲をスクロール可能なリストで表示
 * - 7.4: 新規楽曲を追加するボタンを提供
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Song } from '../types'
import type { SongSortType } from '../utils/songSorting'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
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
  const initialCompact = searchParams.get('compact') === 'true'

  // 楽曲データの状態
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 楽曲データを取得
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // まずキャッシュから取得を試みる
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(cachedSongs)
          setIsLoading(false)
        }

        // Firebaseから最新データを取得
        const fetchedSongs = await firebaseService.getAllSongs()
        setSongs(fetchedSongs)
        cacheService.cacheSongs(fetchedSongs)
        setIsLoading(false)
      } catch (err) {
        console.error('楽曲データの取得に失敗しました:', err)

        // キャッシュがあればそれを使用
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(cachedSongs)
          setError('オフラインモード: キャッシュデータを表示しています')
        } else {
          setError('楽曲データの取得に失敗しました。再試行してください。')
        }
        setIsLoading(false)
      }
    }

    loadSongs()
  }, [])

  // 楽曲詳細ページへ遷移（検索状態を保持）
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // 検索状態の変更をURLに反映
  const handleSearchStateChange = useCallback(
    (query: string, titleOnly: boolean, sortBy: SongSortType, compact: boolean) => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (titleOnly) params.set('titleOnly', 'true')
      if (sortBy !== 'newest') params.set('sort', sortBy)
      if (compact) params.set('compact', 'true')
      setSearchParams(params, { replace: true })
    },
    [setSearchParams]
  )

  // 新規楽曲追加ページへ遷移
  const handleAddSong = useCallback(() => {
    navigate('/songs/new')
  }, [navigate])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // リトライ
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

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
              type={error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={error.includes('オフライン') ? undefined : handleRetry}
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
            initialCompact={initialCompact}
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
