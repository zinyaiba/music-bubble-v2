/**
 * TourDetailPage コンポーネント
 * ツアー詳細ページ - 公演地別にセトリを表示
 *
 * Requirements:
 * - 3.1: ツアー名と全公演数を表示
 * - 3.2: 公演地別にアコーディオン形式で表示
 * - 3.6: 最初の公演のアコーディオンをデフォルトで展開
 * - 4.1: 複数の公演のセトリを同時に表示可能
 * - 4.2: 日替わり曲には視覚的なインジケーターを表示（SetlistDisplayで対応）
 * - 4.3: セトリ内の楽曲をタップすると楽曲詳細ページに遷移
 * - 5.1: 展開時に編集ボタンを表示
 * - 5.2: 編集ボタンをタップすると該当公演の編集ページに遷移
 * - 5.3: 戻るボタンをタップするとライブ一覧ページに遷移
 *
 * URL: /tours/:tourName
 * tourNameはURLエンコードされたツアー名
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Live, Song, TourGroup, MusicServiceEmbed } from '../types'
import { liveService } from '../services/liveService'
import { tourGroupingService } from '../services/tourGroupingService'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
import { errorService } from '../services/errorService'
import { useOnlineStatus } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { SetlistDisplay } from '../components/live/SetlistDisplay'
import './TourDetailPage.css'

/**
 * 日時を表示用にフォーマット（年/月/日）
 */
