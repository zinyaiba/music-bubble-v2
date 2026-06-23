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
import { LIVE_TYPE_LABELS } from '../../types'
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
 * 日付を表示用にフォーマット（年/月/日）
 */
function formatDate(dateTime: string): string {
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
 * 開催期間を表示用にフォーマット
 */
function formatDateRange(firstDate: string, lastDate: string): string {
  const first = formatDate(firstDate)
  const last = formatDate(lastDate)
  if (first === last) {
    return first
  }
  return `${first} 〜 ${last}`
}

/**
 * MajorEventItem コンポーネント
 * 重要イベント（単独公演・ツアー）を中央に目立つように表示
 */
export function MajorEventItem({ event, onToggle, onClick }: MajorEventItemProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(event.isExpanded ?? false)

  const isSolo = event.eventType === 'solo'
  const typeLabel = isSolo ? LIVE_TYPE_LABELS.solo : LIVE_TYPE_LABELS.tour

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

  return (
    <article
      className="major-event-item"
      role="article"
      aria-label={`重要イベント: ${typeLabel}`}
    >
      <div className="major-event-item__badge">{typeLabel}</div>

      {/* 単独公演（solo）の表示 */}
      {isSolo && event.live && (
        <div
          className="major-event-item__body major-event-item__body--clickable"
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label={`${event.live.title} - ${event.live.venueName}`}
        >
          <h3 className="major-event-item__title">{event.live.title}</h3>
          <p className="major-event-item__venue">{event.live.venueName}</p>
          <p className="major-event-item__date">{formatDate(event.live.dateTime)}</p>
        </div>
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
            aria-label={`${event.tourGroup.tourName} - ${event.tourGroup.performanceCount}公演`}
          >
            <div className="major-event-item__tour-info">
              <h3 className="major-event-item__title">{event.tourGroup.tourName}</h3>
              <p className="major-event-item__date">
                {formatDateRange(event.tourGroup.firstDate, event.tourGroup.lastDate)}
              </p>
              <p className="major-event-item__count">
                {event.tourGroup.performanceCount}公演
              </p>
            </div>
            {isExpandable && (
              <span
                className={`major-event-item__toggle ${
                  isExpanded ? 'major-event-item__toggle--expanded' : ''
                }`}
                aria-hidden="true"
              >
                ▼
              </span>
            )}
          </div>

          {/* 展開時: 個別公演リスト */}
          {isExpanded && (
            <ul className="major-event-item__performances">
              {event.tourGroup.performances.map((performance) => (
                <li
                  key={performance.id}
                  className="major-event-item__performance"
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
                    {performance.tourLocation || performance.venueName}
                  </span>
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
