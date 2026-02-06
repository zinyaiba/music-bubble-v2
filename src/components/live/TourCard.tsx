/**
 * TourCard コンポーネント
 * ツアーグループをカード形式で表示
 *
 * Requirements:
 * - 2.1: ツアーをグループ化して1つのカードとして表示
 * - 2.2: ツアー名、公演数、開催期間（最初と最後の公演日）を表示
 * - 2.3: 公演地のリスト（最大3件）をプレビュー表示
 */

import type { TourGroup } from '../../types'
import './TourCard.css'

export interface TourCardProps {
  /** ツアーグループデータ */
  tourGroup: TourGroup
  /** クリック時のコールバック */
  onClick: (tourGroup: TourGroup) => void
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
 * 公演地リストを取得（最大3件）
 */
function getLocationPreview(tourGroup: TourGroup): string[] {
  const locations: string[] = []
  const seen = new Set<string>()

  for (const performance of tourGroup.performances) {
    const location = performance.tourLocation || performance.venueName
    if (location && !seen.has(location)) {
      seen.add(location)
      locations.push(location)
      if (locations.length >= 3) {
        break
      }
    }
  }

  return locations
}

/**
 * TourCard コンポーネント
 * ツアーグループをカード形式で表示
 */
export function TourCard({ tourGroup, onClick }: TourCardProps) {
  const dateRange = formatDateRange(tourGroup.firstDate, tourGroup.lastDate)
  const locationPreview = getLocationPreview(tourGroup)
  const remainingCount = tourGroup.performanceCount - locationPreview.length

  return (
    <article
      className="tour-card"
      onClick={() => onClick(tourGroup)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(tourGroup)
        }
      }}
      aria-label={`${tourGroup.tourName} - ${tourGroup.performanceCount}公演`}
    >
      <div className="tour-card__content">
        {/* ヘッダー（種別バッジ + 公演数） */}
        <div className="tour-card__header">
          <span className="tour-card__type">ツアー</span>
          <span className="tour-card__count">{tourGroup.performanceCount}公演</span>
        </div>

        {/* ツアー名 */}
        <h3 className="tour-card__title">{tourGroup.tourName}</h3>

        {/* 開催期間 */}
        <p className="tour-card__date-range">{dateRange}</p>

        {/* 公演地プレビュー */}
        {locationPreview.length > 0 && (
          <div className="tour-card__locations">
            {locationPreview.map((location, index) => (
              <span key={index} className="tour-card__location-tag">
                {location}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="tour-card__location-more">+{remainingCount}</span>
            )}
          </div>
        )}
      </div>

      <div className="tour-card__arrow">
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
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </article>
  )
}

export default TourCard