function formatDateTime(dateTime: string): string {
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) {
      return dateTime
    }
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}/${month}/${day}`
  } catch {
    return dateTime
  }
}

/**
 * 埋め込みコンテンツからサービス名を判定
 */
function getEmbedServiceName(embedContent: string | undefined, label?: string): string {
  if (label) return label
  if (!embedContent) return '動画'
  if (embedContent.includes('spotify')) return 'Spotify'
  if (embedContent.includes('youtube') || embedContent.includes('youtu.be')) return 'YouTube'
  if (embedContent.includes('apple')) return 'Apple Music'
  if (embedContent.includes('soundcloud')) return 'SoundCloud'
  if (embedContent.includes('nicovideo') || embedContent.includes('nico.ms')) return 'ニコニコ動画'
  return '動画'
}

/**
 * 埋め込みコンテンツ配列を取得
 */
function getEmbeds(live: Live): MusicServiceEmbed[] {
  if (live.embeds && live.embeds.length > 0) {
    return live.embeds.filter((item) => item.embed && item.embed.trim() !== '')
  }
  return []
}

/**
 * 埋め込みコンテンツがiframeタグかどうかチェック
 */
function isIframeTag(content: string | undefined): boolean {
  if (!content) return false
  return content.trim().toLowerCase().startsWith('<iframe')
}

/**
 * TourDetailPage コンポーネント
 * ツアー詳細ページ - 公演地別にセトリを横スワイプで表示
 */
export function TourDetailPage() {
  const { tourName: encodedTourName } = useParams<{ tourName: string }>()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()
  const carouselRef = useRef<HTMLDivElement>(null)

  // ツアー名をデコード
  const tourName = useMemo(() => {
    if (!encodedTourName) return ''
    try {
      return decodeURIComponent(encodedTourName)
    } catch {
      return encodedTourName
    }
  }, [encodedTourName])

  // 状態管理
  const [tourGroup, setTourGroup] = useState<TourGroup | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 現在表示中の公演インデックス
  const [currentIndex, setCurrentIndex] = useState(0)

  /**
   * 指定インデックスのスライドがiframeを読み込むべきかどうか
   * 現在のスライドとその前後1つのみ読み込む（パフォーマンス最適化）
   */
  const shouldLoadEmbed = useCallback((slideIndex: number): boolean => {
    return Math.abs(slideIndex - currentIndex) <= 1
  }, [currentIndex])

  // データ取得
  useEffect(() => {
    const loadData = async () => {
      if (!tourName) {
        setError('ツアー名が指定されていません')
        setIsLoading(false)
        return
      }

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
          setError('オフラインです。インターネット接続を確認してください。')
          setIsLoading(false)
          return
        }

        // ライブデータを取得
        const allLives = await errorService.withRetry(() => liveService.getAllLives(), {
          maxRetries: 2,
        })

        // ツアー名でフィルタリングしてグループ化
        const tourLives = allLives.filter(
          (live: Live) => live.liveType === 'tour' && live.title === tourName
        )

        if (tourLives.length === 0) {
          setError('ツアーが見つかりませんでした')
          setIsLoading(false)
          return
        }

        // TourGroupを作成
        const group = tourGroupingService.createTourGroup(tourName, tourLives)
        setTourGroup(group)

        // 最初の公演を表示
        setCurrentIndex(0)

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
        errorService.logError(err, 'TourDetailPage.loadData')
        setError(errorService.getUserFriendlyMessage(err))
        setIsLoading(false)
      }
    }

    loadData()
  }, [tourName])

  // 戻るナビゲーション - 要件 5.3
  const handleBack = useCallback(() => {
    navigate('/lives')
  }, [navigate])

  // スクロールイベントで現在のインデックスを更新
  const handleScroll = useCallback(() => {
    if (!carouselRef.current || !tourGroup) return
    const container = carouselRef.current
    const scrollLeft = container.scrollLeft
    const itemWidth = container.offsetWidth
    const newIndex = Math.round(scrollLeft / itemWidth)
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < tourGroup.performances.length) {
      setCurrentIndex(newIndex)
    }
  }, [currentIndex, tourGroup])

  // インジケータークリックで該当公演にスクロール
  const scrollToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return
    const container = carouselRef.current
    const itemWidth = container.offsetWidth
    container.scrollTo({
      left: itemWidth * index,
      behavior: 'smooth'
    })
  }, [])

  // 楽曲詳細ページへ遷移 - 要件 4.3
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // 編集ページへ遷移 - 要件 5.1, 5.2
  const handleEditClick = useCallback(
    (liveId: string) => {
      navigate(`/lives/${liveId}/edit`)
    },
    [navigate]
  )

  // 公演地追加ページへ遷移（ツアー名を固定して新規公演を追加）
  const handleAddPerformance = useCallback(() => {
    const params = new URLSearchParams({ tourName })
    navigate(`/lives/new?${params.toString()}`)
  }, [navigate, tourName])

  // 公演を削除
  const handleDeletePerformance = useCallback(
    async (liveId: string, performanceName: string) => {
      if (!window.confirm(`「${performanceName}」公演を削除しますか？\nこの操作は取り消せません。`)) {
        return
      }

      setIsDeleting(true)
      setError(null)

      try {
        await errorService.withRetry(() => liveService.deleteLive(liveId), { maxRetries: 2 })

        // ツアーグループを更新
        if (tourGroup) {
          const updatedPerformances = tourGroup.performances.filter((p) => p.id !== liveId)
          
          // 公演が0になった場合はライブ一覧に戻る
          if (updatedPerformances.length === 0) {
            navigate('/lives')
            return
          }

          // 現在のインデックスを調整
          const newIndex = Math.min(currentIndex, updatedPerformances.length - 1)
          setCurrentIndex(newIndex)

          setTourGroup({
            ...tourGroup,
            performances: updatedPerformances,
            performanceCount: updatedPerformances.length,
          })
        }

        setIsDeleting(false)
      } catch (err) {
        errorService.logError(err, 'TourDetailPage.handleDeletePerformance')
        setError(errorService.getUserFriendlyMessage(err))
        setIsDeleting(false)
      }
    },
    [tourGroup, currentIndex, navigate]
  )

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
      <div className="tour-detail-page">
        <Header title="ツアー詳細" showBackButton onBack={handleBack} />
        <main className="tour-detail-page__main">
          <LoadingSpinner size="large" message="ツアーデータを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  // エラー（ツアーが見つからない場合）
  if (!tourGroup && error) {
    return (
      <div className="tour-detail-page">
        <Header title="ツアー詳細" showBackButton onBack={handleBack} />
        <main className="tour-detail-page__main">
          <div className="tour-detail-page__error-container">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={!isOnline || error.includes('オフライン') ? undefined : handleRetry}
            />
            <button
              type="button"
              className="tour-detail-page__back-to-list"
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

  return (
    <div className="tour-detail-page">
      <Header title={tourGroup?.tourName || 'ツアー詳細'} showBackButton onBack={handleBack} />

      <main className="tour-detail-page__main">
        {/* オフラインモード警告 */}
        {error && error.includes('オフライン') && (
          <div className="tour-detail-page__warning">
            <ErrorMessage message={error} type="warning" />
          </div>
        )}

        {/* ツアー詳細 */}
        {tourGroup && (
          <div className="tour-detail-page__content">
            {/* ツアーヘッダー - 要件 3.1 */}
            <div className="tour-detail-page__header">
              <span className="tour-detail-page__type-badge">ツアー</span>
              <h1 className="tour-detail-page__title">{tourGroup.tourName}</h1>
              <p className="tour-detail-page__count">全{tourGroup.performanceCount}公演</p>
            </div>

            {/* 公演カルーセル - 横スワイプで切り替え */}
            <div className="tour-detail-page__performances">
              <h2 className="tour-detail-page__section-title">
                <svg
                  className="tour-detail-page__section-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                公演一覧
                <span className="tour-detail-page__swipe-hint">← スワイプで切り替え →</span>
              </h2>

              {/* ページインジケーター */}
              <div className="tour-detail-page__indicators">
                {tourGroup.performances.map((performance, index) => (
                  <button
                    key={performance.id}
                    type="button"
                    className={`tour-detail-page__indicator ${index === currentIndex ? 'tour-detail-page__indicator--active' : ''}`}
                    onClick={() => scrollToIndex(index)}
                    aria-label={`${performance.tourLocation || performance.venueName}公演に移動`}
                  >
                    <span className="tour-detail-page__indicator-label">
                      {performance.tourLocation || performance.venueName}
                    </span>
                  </button>
                ))}
              </div>

              {/* カルーセルコンテナ */}
              <div
                ref={carouselRef}
                className="tour-detail-page__carousel"
                onScroll={handleScroll}
              >
                {tourGroup.performances.map((performance, slideIndex) => (
                  <div key={performance.id} className="tour-detail-page__slide">
                    {/* 公演ヘッダー */}
                    <div className="tour-detail-page__performance-header">
                      {performance.tourLocation && (
                        <span className="tour-detail-page__location">{performance.tourLocation}</span>
                      )}
                      <span className="tour-detail-page__venue">{performance.venueName}</span>
                      <span className="tour-detail-page__date">{formatDateTime(performance.dateTime)}</span>
                    </div>

                    {/* 埋め込みコンテンツ（遅延読み込み：現在のスライドと前後1つのみ） */}
                    {getEmbeds(performance).length > 0 && (
                      <div className="tour-detail-page__embeds">
                        <h3 className="tour-detail-page__embeds-title">
                          <svg
                            className="tour-detail-page__embeds-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="23 7 16 12 23 17 23 7" />
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          </svg>
                          コンテンツ
                        </h3>
                        <div className="tour-detail-page__embeds-list">
                          {shouldLoadEmbed(slideIndex) ? (
                            // 現在のスライドと前後1つのみiframeを読み込む
                            getEmbeds(performance).map((item, index) => (
                              <div key={index} className="tour-detail-page__embed-item">
                                <h4 className="tour-detail-page__embed-label">
                                  {getEmbedServiceName(item.embed, item.label)}
                                </h4>
                                {isIframeTag(item.embed) ? (
                                  <div
                                    className="tour-detail-page__embed-container"
                                    dangerouslySetInnerHTML={{ __html: item.embed }}
                                  />
                                ) : (
                                  <div className="tour-detail-page__embed-container">
                                    <iframe
                                      src={item.embed}
                                      className="tour-detail-page__embed"
                                      title={`${performance.tourLocation || performance.venueName} - ${getEmbedServiceName(item.embed, item.label)}`}
                                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            // 遠いスライドはプレースホルダーを表示
                            <div className="tour-detail-page__embed-placeholder">
                              <span>スワイプすると読み込まれます</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* セトリ */}
                    <div className="tour-detail-page__setlist">
                      <SetlistDisplay
                        items={performance.setlist}
                        songs={songs}
                        onSongClick={handleSongClick}
                      />
                    </div>

                    {/* アクションボタン */}
                    <div className="tour-detail-page__actions">
                      <button
                        type="button"
                        className="tour-detail-page__edit-button"
                        onClick={() => handleEditClick(performance.id)}
                        aria-label={`${performance.tourLocation || performance.venueName}公演を編集`}
                        disabled={isDeleting}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>この公演を編集</span>
                      </button>
                      <button
                        type="button"
                        className="tour-detail-page__add-performance-button"
                        onClick={handleAddPerformance}
                        disabled={isDeleting}
                      >
                        <svg
                          width="16"
                          height="16"
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
                        <span>公演地を追加</span>
                      </button>
                      <button
                        type="button"
                        className="tour-detail-page__delete-button"
                        onClick={() => handleDeletePerformance(performance.id, performance.tourLocation || performance.venueName)}
                        aria-label={`${performance.tourLocation || performance.venueName}公演を削除`}
                        disabled={isDeleting}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        <span>{isDeleting ? '削除中...' : 'この公演を削除'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <Navigation currentPath="/lives" onNavigate={handleNavigate} />
    </div>
  )
}

export default TourDetailPage
