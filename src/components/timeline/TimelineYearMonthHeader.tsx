/**
 * TimelineYearMonthHeader コンポーネント
 *
 * 各時間グループの上に年月ヘッダーを表示する。
 * - 'YYYY-MM' → 「YYYY年M月」
 * - 'YYYY-99' → 「YYYY年」（月が不明でその年の末尾にまとめられたグループ）
 *
 * スクロール時は画面上部に固定表示される（position: sticky）。
 *
 * Requirements: 7.2
 */

import './TimelineYearMonthHeader.css'

/** 月が不明なグループを表す月キー */
const UNKNOWN_MONTH = '99'

export interface TimelineYearMonthHeaderProps {
  /** 年月キー（YYYY-MM形式）。月が不明の場合は 'YYYY-99' */
  yearMonth: string
}

/**
 * 年月キーを表示用ラベルに変換する。
 */
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')

  if (!month || month === UNKNOWN_MONTH) {
    // 月が不明: 年のみ表示（月は表記しない）
    return `${year}年`
  }

  // 先頭ゼロを除去して表示（例: '03' → 3月）
  return `${year}年${Number(month)}月`
}

export function TimelineYearMonthHeader({ yearMonth }: TimelineYearMonthHeaderProps) {
  const label = formatYearMonth(yearMonth)

  return (
    <h2 className="timeline-year-month-header">
      <span className="timeline-year-month-header__label">{label}</span>
    </h2>
  )
}

export default TimelineYearMonthHeader
