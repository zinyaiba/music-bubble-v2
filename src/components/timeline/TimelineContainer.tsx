/**
 * TimelineContainer コンポーネント
 *
 * タイムライン全体のコンテナ。
 * - スクロール可能な縦方向の領域を提供する
 * - 年月グループ（TimelineYearMonthGroup）の配列を受け取り、
 *   受け取った順序を保ったまま各グループを TimelineGroup でレンダリングする
 * - 楽曲／ライブクリックのコールバックを各 TimelineGroup へ伝播する
 *
 * Requirements:
 * - 1.1: 中央軸を持つスクロール可能な縦方向のタイムラインを表示する
 * - 7.4: 年月グループは時系列順（呼び出し側で決定済みの順序）を保持する
 * - 9.4: レスポンシブ対応（モバイルでも利用可能なレイアウト）
 */

import type { JSX } from 'react'
import type { TimelineYearMonthGroup } from '../../types'
import { TimelineGroup } from './TimelineGroup'
import './TimelineContainer.css'

export interface TimelineContainerProps {
  /** 年月グループの配列（時系列順。順序は呼び出し側で決定済み） */
  groups: TimelineYearMonthGroup[]
  /** 楽曲クリック時のコールバック（各 TimelineGroup へ伝播） */
  onSongClick?: (songId: string) => void
  /** ライブクリック時のコールバック（各 TimelineGroup へ伝播） */
  onLiveClick?: (liveId: string) => void
}

/**
 * TimelineContainer コンポーネント
 * 年月グループ全体を縦に並べたスクロール可能なタイムラインを表示する。
 */
export function TimelineContainer({
  groups,
  onSongClick,
  onLiveClick,
}: TimelineContainerProps): JSX.Element {
  // グループが空の場合は何も表示しない
  if (groups.length === 0) {
    return (
      <div className="timeline-container timeline-container--empty">
        <p className="timeline-container__empty-message">
          表示できるタイムラインがありません
        </p>
      </div>
    )
  }

  return (
    <div className="timeline-container">
      {/* 受け取った順序をそのまま維持してレンダリング */}
      {groups.map((group) => (
        <TimelineGroup
          key={group.yearMonth}
          group={group}
          onSongClick={onSongClick}
          onLiveClick={onLiveClick}
        />
      ))}
    </div>
  )
}

export default TimelineContainer
