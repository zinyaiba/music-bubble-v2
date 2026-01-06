/**
 * SongDetailPage コンポーネント
 * 楽曲詳細ページ
 *
 * Requirements:
 * - 8.5: 前のページに戻るナビゲーションを提供
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Song } from '../types'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
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

  // 楽曲データの状態
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            return
          }
        }

        // キャッシュになければFirebaseから取得
        const allSongs = await firebaseService.getAllSongs()
        cacheService.cacheSongs(allSongs)

        const foundSong = allSongs.find((s) => s.id === songId)
        if (foundSong) {
          setSong(foundSong)
        } else {
          setError('楽曲が見つかりませんでした')
        }
        setIsLoading(false)
      } catch (err) {
        console.error('楽曲データの取得に失敗しました:', err)

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

        setError('楽曲データの取得に失敗しました。再試行してください。')
        setIsLoading(false)
      }
    }

    loadSong()
  }, [songId])

  // 戻るナビゲーション
  const handleBack = useCallback(() => {
    // ブラウザ履歴があれば戻る、なければ楽曲一覧へ
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/songs')
    }
  }, [navigate])

  // 編集ページへ遷移
  const handleEdit = useCallback(() => {
    if (songId) {
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
      await firebaseService.deleteSong(songId)
      
      // キャッシュから削除
      const cachedSongs = cacheService.getCachedSongs()
      if (cachedSongs) {
        const updatedSongs = cachedSongs.filter((s) => s.id !== songId)
        cacheService.cacheSongs(updatedSongs)
      }

      // 楽曲一覧に戻る
      navigate('/songs')
    } catch (err) {
      console.error('楽曲の削除に失敗しました:', err)
      setError('楽曲の削除に失敗しました。再試行してください。')
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

  // エラー（楽曲が見つからない場合）
  if (!song && error) {
    return (
      <div className="song-detail-page">
        <Header title="楽曲詳細" showBackButton onBack={handleBack} />
        <main className="song-detail-page__main">
          <div className="song-detail-page__error-container">
            <ErrorMessage
              message={error}
              type="error"
              onRetry={error.includes('オフライン') ? undefined : handleRetry}
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
      <Header
        title={song?.title || '楽曲詳細'}
        showBackButton
        onBack={handleBack}
      />

      <main className="song-detail-page__main">
        {/* オフラインモード警告 */}
        {error && error.includes('オフライン') && (
          <div className="song-detail-page__warning">
            <ErrorMessage message={error} type="warning" />
          </div>
        )}

        {/* 楽曲詳細 */}
        {song && (
          <div className="song-detail-page__content">
            <SongDetail
              song={song}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onBack={handleBack}
            />
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="song-detail-page__delete-overlay">
            <div className="song-detail-page__delete-dialog">
              <h3 className="song-detail-page__delete-title">楽曲を削除</h3>
              <p className="song-detail-page__delete-message">
                「{song?.title}」を削除しますか？<br />
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
