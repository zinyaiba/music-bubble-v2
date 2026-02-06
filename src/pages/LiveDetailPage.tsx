/**
 * LiveDetailPage コンポーネント
 * ライブ詳細ページ
 *
 * Requirements:
 * - 5.1: セトリを含むすべてのライブ情報を表示
 * - 5.4: ツアーの場合は公演地を表示
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Live, Song, MusicServiceEmbed } from '../types'
import { LIVE_TYPE_LABELS } from '../types'
import { liveService } from '../services/liveService'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
import { errorService } from '../services/errorService'
import { useOnlineStatus } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { SetlistDisplay } from '../components/live/SetlistDisplay'
import './LiveDetailPage.css'

/**
 * 日時を表示用にフォーマット
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
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    const weekday = weekdays[date.getDay()]

    return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`
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
 * LiveDetailPage コンポーネント
 * ライブ詳細ページ - 編集・削除ボタン付き
 */
export function LiveDetailPage() {
  const { liveId } = useParams<{ liveId: string }>()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

  // ライブデータの状態
  const [live, setLive] = useState<Live | null>(null)
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ライブデータと楽曲データを取得
  useEffect(() => {
    const loadData = async () => {
      if (!liveId) {
        setError('ライブIDが指定されていません')
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
        const liveData = await errorService.withRetry(() => liveService.getLiveById(liveId), {
          maxRetries: 2,
        })

        if (!liveData) {
          setError('ライブが見つかりませんでした')
          setIsLoading(false)
          return
        }

        setLive(liveData)

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
        errorService.logError(err, 'LiveDetailPage.loadData')
        setError(errorService.getUserFriendlyMessage(err))
        setIsLoading(false)
      }
    }

    loadData()
  }, [liveId])

  // 戻るナビゲーション
  const handleBack = useCallback(() => {
    navigate('/lives')
  }, [navigate])

  // 編集ページへ遷移
  const handleEdit = useCallback(() => {
    if (liveId) {
      navigate(`/lives/${liveId}/edit`)
    }
  }, [navigate, liveId])

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
    if (!liveId) return

    setIsDeleting(true)
    try {
      await errorService.withRetry(() => liveService.deleteLive(liveId), { maxRetries: 2 })

      // ライブ一覧に戻る
      navigate('/lives')
    } catch (err) {
      errorService.logError(err, 'LiveDetailPage.handleDeleteConfirm')
      setError(errorService.getUserFriendlyMessage(err))
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [liveId, navigate])

  // 楽曲詳細ページへ遷移
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
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
      <div className="live-detail-page">
        <Header title="ライブ詳細" showBackButton onBack={handleBack} />
        <main className="live-detail-page__main">
          <LoadingSpinner size="large" message="ライブデータを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/lives" onNavigate={handleNavigate} />
      </div>
    )
  }

  // エラー（ライブが見つからない場合）
  if (!live && error) {
    return (
      <div className="live-detail-page">
        <Header title="ライブ詳細" showBackButton onBack={handleBack} />
        <main className="live-detail-page__main">
          <div className="live-detail-page__error-container">
            <ErrorMessage
              message={error}
              type={!isOnline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={!isOnline || error.includes('オフライン') ? undefined : handleRetry}
            />
            <button
              type="button"
              className="live-detail-page__back-to-list"
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
    <div className="live-detail-page">
      <Header title={live?.title || 'ライブ詳細'} showBackButton onBack={handleBack} />

      <main className="live-detail-page__main">
        {/* オフラインモード警告 */}
        {error && error.includes('オフライン') && (
          <div className="live-detail-page__warning">
            <ErrorMessage message={error} type="warning" />
          </div>
        )}

        {/* ライブ詳細 */}
        {live && (
          <div className="live-detail-page__content">
            <div className="live-detail-page__card">
              {/* ライブヘッダー */}
              <div className="live-detail-page__header">
                <span
                  className={`live-detail-page__type-badge live-detail-page__type-badge--${live.liveType}`}
                >
                  {LIVE_TYPE_LABELS[live.liveType]}
                </span>
                <h1 className="live-detail-page__title">{live.title}</h1>
                <p className="live-detail-page__venue">{live.venueName}</p>
              </div>

              {/* ライブ情報 */}
              <div className="live-detail-page__info">
                <div className="live-detail-page__info-row">
                  <span className="live-detail-page__info-label">日時</span>
                  <span className="live-detail-page__info-value">
                    {formatDateTime(live.dateTime)}
                  </span>
                </div>

                {/* ツアーの場合は公演地を表示 (要件 5.4) */}
                {live.liveType === 'tour' && live.tourLocation && (
                  <div className="live-detail-page__info-row">
                    <span className="live-detail-page__info-label">公演地</span>
                    <span className="live-detail-page__info-value">{live.tourLocation}</span>
                  </div>
                )}
              </div>

              {/* 埋め込みコンテンツセクション（上部に配置） */}
              {getEmbeds(live).length > 0 && (
                <div className="live-detail-page__embeds">
                  <h2 className="live-detail-page__embeds-title">
                    <svg
                      className="live-detail-page__embeds-icon"
                      width="20"
                      height="20"
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
                  </h2>
                  <div className="live-detail-page__embeds-list">
                    {getEmbeds(live).map((item, index) => (
                      <div key={index} className="live-detail-page__embed-item">
                        <h3 className="live-detail-page__embed-label">
                          {getEmbedServiceName(item.embed, item.label)}
                        </h3>
                        {isIframeTag(item.embed) ? (
                          <div
                            className="live-detail-page__embed-container"
                            dangerouslySetInnerHTML={{ __html: item.embed }}
                          />
                        ) : (
                          <div className="live-detail-page__embed-container">
                            <iframe
                              src={item.embed}
                              className="live-detail-page__embed"
                              title={`${live.title} - ${getEmbedServiceName(item.embed, item.label)}`}
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* セトリセクション (要件 5.1) */}
              <div className="live-detail-page__setlist">
                <h2 className="live-detail-page__setlist-title">
                  <svg
                    className="live-detail-page__setlist-icon"
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
                  セットリスト
                </h2>
                <SetlistDisplay items={live.setlist} songs={songs} onSongClick={handleSongClick} />
              </div>

              {/* アクションボタン */}
              <div className="live-detail-page__actions">
                <button
                  type="button"
                  className="live-detail-page__action-button live-detail-page__action-button--edit"
                  onClick={handleEdit}
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
                  編集
                </button>
                <button
                  type="button"
                  className="live-detail-page__action-button live-detail-page__action-button--delete"
                  onClick={handleDeleteClick}
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
                  削除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="live-detail-page__delete-overlay">
            <div className="live-detail-page__delete-dialog">
              <h3 className="live-detail-page__delete-title">ライブを削除</h3>
              <p className="live-detail-page__delete-message">
                「{live?.title}」を削除しますか？
                <br />
                この操作は取り消せません。
              </p>
              <div className="live-detail-page__delete-actions">
                <button
                  type="button"
                  className="live-detail-page__delete-cancel"
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="live-detail-page__delete-confirm"
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

      <Navigation currentPath="/lives" onNavigate={handleNavigate} />
    </div>
  )
}

export default LiveDetailPage
