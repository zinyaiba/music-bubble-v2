/**
 * PerformanceAccordion コンポーネント
 * 公演情報をアコーディオン形式で表示
 *
 * Requirements:
 * - 3.2: 公演地別にアコーディオン形式で表示
 * - 3.3: 公演地名、会場名、日時を表示
 * - 3.4: 展開時にセトリを表示
 * - 3.5: 折りたたみ時にセトリを非表示
 * - 5.1: 展開時に編集ボタンを表示
 */

import type { Live, Song } from '../../types'
import { SetlistDisplay } from './SetlistDisplay'
import './PerformanceAccordion.css'

export interface PerformanceAccordionProps {
  /** 公演データ */
  performance: Live
  /** 楽曲データ（セトリ表示用） */
  songs: Song[]
  /** 展開状態 */
  isExpanded: boolean
  /** 展開/折りたたみ切り替えコールバック */
  onToggle: () => void
  /** 楽曲クリック時のコールバック */
  onSongClick?: (songId: string) => void
  /** 編集ボタンクリック時のコールバック */
  onEditClick?: (liveId: string) => void
}

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
 * PerformanceAccordion コンポーネント
 * 公演情報をアコーディオン形式で表示
 */
export function PerformanceAccordion({
  performance,
  songs,
  isExpanded,
  onToggle,
  onSongClick,
  onEditClick,
}: PerformanceAccordionProps) {
  const formattedDate = formatDateTime(performance.dateTime)
  const location = performance.tourLocation || ''

  return (
    <div className={`performance-accordion ${isExpanded ? 'performance-accordion--expanded' : ''}`}>
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <button
        type="button"
        className="performance-accordion__header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`performance-content-${performance.id}`}
      >
        <div className="performance-accordion__header-content">
          {/* 公演地 */}
          {location && <span className="performance-accordion__location">{location}</span>}

          {/* 会場名 */}
          <span className="performance-accordion__venue">{performance.venueName}</span>

          {/* 日時 */}
          <span className="performance-accordion__date">{formattedDate}</span>
        </div>

        {/* 展開/折りたたみアイコン */}
        <span className="performance-accordion__toggle-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points={isExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </span>
      </button>

      {/* コンテンツ（展開時のみ表示） */}
      {isExpanded && (
        <div
          id={`performance-content-${performance.id}`}
          className="performance-accordion__content"
        >
          {/* セトリ表示 */}
          <div className="performance-accordion__setlist">
            <SetlistDisplay items={performance.setlist} songs={songs} onSongClick={onSongClick} />
          </div>

          {/* アクションボタン */}
          {onEditClick && (
            <div className="performance-accordion__actions">
              <button
                type="button"
                className="performance-accordion__edit-button"
                onClick={() => onEditClick(performance.id)}
                aria-label={`${location || performance.venueName}公演を編集`}
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PerformanceAccordion
