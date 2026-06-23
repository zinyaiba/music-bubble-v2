/**
 * TimelineYearMonthHeader コンポーネント
 *
 * 各時間グループの上に年月ヘッダー（YYYY-MM形式）を表示する
 * Requirements: 7.2
 */

import './TimelineYearMonthHeader.css'

/** 日付不明アイテムに使用される特別な年月キー */
const UNKNOWN_YEAR_MONTH = '9999-99'

export interface TimelineYearMonthHeaderProps {
  /** 年月キー（YYYY-MM形式）。日付不明の場合は '9999-99' */
  yearMonth: string
}

export function TimelineYearMonthHeader({ yearMonth }: TimelineYearMonthHeaderProps) {
  const label = yearMonth === UNKNOWN_YEAR_MONTH ? '日付不明' : yearMonth

  return <h2 className="timeline-year-month-header">{label}</h2>
}

export default TimelineYearMonthHeader
