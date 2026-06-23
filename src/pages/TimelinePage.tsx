/**
 * TimelinePage コンポーネント
 * タイムラインページのルートコンポーネント
 *
 * 楽曲とライブパフォーマンスを時系列で可視化するページ。
 * 直接URL（/timeline）でのみアクセス可能で、ナビゲーションメニューには表示されない。
 *
 * Requirements:
 * - 1.1: 中央軸を持つスクロール可能な縦方向のタイムラインを表示する
 * - 1.5: タイムラインアイテムを時系列順（古い順／新しい順）にソートする
 * - 8.4: データ取得失敗時にエラーメッセージを表示する
 * - 9.1: 既存のデザインシステムと一貫したスタイリングを使用する
 */

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimelineData } from '../hooks/useTimelineData'
import { Header } from '../components/common/Header'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { TimelineContainer } from '../components/timeline/TimelineContainer'
import './TimelinePage.css'

/**
 * TimelinePage コンポーネント
 * URL: /timeline
 */
export function TimelinePage() {
  const navigate = useNavigate()

  // ソート順の状態管理（デフォルト: 新しい順）
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // タイムラインデータの取得（ソート順変更時に再取得・再ソート）
  const { data, loading, error, retry } = useTimelineData({ sortOrder })

  // ソート順の切り替え
  const handleToggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }, [])

  // 楽曲クリック時: 楽曲詳細ページへ遷移
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // ライブクリック時: ライブ詳細ページへ遷移
  const handleLiveClick = useCallback(
    (liveId: string) => {
      navigate(`/lives/${liveId}`)
    },
    [navigate]
  )

  return (
    <div className="timeline-page">
      <Header title="タイムライン" showBackButton onBack={() => navigate('/')} />

      <main className="timeline-page__main">
        {/* ソート切り替えコントロール */}
        <div className="timeline-page__controls">
          <button
            type="button"
            className="timeline-page__sort-toggle"
            onClick={handleToggleSortOrder}
            aria-label={
              sortOrder === 'desc'
                ? '新しい順で表示中。クリックで古い順に切り替え'
                : '古い順で表示中。クリックで新しい順に切り替え'
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M7 12h10" />
              <path d="M11 18h2" />
            </svg>
            <span>{sortOrder === 'desc' ? '新しい順' : '古い順'}</span>
          </button>
        </div>

        {/* ローディング表示 */}
        {loading && (
          <LoadingSpinner
            size="large"
            message="タイムラインを読み込んでいます..."
            fullScreen
          />
        )}

        {/* エラー表示 */}
        {!loading && error && (
          <div className="timeline-page__error">
            <ErrorMessage message={error} type="error" onRetry={retry} />
          </div>
        )}

        {/* データ表示 */}
        {!loading && !error && data && (
          <div className="timeline-page__content">
            <TimelineContainer
              groups={data}
              onSongClick={handleSongClick}
              onLiveClick={handleLiveClick}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default TimelinePage
