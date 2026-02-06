/**
 * SongEditPage コンポーネント
 * 楽曲登録・編集ページ
 *
 * Requirements:
 * - 7.4: 新規楽曲を追加するボタンを提供
 * - 7.5: 既存楽曲の編集機能を提供
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
import { SongForm } from '../components/song/SongForm'
import './SongEditPage.css'

/**
 * SongEditPage コンポーネント
 * 楽曲の新規登録・編集ページ
 */
export function SongEditPage() {
  const { songId } = useParams<{ songId: string }>()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const isEditMode = !!songId

  // 状態
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_曲編集, {
      mode: isEditMode ? '編集' : '新規',
      song_id: songId || '',
    })
  }, [isEditMode, songId])

  // 編集モードの場合、楽曲データを取得
  useEffect(() => {
    if (!isEditMode) return

    const loadSong = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // キャッシュから検索
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs) {
          const cachedSong = cachedSongs.find((s) => s.id === songId)
          if (cachedSong) {
            setSong(cachedSong)
            setIsLoading(false)
            return
          }
        }

        // オフラインでキャッシュにない場合
        if (!errorService.getOnlineStatus()) {
          setError('オフラインです。編集するにはインターネット接続が必要です。')
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
      } catch (err) {
        errorService.logError(err, 'SongEditPage.loadSong')
        setError(errorService.getUserFriendlyMessage(err))
      } finally {
        setIsLoading(false)
      }
    }

    loadSong()
  }, [songId, isEditMode])

  // 戻る（楽曲一覧へ、検索状態を復元）
  const handleBack = useCallback(() => {
    const savedParams = sessionStorage.getItem('songListParams')
    if (savedParams) {
      navigate(`/songs?${savedParams}`)
    } else {
      navigate('/songs')
    }
  }, [navigate])

  // キャンセル
  const handleCancel = useCallback(() => {
    handleBack()
  }, [handleBack])

  // 送信
  const handleSubmit = useCallback(
    async (songData: Partial<Song>) => {
      // オフラインチェック
      if (!errorService.getOnlineStatus()) {
        setError('オフラインです。保存するにはインターネット接続が必要です。')
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        if (isEditMode && songId) {
          // 更新（リトライ付き）
          await errorService.withRetry(() => firebaseService.updateSong(songId, songData), {
            maxRetries: 2,
          })
          trackEvent(AnalyticsEvents.曲_保存完了, { mode: '編集', song_id: songId })
          // キャッシュを更新
          const cachedSongs = cacheService.getCachedSongs()
          if (cachedSongs) {
            const updatedSongs = cachedSongs.map((s) =>
              s.id === songId ? { ...s, ...songData, updatedAt: new Date().toISOString() } : s
            )
            cacheService.cacheSongs(updatedSongs)
          }
          // 楽曲一覧へ戻る（検索状態を復元）
          const savedParams = sessionStorage.getItem('songListParams')
          if (savedParams) {
            navigate(`/songs?${savedParams}`)
          } else {
            navigate('/songs')
          }
        } else {
          // 新規登録（リトライ付き）
          const newSongId = await errorService.withRetry(() => firebaseService.addSong(songData), {
            maxRetries: 2,
          })
          trackEvent(AnalyticsEvents.曲_保存完了, { mode: '新規', song_id: newSongId })
          // キャッシュを更新
          const cachedSongs = cacheService.getCachedSongs() || []
          const newSong: Song = {
            ...songData,
            id: newSongId,
            lyricists: songData.lyricists || [],
            composers: songData.composers || [],
            arrangers: songData.arrangers || [],
            title: songData.title || '',
            createdAt: new Date().toISOString(),
          }
          cacheService.cacheSongs([...cachedSongs, newSong])
          // 詳細ページに遷移
          navigate(`/songs/${newSongId}`)
        }
      } catch (err) {
        errorService.logError(err, 'SongEditPage.handleSubmit')
        setError(errorService.getUserFriendlyMessage(err))
        setIsSubmitting(false)
      }
    },
    [isEditMode, songId, navigate]
  )

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // ローディング中
  if (isLoading) {
    return (
      <div className="song-edit-page">
        <Header
          title={isEditMode ? '楽曲を編集' : '新規楽曲を登録'}
          showBackButton
          onBack={handleBack}
        />
        <main className="song-edit-page__main">
          <LoadingSpinner size="large" message="楽曲データを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/songs" onNavigate={handleNavigate} />
      </div>
    )
  }

  // エラー（編集モードで楽曲が見つからない場合）
  if (isEditMode && !song && error) {
    return (
      <div className="song-edit-page">
        <Header title="楽曲を編集" showBackButton onBack={handleBack} />
        <main className="song-edit-page__main">
          <div className="song-edit-page__error-container">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
            />
            <button
              type="button"
              className="song-edit-page__back-to-list"
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
    <div className="song-edit-page">
      <Header
        title={isEditMode ? '楽曲を編集' : '新規楽曲を登録'}
        showBackButton
        onBack={handleBack}
      />

      <main className="song-edit-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="song-edit-page__error">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
            />
          </div>
        )}

        {/* フォーム */}
        <div className="song-edit-page__content">
          <SongForm
            song={song || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default SongEditPage
