import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ErrorMessage, Header, LoadingSpinner, Navigation } from '../components/common'
import { KaraokeSongForm } from '../components/karaoke'
import { useOnlineStatus } from '../hooks'
import {
  AnalyticsEvents,
  classifyKaraokeRepositoryError,
  errorService,
  karaokeSongService,
  trackEvent,
} from '../services'
import type { CreateKaraokeSongInput, KaraokeSong, KaraokeSongDraft } from '../types'
import { buildKaraokeListUrl, loadKaraokeListState } from '../utils/karaokeListState'
import './KaraokeCreatePage.css'

const KARAOKE_LIST_PATH = '/karaoke-songs'
const OFFLINE_SAVE_MESSAGE =
  'インターネット接続がありません。接続を確認してからもう一度保存してください'

function toDraft(song: KaraokeSong): KaraokeSongDraft {
  return {
    title: song.title,
    originalArtist: song.originalArtist ?? '',
    releaseYear: song.releaseYear?.toString() ?? '',
    streamingEpisodes: song.streamingEpisodes.map(String),
    notes: song.notes ?? '',
  }
}

function getKaraokeListUrl(): string {
  const { query, sortBy, episodeFilter, releaseYearFilter } = loadKaraokeListState()
  return buildKaraokeListUrl(query, sortBy, episodeFilter, releaseYearFilter)
}

/** カラオケ歌唱曲の新規登録と編集を管理するページ。 */
export function KaraokeCreatePage() {
  const { karaokeSongId } = useParams<{ karaokeSongId: string }>()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const isEditMode = Boolean(karaokeSongId)
  const submissionLockRef = useRef(false)
  const [song, setSong] = useState<KaraokeSong | null>(null)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_カラオケ編集, {
      mode: isEditMode ? '編集' : '新規',
      karaoke_song_id: karaokeSongId ?? '',
    })
  }, [isEditMode, karaokeSongId])

  useEffect(() => {
    if (!isEditMode || !karaokeSongId) {
      setIsLoading(false)
      setSong(null)
      setLoadError(null)
      return
    }

    let isCurrentRequest = true
    setIsLoading(true)
    setLoadError(null)

    void karaokeSongService
      .getById(karaokeSongId)
      .then((loadedSong) => {
        if (!isCurrentRequest) return
        if (loadedSong) setSong(loadedSong)
        else setLoadError('対象のカラオケ歌唱曲が見つかりません')
      })
      .catch((error) => {
        if (!isCurrentRequest) return
        errorService.logError(error, 'KaraokeCreatePage.loadSong')
        setLoadError(
          classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の取得に失敗しました').message
        )
      })
      .finally(() => {
        if (isCurrentRequest) setIsLoading(false)
      })

    return () => {
      isCurrentRequest = false
    }
  }, [isEditMode, karaokeSongId])

  const navigateToList = useCallback(() => {
    navigate(getKaraokeListUrl())
  }, [navigate])

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate])

  const handleSubmit = useCallback(
    async (input: CreateKaraokeSongInput) => {
      if (submissionLockRef.current) return
      if (!isOnline || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        setSaveError(OFFLINE_SAVE_MESSAGE)
        return
      }

      submissionLockRef.current = true
      setIsSubmitting(true)
      setSaveError(null)

      try {
        if (isEditMode && karaokeSongId) {
          await karaokeSongService.update(karaokeSongId, input)
          trackEvent(AnalyticsEvents.カラオケ_保存完了, {
            mode: '編集',
            karaoke_song_id: karaokeSongId,
          })
          navigate(getKaraokeListUrl())
        } else {
          const createdId = await karaokeSongService.create(input)
          trackEvent(AnalyticsEvents.カラオケ_保存完了, {
            mode: '新規',
            karaoke_song_id: createdId,
          })
          navigate(`${KARAOKE_LIST_PATH}/${encodeURIComponent(createdId)}`)
        }
      } catch (error) {
        errorService.logError(error, 'KaraokeCreatePage.handleSubmit')
        setSaveError(
          classifyKaraokeRepositoryError(
            error,
            isEditMode ? 'カラオケ歌唱曲の更新に失敗しました' : 'カラオケ歌唱曲の保存に失敗しました'
          ).message
        )
      } finally {
        submissionLockRef.current = false
        setIsSubmitting(false)
      }
    },
    [isEditMode, isOnline, karaokeSongId, navigate]
  )

  const pageTitle = isEditMode ? 'カラオケ歌唱曲を編集' : 'カラオケ歌唱曲を登録'
  const displayError = loadError ?? saveError

  return (
    <div className="karaoke-create-page">
      <Header title={pageTitle} showBackButton onBack={navigateToList} />

      <main className="karaoke-create-page__main" aria-busy={isLoading || isSubmitting}>
        {isLoading ? (
          <LoadingSpinner size="large" message="カラオケ歌唱曲を読み込んでいます..." fullScreen />
        ) : (
          <>
            {displayError && (
              <div className="karaoke-create-page__error">
                <ErrorMessage message={displayError} type={!isOnline ? 'warning' : 'error'} />
              </div>
            )}

            {(!isEditMode || song) && (
              <div className="karaoke-create-page__content">
                <KaraokeSongForm
                  key={song?.id ?? 'new'}
                  initialDraft={song ? toDraft(song) : undefined}
                  mode={isEditMode ? 'edit' : 'create'}
                  onSubmit={handleSubmit}
                  onCancel={navigateToList}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default KaraokeCreatePage
