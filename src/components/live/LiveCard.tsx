/**
 * LiveCard コンポーネント
 * ライブ情報のコンパクト表示
 *
 * Requirements:
 * - 4.2: ライブ一覧の各項目は、ライブ種別、公演名、会場名、日時を表示
 */

import type { Live } from '../../types'
import { LIVE_TYPE_LABELS } from '../../types'
import './LiveCard.css'

export interface LiveCardProps {
  /** ライブデータ */
  live: Live
  /** クリック時のコールバック */
  onClick: (liveId: string) => void
}

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

    return `${year}/${month}/${day} ${hours}:${minutes}`
  } catch {
    return dateTime
  }
}

/**
 * LiveCard コンポーネント
 * ライブ情報をカード形式でコンパクトに表示
 */
export function LiveCard({ live, onClick }: LiveCardProps) {
  const liveTypeLabel = LIVE_TYPE_LABELS[live.liveType]
  const formattedDateTime = formatDateTime(live.dateTime)
  const hasSetlist = live.setlist && live.setlist.length > 0

  return (
    <article
      className="live-card"
      onClick={() => onClick(live.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(live.id)
        }
      }}
      aria-label={`${live.title} - ${live.venueName}`}
    >
      <div className="live-card__content">
        {/* ライブ種別バッジ */}
        <div className="live-card__header">
          <span className={`live-card__type live-card__type--${live.liveType}`}>
            {liveTypeLabel}
          </span>
          {live.liveType === 'tour' && live.tourLocation && (
            <span className="live-card__location">{live.tourLocation}</span>
          )}
        </div>

        {/* 公演名 */}
        <h3 className="live-card__title">{live.title}</h3>

        {/* 会場名 */}
        <p className="live-card__venue">{live.venueName}</p>

        {/* 日時 */}
        <p className="live-card__datetime">{formattedDateTime}</p>
      </div>

      <div className={`live-card__arrow ${hasSetlist ? 'live-card__arrow--has-setlist' : ''}`}>
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

export default LiveCard
