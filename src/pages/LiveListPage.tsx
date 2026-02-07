/**
 * LiveListPage コンポーネント
 * ライブ一覧ページ
 *
 * Requirements:
 * - 4.1: 登録されたすべてのライブをリスト形式で表示
 * - 4.3: ライブ項目をタップするとライブ詳細ページに遷移
 * - 4.5: ライブが登録されていない場合、空の状態メッセージを表示
 * - 2.1: ツアーをグループ化して1つのカードとして表示
 * - 2.4: 単独公演またはフェスは従来通り個別のカードとして表示
 * - 2.5: ツアーは代表日時、その他は公演日時で降順ソート
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Live, TourGroup, GroupedLiveItem } from '../types'
import { liveService } from '../services/liveService'
import { tourGroupingService } from '../services/tourGroupingService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { LiveCard } from '../components/live/LiveCard'
import { TourCard } from '../components/live/TourCard'
import './LiveListPage.css'

/**
 * LiveListPage コンポーネント
 * ライブ一覧ページ - 新規追加ボタン付き
 */
export function LiveListPage() {
  const navigate = useNavigate()
  const [lives, setLives] = useState<Live[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ライブデータをグループ化
  const groupedItems = useMemo<GroupedLiveItem[]>(() => {
    return tourGroupingService.groupLives(lives)
  }, [lives])

  // ライブデータの取得
  useEffect(() => {
    // ページ閲覧をトラッキング
    trackEvent(AnalyticsEvents.ページ閲覧_ライブ一覧)

    const fetchLives = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await liveService.getAllLives()
        setLives(data)
      } catch (err) {
        console.error('ライブデータの取得に失敗しました:', err)
        setError('ライブデータの取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLives()
  }, [])

  // リトライ処理
  const handleRetry = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await liveService.getAllLives()
      setLives(data)
    } catch (err) {
      console.error('ライブデータの取得に失敗しました:', err)
      setError('ライブデータの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ライブ詳細ページへ遷移
  const handleLiveClick = useCallback(
    (liveId: string) => {
      navigate(`/lives/${liveId}`)
    },
    [navigate]
  )

  // ツアー詳細ページへ遷移
  const handleTourClick = useCallback(
    (tourGroup: TourGroup) => {
      // ツアー名をURLエンコードして遷移
      const encodedTourName = encodeURIComponent(tourGroup.tourName)
      navigate(`/tours/${encodedTourName}`)
    },
    [navigate]
  )

  // 新規ライブ追加ページへ遷移
  const handleAddLive = useCallback(() => {
    navigate('/lives/new')
  }, [navigate])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // ローディング中
  if (isLoading && lives.length === 0) {
    return (
      <div className="live-list-page">
        <Header title="ライブ一覧" showBackButton onBack={() => navigate('/')} />
        <main className="live-list-page__main">
          <LoadingSpinner size="large" message="ライブデータを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="live-list-page">
      <Header title="ライブ一覧" showBackButton onBack={() => navigate('/')} />

      <main className="live-list-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="live-list-page__error">
            <ErrorMessage message={error} type="error" onRetry={handleRetry} />
          </div>
        )}

        {/* ライブリスト */}
        <div className="live-list-page__content">
          {groupedItems.length === 0 ? (
            <div className="live-list-page__empty">
              <div className="live-list-page__empty-icon">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="live-list-page__empty-message">ライブが登録されていません</p>
              <p className="live-list-page__empty-hint">
                右下の「+」ボタンから新しいライブを登録できます
              </p>
            </div>
          ) : (
            <div className="live-list-page__list">
              {groupedItems.map((item) =>
                item.type === 'tour' ? (
                  <TourCard
                    key={`tour-${item.data.id}`}
                    tourGroup={item.data}
                    onClick={handleTourClick}
                  />
                ) : (
                  <LiveCard
                    key={`live-${item.data.id}`}
                    live={item.data}
                    onClick={handleLiveClick}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* 新規追加ボタン */}
        <button
          type="button"
          className="live-list-page__add-button"
          onClick={handleAddLive}
          aria-label="新規ライブを追加"
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

      <Navigation currentPath="/lives" onNavigate={handleNavigate} />
    </div>
  )
}

export default LiveListPage
