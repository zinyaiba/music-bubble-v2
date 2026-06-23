/**
 * TourGroupItem コンポーネント
 * ツアーグループをタイムラインアイテムとして表示
 *
 * Requirements:
 * - 3.2: ツアーグループのヘッダーにツアー名、開催期間、公演数を表示
 * - 3.3: ヘッダークリックで個別公演リストを展開/折りたたみ
 * - 10.2: 展開/折りたたみ可能なアイテムのインタラクション
 */

import { useState } from 'react'
import type { TourGroup } from '../../types'
import './TourGroupItem.css'

export interface TourGroupItemProps {
  /** ツアーグループデータ */
  tourGroup: TourGroup
  /** 展開/折りたたみコールバック */
  onToggle?: () => void
  /** クリック時のコールバック */
  onClick?: (tourName: string) => void
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
 * TourGroupItem コンポーネント
 * ツアーグループをタイムラインアイテムとして表示
 * - ヘッダー: ツアー名、開催期間、公演数
 * - 展開時: 個別公演リスト
 */
export function TourGroupItem({ tourGroup, onToggle, onClick }: TourGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const dateRange = formatDateRange(tourGroup.firstDate, tourGroup.lastDate)

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
    onToggle?.()
    onClick?.(tourGroup.tourName)
  }

  return (
    <article
      className="tour-group-item"
      role="article"
      aria-expanded={isExpanded}
      aria-label={`${tourGroup.tourName} - ${tourGroup.performanceCount}公演`}
    >
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <div
        className="tour-group-item__header"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        <div className="tour-group-item__content">
          {/* 種別バッジ + 公演数 */}
          <div className="tour-group-item__meta">
            <span className="tour-group-item__type">ツアー</span>
            <span className="tour-group-item__count">{tourGroup.performanceCount}公演</span>
          </div>

          {/* ツアー名 */}
          <h3 className="tour-group-item__title">{tourGroup.tourName}</h3>

          {/* 開催期間 */}
          <p className="tour-group-item__date-range">{dateRange}</p>
        </div>

        {/* 展開アイコン */}
        <span
          className={`tour-group-item__icon ${
            isExpanded ? 'tour-group-item__icon--expanded' : ''
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>

      {/* 展開時: 個別公演リスト */}
      {isExpanded && (
        <ul className="tour-group-item__performances">
          {tourGroup.performances.map((performance) => {
            const location = performance.tourLocation || performance.venueName
            return (
              <li key={performance.id} className="tour-group-item__performance">
                <span className="tour-group-item__performance-date">
                  {formatDate(performance.dateTime)}
                </span>
                <span className="tour-group-item__performance-info">
                  <span className="tour-group-item__performance-location">{location}</span>
                  {performance.venueName && location !== performance.venueName && (
                    <span className="tour-group-item__performance-venue">
                      {performance.venueName}
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

export default TourGroupItem
