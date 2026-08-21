import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { KaraokeRepositoryError, KaraokeSong } from '../types'
import { classifyKaraokeRepositoryError, karaokeSongService } from '../services/karaokeSongService'
import { errorService } from '../services/errorService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { DeleteConfirmDialog, KaraokeSongDetail } from '../components/karaoke'
import { buildKaraokeListUrl, loadKaraokeListState } from '../utils/karaokeListState'
import './KaraokeDetailPage.css'

type DetailLoadState =
  | { status: 'loading' }
  | { status: 'error'; error: KaraokeRepositoryError }
  | { status: 'not-found' }
  | { status: 'success'; song: KaraokeSong }

const KARAOKE_LIST_PATH = '/karaoke-songs'
const OFFLINE_DELETE_MESSAGE =
  '削除するにはインターネット接続が必要です。接続を確認して再試行してください'

function getKaraokeListUrl(): string {
  const { query, sortBy, episodeFilter, releaseYearFilter } = loadKaraokeListState()
  return buildKaraokeListUrl(query, sortBy, episodeFilter, releaseYearFilter)
}

/** カラオケ歌唱曲の単一件取得と削除フローを管理する詳細ページ。 */
export function KaraokeDetailPage() {
  const { karaokeSongId } = useParams<{ karaokeSongId: string }>()
  const navigate = useNavigate()
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadState, setLoadState] = useState<DetailLoadState>({ status: 'loading' })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deletionInFlightRef = useRef(false)

  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_カラオケ詳細, {
      karaoke_song_id: karaokeSongId ?? '',
    })
  }, [karaokeSongId])

  useEffect(() => {
    let isCurrentRequest = true

    setLoadState({ status: 'loading' })
    setShowDeleteDialog(false)
    setDeleteError(null)

    if (!karaokeSongId) {
      setLoadState({ status: 'not-found' })
      return () => {
        isCurrentRequest = false
      }
    }

    const loadSong = async () => {
      try {
        const song = await karaokeSongService.getById(karaokeSongId)
        if (!isCurrentRequest) return
        setLoadState(song ? { status: 'success', song } : { status: 'not-found' })
      } catch (error) {
        if (!isCurrentRequest) return
        errorService.logError(error, 'KaraokeDetailPage.loadSong')
        const repositoryError = classifyKaraokeRepositoryError(
          error,
          'カラオケ歌唱曲の取得に失敗しました'
        )
        setLoadState(
          repositoryError.type === 'not-found'
            ? { status: 'not-found' }
            : { status: 'error', error: repositoryError }
        )
      }
    }

    void loadSong()
    return () => {
      isCurrentRequest = false
    }
  }, [karaokeSongId, loadAttempt])

  const handleBackToList = useCallback(() => {
    navigate(getKaraokeListUrl())
  }, [navigate])

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      handleBackToList()
    }
  }, [handleBackToList, navigate])

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  const handleRetryLoad = useCallback(() => {
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  const handleEdit = useCallback(() => {
    if (!karaokeSongId) return
    trackEvent(AnalyticsEvents.カラオケ_編集開始, { karaoke_song_id: karaokeSongId })
    navigate(`${KARAOKE_LIST_PATH}/${encodeURIComponent(karaokeSongId)}/edit`)
  }, [karaokeSongId, navigate])

  const handleDeleteClick = useCallback(() => {
    setDeleteError(null)
    setShowDeleteDialog(true)
  }, [])

  const handleDeleteCancel = useCallback(() => {
    if (deletionInFlightRef.current) return
    setShowDeleteDialog(false)
    setDeleteError(null)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!karaokeSongId || loadState.status !== 'success' || deletionInFlightRef.current) {
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setDeleteError(OFFLINE_DELETE_MESSAGE)
      return
    }

    deletionInFlightRef.current = true
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await karaokeSongService.delete(karaokeSongId)
      trackEvent(AnalyticsEvents.カラオケ_削除, { karaoke_song_id: karaokeSongId })
      navigate(getKaraokeListUrl())
    } catch (error) {
      errorService.logError(error, 'KaraokeDetailPage.deleteSong')
      setDeleteError(
        classifyKaraokeRepositoryError(
          error,
          'カラオケ歌唱曲の削除に失敗しました。もう一度お試しください'
        ).message
      )
    } finally {
      deletionInFlightRef.current = false
      setIsDeleting(false)
    }
  }, [karaokeSongId, loadState, navigate])

  const pageTitle = loadState.status === 'success' ? loadState.song.title : 'カラオケ歌唱詳細'

  return (
    <div className="karaoke-detail-page">
      <Header title={pageTitle} showBackButton onBack={handleBackToList} />

      <main className="karaoke-detail-page__main">
        {loadState.status === 'loading' && (
          <LoadingSpinner size="large" message="カラオケ歌唱曲を読み込んでいます..." fullScreen />
        )}

        {loadState.status === 'error' && (
          <div className="karaoke-detail-page__status">
            <ErrorMessage
              message={loadState.error.message}
              type={loadState.error.type === 'offline' ? 'warning' : 'error'}
              onRetry={handleRetryLoad}
              retryLabel="もう一度読み込む"
            />
            <button
              type="button"
              className="karaoke-detail-page__back-to-list"
              onClick={handleBackToList}
            >
              カラオケ歌唱一覧へ戻る
            </button>
          </div>
        )}

        {loadState.status === 'not-found' && (
          <div className="karaoke-detail-page__status">
            <ErrorMessage message="対象のカラオケ歌唱曲が見つかりません" type="error" />
            <button
              type="button"
              className="karaoke-detail-page__back-to-list"
              onClick={handleBackToList}
            >
              カラオケ歌唱一覧へ戻る
            </button>
          </div>
        )}

        {loadState.status === 'success' && (
          <button
            type="button"
            className="karaoke-detail-page__floating-back"
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
              aria-hidden="true"
              focusable="false"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}

        {loadState.status === 'success' && (
          <div className="karaoke-detail-page__content">
            <KaraokeSongDetail
              song={loadState.song}
              onBack={handleBackToList}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />

            {showDeleteDialog && (
              <DeleteConfirmDialog
                songTitle={loadState.song.title}
                isDeleting={isDeleting}
                error={deleteError}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
              />
            )}
          </div>
        )}
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default KaraokeDetailPage
