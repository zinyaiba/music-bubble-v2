const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** ISO 形式などの日時をタイムライン用の日付 + 曜日へ整形する。 */
export function formatTimelineDate(dateTime: string): string {
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return dateTime

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`
}

/** 開始日と終了日をタイムライン用の期間へ整形する。 */
export function formatTimelineDateRange(firstDate: string, lastDate: string): string {
  const first = formatTimelineDate(firstDate)
  const last = formatTimelineDate(lastDate)
  return first === last ? first : `${first} 〜 ${last}`
}

/** DB の発売年と MMDD 形式の発売日を曜日付きで整形する。 */
export function formatReleaseDate(releaseYear?: number, releaseDate?: string): string | null {
  if (releaseDate && /^\d{4}$/.test(releaseDate)) {
    const month = Number.parseInt(releaseDate.slice(0, 2), 10)
    const day = Number.parseInt(releaseDate.slice(2, 4), 10)
    const dateText = releaseYear ? `${releaseYear}年${month}月${day}日` : `${month}月${day}日`

    if (!releaseYear) return dateText

    const date = new Date(releaseYear, month - 1, day)
    const isValidDate =
      date.getFullYear() === releaseYear && date.getMonth() === month - 1 && date.getDate() === day
    return isValidDate ? `${dateText}（${WEEKDAYS[date.getDay()]}）` : dateText
  }

  return releaseYear ? `${releaseYear}年` : null
}
