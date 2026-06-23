/**
 * TimelineAxis コンポーネント
 *
 * 中央の垂直タイムライン軸を表示する。
 * タイムライン全体を縦に貫く可視的な垂直線として機能する。
 *
 * Requirements: 1.1, 9.2
 */

import type { JSX } from 'react'
import './TimelineAxis.css'

export function TimelineAxis(): JSX.Element {
  return <div className="timeline-axis" role="presentation" aria-label="タイムライン軸" />
}

export default TimelineAxis
