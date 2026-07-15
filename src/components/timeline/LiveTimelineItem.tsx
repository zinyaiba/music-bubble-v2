/**
 * LiveTimelineItem コンポーネント
 *
 * 個別ライブイベントをタイムラインアイテムとして表示する。
 * クリック可能で、ライブ名・日時・場所（会場名／公演地）を表示する。
 *
 * Requirements:
 * - 1.3: タイムライン軸の左側にライブイベントを表示する
 * - 10.1: タイムラインアイテムがクリックされたら詳細ページにナビゲートする
 */

import type { Live } from '../../types'
import { LIVE_TYPE_LABELS } from '../../types'
import { resolveCardStyle } from '../../utils/timelineCardStyle'
import { MarqueeText } from '../common/MarqueeText'
import { LiveEmbedList } from './LiveEmbedList'
import './LiveTimelineItem.css'

export interface LiveTimelineItemProps {
  /** ライブデータ */
  live: Live
  /** クリック時のコールバック */
  onClick?: (liveId: string) => void
}

/**
 * 日時を表示用にフォーマット（YYYY/M/D）
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
 * LiveTimelineItem コンポーネント
 * 個別ライブイベントをタイムラインアイテムとして表示
 */
export function LiveTimelineItem({ live, onClick }: LiveTimelineItemProps) {
  const liveTypeLabel = LIVE_TYPE_LABELS[live.liveType]
  const formattedDateTime = formatDateTime(live.dateTime)

  // Other_Live_Card の視覚設定（カテゴリクラス・サブ種別配色）を解決する。
  // badge.subTypeClass に基づき既存 live-timeline-item__type--* 配色を再利用する。
  const cardStyle = resolveCardStyle({ kind: 'live', liveType: live.liveType })
  const subTypeClass = cardStyle.badge.subTypeClass ?? 'other'

  // 補足的な場所情報（ツアーの公演地 / その他・海外カテゴリのライブ種別名）
  const locationDetail =
    live.liveType === 'tour'
      ? live.tourLocation
      : live.liveType === 'other' || live.liveType === 'overseas'
        ? live.otherCategory
        : undefined

  const handleClick = () => {
    onClick?.(live.id)
  }

  return (
    <article
      className={`live-timeline-item ${cardStyle.categoryClass}`}
      onClick={handleClick}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(live.id)
        }
      }}
      aria-label={`${live.title} - ${live.venueName}`}
    >
      {/* ヘッダー（種別バッジ + 補足の場所情報） */}
      <div className="live-timeline-item__header">
        <span className={`live-timeline-item__type live-timeline-item__type--${subTypeClass}`}>
          {liveTypeLabel}
        </span>
        {locationDetail && <span className="live-timeline-item__location">{locationDetail}</span>}
      </div>

      {/* 公演名 */}
      <h3 className="live-timeline-item__title">
        <MarqueeText text={live.title} />
      </h3>

      {/* 会場名 */}
      <p className="live-timeline-item__venue">{live.venueName}</p>

      {/* 日時 */}
      <p className="live-timeline-item__datetime">{formattedDateTime}</p>

      {/* 埋め込みコンテンツ（サムネイル先行・タップで iframe 生成） */}
      <LiveEmbedList live={live} />
    </article>
  )
}

export default LiveTimelineItem
