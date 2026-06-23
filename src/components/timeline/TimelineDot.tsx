/**
 * TimelineDot コンポーネント
 *
 * タイムライン軸とアイテムを接続するドットを表示する
 * Requirements: 9.3
 */

import './TimelineDot.css'

export interface TimelineDotProps {
  /** 追加のクラス名 */
  className?: string
  /** アクセシビリティ用ラベル（必要な場合） */
  ariaLabel?: string
}

export function TimelineDot({ className = '', ariaLabel }: TimelineDotProps) {
  return (
    <span
      className={`timeline-dot ${className}`.trim()}
      role="presentation"
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  )
}

export default TimelineDot
