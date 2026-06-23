/**
 * TimelineGroup コンポーネント
 *
 * 1つの年月グループ（TimelineYearMonthGroup）を表示する。
 * - 年月ヘッダー（TimelineYearMonthHeader）
 * - 中央の垂直タイムライン軸（TimelineAxis）
 * - 各アイテムを position に基づいて配置:
 *   - left   : ライブアイテム（LiveTimelineItem / TourGroupItem）
 *   - right  : 楽曲アイテム（SongTimelineItem / ReleaseUnit）
 *   - center : 重要イベント（MajorEventItem）
 * - アイテム種別に応じて適切なコンポーネントをレンダリングする
 *
 * Requirements:
 * - 1.1: 中央に Timeline_Axis を持つレイアウトを表示する
 * - 1.3: Timeline_Axis の左側にライブイベントを表示する
 * - 1.4: Timeline_Axis の右側に楽曲を表示する
 * - 2.3: Major_Event を Timeline_Axis の中央に配置する
 * - 7.3: 同じ Year_Month_Unit のアイテムを1つの時間ヘッダーの下に表示する
 */

import type { JSX } from 'react'
import type { TimelineItem, TimelineYearMonthGroup } from '../../types'
import { TimelineAxis } from './TimelineAxis'
import { TimelineDot } from './TimelineDot'
import { TimelineYearMonthHeader } from './TimelineYearMonthHeader'
import { SongTimelineItem } from './SongTimelineItem'
import { ReleaseUnit } from './ReleaseUnit'
import { LiveTimelineItem } from './LiveTimelineItem'
import { TourGroupItem } from './TourGroupItem'
import { MajorEventItem } from './MajorEventItem'
import './TimelineGroup.css'

export interface TimelineGroupProps {
  /** 年月グループデータ */
  group: TimelineYearMonthGroup
  /** 楽曲（個別楽曲・リリース単位内の楽曲）クリック時のコールバック */
  onSongClick?: (songId: string) => void
  /** ライブ（個別ライブ・重要イベント）クリック時のコールバック */
  onLiveClick?: (liveId: string) => void
}

/**
 * 各 TimelineItem を種別に応じたコンポーネントへ変換する。
 * ユニオン型の `type` で網羅的に分岐する。
 */
function renderTimelineItem(
  item: TimelineItem,
  handlers: { onSongClick?: (id: string) => void; onLiveClick?: (id: string) => void }
): JSX.Element | null {
  switch (item.type) {
    case 'song':
      return <SongTimelineItem song={item.song} onClick={handlers.onSongClick} />
    case 'release-unit':
      return <ReleaseUnit releaseUnit={item} onSongClick={handlers.onSongClick} />
    case 'live':
      return <LiveTimelineItem live={item.live} onClick={handlers.onLiveClick} />
    case 'tour-group':
      return <TourGroupItem tourGroup={item.tourGroup} />
    case 'major-event':
      return <MajorEventItem event={item} onClick={handlers.onLiveClick} />
    default:
      return null
  }
}

/**
 * TimelineGroup コンポーネント
 * 1つの年月グループを、中央軸を挟んだ左右レイアウトで表示する。
 */
export function TimelineGroup({
  group,
  onSongClick,
  onLiveClick,
}: TimelineGroupProps): JSX.Element {
  const handlers = { onSongClick, onLiveClick }

  return (
    <section className="timeline-group" aria-label={`${group.yearMonth} のタイムライン`}>
      {/* 年月ヘッダー */}
      <TimelineYearMonthHeader yearMonth={group.yearMonth} />

      {/* 本体: 中央の軸を挟んで左右にアイテムを配置 */}
      <div className="timeline-group__body">
        {/* 中央の垂直タイムライン軸（本体全体を縦に貫く） */}
        <div className="timeline-group__axis" aria-hidden="true">
          <TimelineAxis />
        </div>

        {/* アイテム行 */}
        <div className="timeline-group__rows">
          {group.items.map((item) => (
            <div
              key={item.id}
              className={`timeline-group__row timeline-group__row--${item.position}`}
            >
              <div className="timeline-group__cell timeline-group__cell--left">
                {item.position === 'left' && renderTimelineItem(item, handlers)}
              </div>

              {/* 軸との接続ドット */}
              <div className="timeline-group__connector" aria-hidden="true">
                <TimelineDot />
              </div>

              <div className="timeline-group__cell timeline-group__cell--right">
                {item.position === 'right' && renderTimelineItem(item, handlers)}
              </div>

              {/* 重要イベントは中央に両側へまたがって配置 */}
              {item.position === 'center' && (
                <div className="timeline-group__cell timeline-group__cell--center">
                  {renderTimelineItem(item, handlers)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TimelineGroup
