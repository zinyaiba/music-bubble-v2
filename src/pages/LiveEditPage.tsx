/**
 * LiveEditPage コンポーネント
 * ライブ登録・編集ページ
 *
 * Requirements:
 * - 6.8: 有効なフォームを送信した場合、ライブをFirebase Firestoreのlivesコレクションに保存
 * - 7.1: 既存のライブデータでフォームを事前入力
 * - 7.2: すべてのフィールドの編集を許可
 * - 7.3: ライブ種別を「tour」から他の種別に変更した場合、公演地フィールドをクリア
 * - 7.4: セトリ項目の追加、削除、並び替えを許可
 * - 7.5: 各セトリ項目の日替わり曲フラグの切り替えを許可
 * - 7.6: 変更を保存した場合、Firebase Firestoreのlivesコレクション内のライブを更新
 * - 7.7: 保存が成功した場合、確認メッセージを表示
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { Live, Song, SetlistItem } from '../types'
import { liveService } from '../services/liveService'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
import { errorService } from '../services/errorService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { useOnlineStatus } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { LiveForm, type LiveFormData } from '../components/live/LiveForm'
import './LiveEditPage.css'

/**
 * LiveEditPage コンポーネント
 * ライブの新規登録・編集ページ
 */
export function LiveEditPage() {
  const { liveId } = useParams<{ liveId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const isEditMode = !!liveId

  // URLパラメータからツアー名を取得（ツアー公演追加モード）
  const tourNameFromParams = searchParams.get('tourName')
  const isTourAddMode = !isEditMode && !!tourNameFromParams

  // 状態
  const [live, setLive] = useState<Live | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [tourPerformances, setTourPerformances] = useState<Live[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // データの読み込み
  useEffect(() => {
    // ページ閲覧をトラッキング
    trackEvent(AnalyticsEvents.ページ閲覧_ライブ編集, {
      mode: isEditMode ? 'edit' : isTourAddMode ? 'tour_add' : 'new',
      ...(liveId && { live_id: liveId }),
    })

    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // まずキャッシュから楽曲データを取得
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs) {
          setSongs(cachedSongs)
        }

        // オフラインの場合
        if (!errorService.getOnlineStatus()) {
          setError('オフラインです。保存するにはインターネット接続が必要です。')
          setIsLoading(false)
          return
        }

        // 編集モードの場合、ライブデータを取得
        if (isEditMode && liveId) {
          const liveData = await errorService.withRetry(() => liveService.getLiveById(liveId), {
            maxRetries: 2,
          })

          if (!liveData) {
            setError('ライブが見つかりませんでした')
            setIsLoading(false)
            return
          }

          setLive(liveData)
        }

        // ツアー追加モードの場合、同じツアーの公演リストを取得
        if (isTourAddMode && tourNameFromParams) {
          const allLives = await errorService.withRetry(() => liveService.getAllLives(), {
            maxRetries: 2,
          })
          const tourLives = allLives.filter(
            (l: Live) => l.liveType === 'tour' && l.title === tourNameFromParams
          )
          setTourPerformances(tourLives)
        }

        // 楽曲データを取得（キャッシュがない場合）
        if (!cachedSongs) {
          const allSongs = await errorService.withRetry(() => firebaseService.getAllSongs(), {
            maxRetries: 2,
          })
          cacheService.cacheSongs(allSongs)
          setSongs(allSongs)
        }

        setIsLoading(false)
      } catch (err) {
        errorService.logError(err, 'LiveEditPage.loadData')
        setError(errorService.getUserFriendlyMessage(err))
        setIsLoading(false)
      }
    }

    loadData()
  }, [liveId, isEditMode, isTourAddMode, tourNameFromParams])

  // 戻るナビゲーション
  const handleBack = useCallback(() => {
    if (isEditMode && liveId) {
      // ツアー公演の編集の場合はツアー詳細ページに戻る
      if (live?.liveType === 'tour' && live?.title) {
        navigate(`/tours/${encodeURIComponent(live.title)}`)
      } else {
        navigate(`/lives/${liveId}`)
      }
    } else if (isTourAddMode && tourNameFromParams) {
      // ツアー公演追加モードの場合はツアー詳細ページに戻る
      navigate(`/tours/${encodeURIComponent(tourNameFromParams)}`)
    } else {
      navigate('/lives')
    }
  }, [navigate, isEditMode, liveId, isTourAddMode, tourNameFromParams, live])

  // キャンセル
  const handleCancel = useCallback(() => {
    handleBack()
  }, [handleBack])

  // フォーム送信
  const handleSubmit = useCallback(
    async (formData: LiveFormData) => {
      // オフラインチェック
      if (!errorService.getOnlineStatus()) {
        setError('オフラインです。保存するにはインターネット接続が必要です。')
        return
      }

      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      try {
        // セトリデータを変換（orderを追加）
        const setlistWithOrder: SetlistItem[] = formData.setlist.map((item, index) => ({
          songId: item.songId,
          songTitle: item.songTitle,
          order: index + 1,
          isDailySong: item.isDailySong,
        }))

        if (isEditMode && liveId) {
          // 更新処理 (要件 7.6)
          await errorService.withRetry(
            () =>
              liveService.updateLive(liveId, {
                liveType: formData.liveType,
                title: formData.title,
                venueName: formData.venueName,
                dateTime: formData.dateTime,
                tourLocation: formData.liveType === 'tour' ? formData.tourLocation : undefined,
                setlist: setlistWithOrder,
                embeds: formData.embeds,
              }),
            { maxRetries: 2 }
          )

          // 成功メッセージを表示 (要件 7.7)
          setSuccessMessage('ライブを更新しました')

          // 少し待ってから遷移
          setTimeout(() => {
            // ツアー公演の場合はツアー詳細ページに遷移
            if (formData.liveType === 'tour' && formData.title) {
              navigate(`/tours/${encodeURIComponent(formData.title)}`)
            } else {
              navigate(`/lives/${liveId}`)
            }
          }, 1500)
        } else {
          // 新規登録処理 (要件 6.8)
          const newLiveId = await errorService.withRetry(
            () =>
              liveService.createLive({
                liveType: formData.liveType,
                title: formData.title,
                venueName: formData.venueName,
                dateTime: formData.dateTime,
                tourLocation: formData.liveType === 'tour' ? formData.tourLocation : undefined,
                setlist: setlistWithOrder,
                embeds: formData.embeds,
              }),
            { maxRetries: 2 }
          )

          // 成功メッセージを表示 (要件 7.7)
          setSuccessMessage('ライブを登録しました')

          // 少し待ってから遷移
          setTimeout(() => {
            // ツアー公演の場合はツアー詳細ページに遷移
            if (formData.liveType === 'tour' && formData.title) {
              navigate(`/tours/${encodeURIComponent(formData.title)}`)
            } else {
              navigate(`/lives/${newLiveId}`)
            }
          }, 1500)
        }
      } catch (err) {
        errorService.logError(err, 'LiveEditPage.handleSubmit')
        setError(errorService.getUserFriendlyMessage(err))
        setIsSubmitting(false)
      }
    },
    [isEditMode, liveId, navigate]
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
    const headerTitle = isEditMode ? 'ライブを編集' : isTourAddMode ? '公演地を追加' : '新規ライブを登録'
    return (
      <div className="live-edit-page">
        <Header
          title={headerTitle}
          showBackButton
          onBack={handleBack}
        />
        <main className="live-edit-page__main">
          <LoadingSpinner
            size="large"
            message={
              isEditMode ? 'ライブデータを読み込んでいます...' : '楽曲データを読み込んでいます...'
            }
            fullScreen
          />
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  // エラー（編集モードでライブが見つからない場合）
  if (isEditMode && !live && error) {
    return (
      <div className="live-edit-page">
        <Header title="ライブを編集" showBackButton onBack={handleBack} />
        <main className="live-edit-page__main">
          <div className="live-edit-page__error-container">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
            />
            <button
              type="button"
              className="live-edit-page__back-to-list"
              onClick={() => navigate('/lives')}
            >
              ライブ一覧に戻る
            </button>
          </div>
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  const headerTitle = isEditMode ? 'ライブを編集' : isTourAddMode ? '公演地を追加' : '新規ライブを登録'

  return (
    <div className="live-edit-page">
      <Header
        title={headerTitle}
        showBackButton
        onBack={handleBack}
      />

      <main className="live-edit-page__main">
        {/* 成功メッセージ (要件 7.7) */}
        {successMessage && (
          <div className="live-edit-page__success">
            <div className="live-edit-page__success-message">
              <svg
                className="live-edit-page__success-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {successMessage}
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && !successMessage && (
          <div className="live-edit-page__error">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
            />
          </div>
        )}

        {/* フォーム */}
        <div className="live-edit-page__content">
          <LiveForm
            live={live || undefined}
            songs={songs}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSubmitting}
            tourAddMode={isTourAddMode}
            fixedTourName={tourNameFromParams || undefined}
            tourPerformances={tourPerformances}
          />
        </div>
      </main>

      <Navigation currentPath="/lives" onNavigate={handleNavigate} />
    </div>
  )
}

export default LiveEditPage
