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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTimelineData } from '../hooks/useTimelineData'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
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
  const [activeYear, setActiveYear] = useState<string | null>(null)
  const [scrollPosition] = useState(() => {
    try {
      const saved = sessionStorage.getItem('timelineScrollPosition')
      if (!saved) return 0

      const position = parseInt(saved, 10)
      return isNaN(position) ? 0 : position
    } catch (err) {
      console.error('Failed to restore timeline scroll position:', err)
      return 0
    }
  })
  const yearButtonsRef = useRef<HTMLDivElement>(null)

  // タイムラインデータの取得（ソート順変更時に再取得・再ソート）
  const { data, loading, error, retry } = useTimelineData({ sortOrder })

  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_年表)
  }, [])

  // 現在の表示順を維持した年ショートカット一覧
  const years = useMemo(
    () => (data ? Array.from(new Set(data.map((group) => group.yearMonth.slice(0, 4)))) : []),
    [data]
  )

  // データ更新で選択年が消えた場合は、表示順の先頭年を選択状態として扱う
  const displayedYear =
    activeYear && years.includes(activeYear) ? activeYear : (years[0] ?? null)

  // 詳細ページへ遷移する直前のスクロール位置を保存
  const handleSaveScrollPosition = useCallback((scrollTop: number) => {
    try {
      sessionStorage.setItem('timelineScrollPosition', scrollTop.toString())
    } catch (err) {
      console.error('Failed to save timeline scroll position:', err)
    }
  }, [])

  // 選択中の年が横スクロール領域から外れないように追従させる
  useEffect(() => {
    const container = yearButtonsRef.current
    if (!container || !displayedYear) return

    const activeButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.dataset.year === displayedYear
    )
    if (!activeButton) return

    const centeredLeft =
      activeButton.offsetLeft - (container.clientWidth - activeButton.offsetWidth) / 2
    container.scrollTo({ left: Math.max(0, centeredLeft), behavior: 'smooth' })
  }, [displayedYear])

  // ソート順の切り替え
  const handleToggleSortOrder = useCallback(() => {
    const nextSortOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    trackEvent(AnalyticsEvents.年表_ソート変更, { sort_order: nextSortOrder })
    setSortOrder(nextSortOrder)
  }, [sortOrder])

  const handleActiveYearChange = useCallback((year: string) => {
    setActiveYear(year)
  }, [])

  // 指定した年の先頭へ移動
  const handleYearJump = useCallback(
    (year: string) => {
      trackEvent(AnalyticsEvents.年表_年移動, { year, sort_order: sortOrder })
      setActiveYear(year)
      document.getElementById(`timeline-year-${year}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    },
    [sortOrder]
  )

  // 楽曲クリック時: 遷移元を保持して楽曲詳細ページへ遷移
  const handleSongClick = useCallback(
    (songId: string) => {
      trackEvent(AnalyticsEvents.曲_詳細表示, { song_id: songId, source: 'timeline' })
      navigate(`/songs/${songId}`, { state: { fromTimeline: true } })
    },
    [navigate]
  )

  // ライブクリック時: 遷移元を保持してライブ詳細ページへ遷移
  const handleLiveClick = useCallback(
    (liveId: string) => {
      trackEvent(AnalyticsEvents.ライブ_詳細表示, { live_id: liveId, source: 'timeline' })
      navigate(`/lives/${liveId}`, { state: { fromTimeline: true } })
    },
    [navigate]
  )

  return (
    <div className="timeline-page">
      <Header title="ライブ×曲 - 年表" showBackButton onBack={() => navigate('/')} />

      <main className="timeline-page__main">
        {/* ソート切り替えコントロール */}
        <div className="timeline-page__controls">
          {years.length > 0 && (
            <nav className="timeline-page__year-shortcuts" aria-label="年別ショートカット">
              <span className="timeline-page__year-shortcuts-label">年へ移動</span>
              <div className="timeline-page__year-buttons" ref={yearButtonsRef}>
                {years.map((year) => {
                  const isActive = displayedYear === year

                  return (
                    <button
                      key={year}
                      type="button"
                      className={`timeline-page__year-button${isActive ? ' timeline-page__year-button--active' : ''}`}
                      data-year={year}
                      onClick={() => handleYearJump(year)}
                      aria-label={`${year}年へ移動`}
                      aria-current={isActive ? 'date' : undefined}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            </nav>
          )}

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
            {/* 並び替えアイコン: 上下矢印。desc（新しい順）は下向き、asc（古い順）は上向きを強調 */}
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
              className={`timeline-page__sort-icon timeline-page__sort-icon--${sortOrder}`}
            >
              {/* 上向き矢印（古い順 = asc のとき強調） */}
              <g className="timeline-page__sort-arrow timeline-page__sort-arrow--asc">
                <path d="M7 4v16" />
                <path d="M3 8l4-4 4 4" />
              </g>
              {/* 下向き矢印（新しい順 = desc のとき強調） */}
              <g className="timeline-page__sort-arrow timeline-page__sort-arrow--desc">
                <path d="M17 20V4" />
                <path d="M21 16l-4 4-4-4" />
              </g>
            </svg>
            <span>{sortOrder === 'desc' ? '新しい順' : '古い順'}</span>
          </button>
        </div>

        {/* ローディング表示 */}
        {loading && (
          <LoadingSpinner size="large" message="タイムラインを読み込んでいます..." fullScreen />
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
              onActiveYearChange={handleActiveYearChange}
              initialScrollPosition={scrollPosition}
              onSaveScrollPosition={handleSaveScrollPosition}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default TimelinePage
