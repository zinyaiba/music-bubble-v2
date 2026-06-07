/**
 * SongDetailPage コンポーネント
 * 楽曲詳細ページ
 *
 * Requirements:
 * - 8.5: 前のページに戻るナビゲーションを提供
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Song } from '../types'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
import { errorService } from '../services/errorService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { useOnlineStatus } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { SongDetail } from '../components/song/SongDetail'
import './SongDetailPage.css'

/**
 * SongDetailPage コンポーネント
 * 楽曲詳細ページ - 戻るナビゲーション付き
 */
export function SongDetailPage() {
  const { songId } = useParams<{ songId: string }>()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  // 楽曲データの状態
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_曲詳細, { song_id: songId || '' })
  }, [songId])

  // 楽曲データを取得
  useEffect(() => {
    const loadSong = async () => {
      if (!songId) {
        setError('楽曲IDが指定されていません')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // まずキャッシュから検索
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs) {
          const cachedSong = cachedSongs.find((s) => s.id === songId)
          if (cachedSong) {
            setSong(cachedSong)
            setIsLoading(false)

            // オフラインの場合はキャッシュのみ使用
            if (!errorService.getOnlineStatus()) {
              setError('オフラインモード: キャッシュデータを表示しています')
              return
            }
          }
        }

        // オフラインでキャッシュにない場合
        if (!errorService.getOnlineStatus()) {
          setError('オフラインです。インターネット接続を確認してください。')
          setIsLoading(false)
          return
        }

        // Firebaseから取得（リトライ付き）
        const allSongs = await errorService.withRetry(() => firebaseService.getAllSongs(), {
          maxRetries: 2,
        })
        cacheService.cacheSongs(allSongs)

        const foundSong = allSongs.find((s) => s.id === songId)
        if (foundSong) {
          setSong(foundSong)
        } else {
          setError('楽曲が見つかりませんでした')
        }
        setIsLoading(false)
      } catch (err) {
        errorService.logError(err, 'SongDetailPage.loadSong')

        // キャッシュから再度検索
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs) {
          const cachedSong = cachedSongs.find((s) => s.id === songId)
          if (cachedSong) {
            setSong(cachedSong)
            setError('オフラインモード: キャッシュデータを表示しています')
            setIsLoading(false)
            return
          }
        }

        setError(errorService.getUserFriendlyMessage(err))
        setIsLoading(false)
      }
    }

    loadSong()
  }, [songId])

  // 戻るナビゲーション（検索状態を保持）
  const handleBack = useCallback(() => {
    // localStorageに保存された検索状態を復元してURLパラメータとして遷移
    try {
      const saved = localStorage.getItem('songListState')
      if (saved) {
        const state = JSON.parse(saved)
        const params = new URLSearchParams()
        if (state.query) params.set('q', state.query)
        if (state.titleOnly) params.set('titleOnly', 'true')
        if (state.sortBy && state.sortBy !== 'newest') params.set('sort', state.sortBy)
        if (state.displayMode && state.displayMode !== 'all') params.set('display', state.displayMode)
        if (state.contentFilter && state.contentFilter !== 'all')
          params.set('content', state.contentFilter)
        if (state.yearFilter && state.yearFilter !== 'all') params.set('year', state.yearFilter)
        if (state.monthFilter && state.monthFilter !== 'all')
          params.set('month', state.monthFilter)
        if (state.dayFilter && state.dayFilter !== 'all') params.set('day', state.dayFilter)
        if (state.weekdayFilter && state.weekdayFilter !== 'all')
          params.set('weekday', state.weekdayFilter)

        const paramString = params.toString()
        navigate(paramString ? `/songs?${paramString}` : '/songs')
        return
      }
    } catch (err) {
      console.error('Failed to restore song list state:', err)
    }
    navigate('/songs')
  }, [navigate])

  // ひとつ前に戻る（ヒストリーバック）
  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      // 履歴がない場合は楽曲一覧へ
      handleBack()
    }
  }, [navigate, handleBack])

  // 編集ページへ遷移
  const handleEdit = useCallback(() => {
    if (songId) {
      trackEvent(AnalyticsEvents.曲_編集開始, { song_id: songId })
      navigate(`/songs/${songId}/edit`)
    }
  }, [navigate, songId])

  // 削除確認ダイアログを表示
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  // 削除をキャンセル
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false)
  }, [])

  // 削除を実行
  const handleDeleteConfirm = useCallback(async () => {
    if (!songId) return

    setIsDeleting(true)
    try {
      await errorService.withRetry(() => firebaseService.deleteSong(songId), { maxRetries: 2 })

      // キャッシュから削除
      const cachedSongs = cacheService.getCachedSongs()
      if (cachedSongs) {
        const updatedSongs = cachedSongs.filter((s) => s.id !== songId)
        cacheService.cacheSongs(updatedSongs)
      }

      // 楽曲一覧に戻る
      navigate('/songs')
    } catch (err) {
      errorService.logError(err, 'SongDetailPage.handleDeleteConfirm')
      setError(errorService.getUserFriendlyMessage(err))
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [songId, navigate])

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
  if (isLoading) {
    return (
      <div className="song-detail-page">
        <Header title="楽曲詳細" showBackButton onBack={handleBack} />
        <main className="song-detail-page__main">
          <LoadingSpinner size="large" message="楽曲データを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/songs" onNavigate={handleNavigate} />
      </div>
    )
  }

  // エラー（楽曲が見つからない場合）
  if (!song && error) {
    return (
      <div className="song-detail-page">
        <Header title="楽曲詳細" showBackButton onBack={handleBack} />
        <main className="song-detail-page__main">
          <div className="song-detail-page__error-container">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={!isOnline || error.includes('オフライン') ? undefined : handleRetry}
            />
            <button
              type="button"
              className="song-detail-page__back-to-list"
              onClick={() => navigate('/songs')}
            >
              楽曲一覧に戻る
            </button>
          </div>
        </main>
        <Navigation currentPath="/songs" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="song-detail-page">
      <Header title={song?.title || '楽曲詳細'} showBackButton onBack={handleBack} />

      <main className="song-detail-page__main">
        {/* オフラインモード警告 */}
        {error && error.includes('オフライン') && (
          <div className="song-detail-page__warning">
            <ErrorMessage message={error} type="warning" />
          </div>
        )}

        {/* 右下戻るボタン */}
        <button
          type="button"
          className="song-detail-page__floating-back"
          onClick={handleGoBack}
          aria-label="戻る"
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
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* 楽曲詳細 */}
        {song && (
          <div className="song-detail-page__content">
            <SongDetail
              song={song}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onBack={handleBack}
              onGoBack={handleGoBack}
            />
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="song-detail-page__delete-overlay">
            <div className="song-detail-page__delete-dialog">
              <h3 className="song-detail-page__delete-title">楽曲を削除</h3>
              <p className="song-detail-page__delete-message">
                「{song?.title}」を削除しますか？
                <br />
                この操作は取り消せません。
              </p>
              <div className="song-detail-page__delete-actions">
                <button
                  type="button"
                  className="song-detail-page__delete-cancel"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="song-detail-page__delete-confirm"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default SongDetailPage
