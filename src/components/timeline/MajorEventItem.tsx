/**
 * MajorEventItem コンポーネント
 *
 * 重要イベント（単独公演・ツアー）をタイムライン軸の中央に
 * 両側にまたがる形で目立つように表示する。
 * - eventType='solo' の場合は live データを表示
 * - eventType='tour' の場合は tourGroup データを表示（展開で公演リスト表示）
 *
 * Requirements:
 * - 2.1: liveType='solo' のライブを両側にまたがる Major_Event として表示
 * - 2.2: liveType='tour' のライブを両側にまたがる Major_Event として表示
 * - 2.3: Major_Event を中央に配置
 * - 2.4: スタイリングで通常アイテムと視覚的に区別
 */

import { useState } from 'react'
import type { MajorEventTimelineItem } from '../../types'
import {
  formatTimelineDate as formatDate,
  formatTimelineDateRange as formatDateRange,
} from '../../utils/timelineDate'
import { resolveCardStyle } from '../../utils/timelineCardStyle'
import { MarqueeText } from '../common/MarqueeText'
import { ExpandToggleIndicator } from './ExpandToggleIndicator'
import { LiveEmbedList } from './LiveEmbedList'
import './MajorEventItem.css'

export interface MajorEventItemProps {
  /** 重要イベントデータ */
  event: MajorEventTimelineItem
  /** 展開/折りたたみコールバック */
  onToggle?: () => void
  /** クリック時のコールバック */
  onClick?: (id: string) => void
}

/**
 * ツアー公演の公演地と会場名を1行用のテキストに整形
 */
function formatPerformanceVenue(tourLocation?: string, venueName?: string): string {
  if (tourLocation && venueName && tourLocation !== venueName) {
    return `${tourLocation} / ${venueName}`
  }
  return tourLocation || venueName || ''
}

/**
 * MajorEventItem コンポーネント
 * 重要イベント（単独公演・ツアー）を中央に目立つように表示
 */
export function MajorEventItem({ event, onToggle, onClick }: MajorEventItemProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(event.isExpanded ?? false)

  const isSolo = event.eventType === 'solo'

  // カテゴリ判定・視覚設定を resolveCardStyle に集約する（Requirements 2.1, 2.2）。
  // Solo_Card / Tour_Card はいずれも Purple_Palette・center 配置で解決される。
  const cardStyle = resolveCardStyle({ kind: 'major-event', eventType: event.eventType })
  // Type_Badge のラベルは LIVE_TYPE_LABELS.solo（単独公演）/ .tour（ツアー）に由来する
  // 色に依存しないテキスト補助要素（Requirements 3.6）。
  const typeLabel = cardStyle.badge.label

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
    onToggle?.()
  }

  const handleClick = () => {
    // 単独公演は実ライブIDで詳細ページへ遷移する（event.id は複合IDのため使用しない）
    if (isSolo && event.live) {
      onClick?.(event.live.id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  // ツアーの場合は展開可能
  const isExpandable = !isSolo && !!event.tourGroup
  const soloEmbedCount = event.live?.embeds?.filter((item) => item.embed.trim() !== '').length ?? 0
  const tourPerformances = event.tourGroup?.performances ?? []
  const tourPerformancesWithEmbeds = tourPerformances.filter((performance) =>
    performance.embeds?.some((item) => item.embed.trim() !== '')
  )
  const getPerformanceUpdatedTime = (performance: (typeof tourPerformances)[number]) => {
    const updatedAt = performance.updatedAt ?? performance.createdAt
    const parsedTime = updatedAt ? Date.parse(updatedAt) : Number.NaN
    return Number.isNaN(parsedTime) ? Number.NEGATIVE_INFINITY : parsedTime
  }
  const latestUpdatedTourPerformance = [...tourPerformancesWithEmbeds].sort(
    (a, b) => getPerformanceUpdatedTime(b) - getPerformanceUpdatedTime(a)
  )[0]
  const visibleTourPerformances = isExpanded
    ? tourPerformances
    : latestUpdatedTourPerformance
      ? [latestUpdatedTourPerformance]
      : []

  return (
    <article
      className={`major-event-item major-event-item--${event.eventType} ${cardStyle.categoryClass}`}
      role="article"
      aria-label={`重要イベント: ${typeLabel}`}
    >
      <div className="major-event-item__badge">{typeLabel}</div>

      {/* 単独公演（solo）の表示 */}
      {isSolo && event.live && (
        <>
          <div
            className="major-event-item__body major-event-item__body--clickable"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={`${event.live.title} - ${event.live.venueName}`}
          >
            <h3 className="major-event-item__title">
              <MarqueeText text={event.live.title} />
            </h3>
            <p className="major-event-item__venue">{event.live.venueName}</p>
            <p className="major-event-item__date">{formatDate(event.live.dateTime)}</p>
          </div>
          <LiveEmbedList live={event.live} limit={isExpanded ? undefined : 1} />
          {soloEmbedCount > 1 && (
            <button
              type="button"
              className="major-event-item__content-toggle"
              onClick={handleToggle}
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? '関連コンテンツを1件に戻す'
                : `関連コンテンツをすべて表示（${soloEmbedCount}件）`}
            </button>
          )}
        </>
      )}

      {/* ツアー（tour）の表示 */}
      {!isSolo && event.tourGroup && (
        <div className="major-event-item__body">
          <div
            className="major-event-item__tour-header"
            role="button"
            tabIndex={0}
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggle()
              }
            }}
            aria-expanded={isExpanded}
            aria-label={`${event.tourGroup.tourName} - ${
              event.tourGroup.performanceCount
            }公演、${isExpanded ? '全公演を閉じる' : '全公演を開く'}`}
          >
            <div className="major-event-item__tour-info">
              <h3 className="major-event-item__title">
                <MarqueeText text={event.tourGroup.tourName} />
              </h3>
              <p className="major-event-item__date">
                {formatDateRange(event.tourGroup.firstDate, event.tourGroup.lastDate)}
              </p>
              <p className="major-event-item__count">{event.tourGroup.performanceCount}公演</p>
            </div>
            {isExpandable && <ExpandToggleIndicator isExpanded={isExpanded} />}
          </div>

          {/* 折りたたみ時は関連コンテンツあり、展開時は全公演を表示 */}
          {visibleTourPerformances.length > 0 && (
            <ul className="major-event-item__performances">
              {visibleTourPerformances.map((performance) => (
                <li key={performance.id} className="major-event-item__performance">
                  <div
                    className="major-event-item__performance-summary"
                    role="button"
                    tabIndex={0}
                    onClick={() => onClick?.(performance.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onClick?.(performance.id)
                      }
                    }}
                  >
                    <span className="major-event-item__performance-date">
                      {formatDate(performance.dateTime)}
                    </span>
                    <span className="major-event-item__performance-venue">
                      <MarqueeText
                        text={formatPerformanceVenue(
                          performance.tourLocation,
                          performance.venueName
                        )}
                      />
                    </span>
                  </div>
                  <LiveEmbedList live={performance} limit={isExpanded ? undefined : 1} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}

export default MajorEventItem
