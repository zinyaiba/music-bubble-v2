const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

/** ローカル暦日をDSTの影響を受けない日番号へ変換する。 */
function toCalendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 未来の暦日までの残り日数を返す。当日・過去・不正値は null。 */
export function getRemainingDays(target: Date, now = new Date()): number | null {
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return null

  const days = Math.round(
    (toCalendarDayNumber(target) - toCalendarDayNumber(now)) / MILLISECONDS_PER_DAY
  )
  return days > 0 ? days : null
}

/** ISO 8601形式の日時から、表示地域の暦日までの残り日数を返す。 */
export function getRemainingDaysFromDateTime(dateTime: string, now = new Date()): number | null {
  return getRemainingDays(new Date(dateTime), now)
}

/** 楽曲の発売年とMMDD形式の発売日から残り日数を返す。 */
export function getSongReleaseRemainingDays(
  releaseYear?: number,
  releaseDate?: string,
  now = new Date()
): number | null {
  if (
    !Number.isInteger(releaseYear) ||
    releaseYear === undefined ||
    releaseYear < 1000 ||
    releaseYear > 9999 ||
    !releaseDate ||
    !/^\d{4}$/.test(releaseDate)
  ) {
    return null
  }

  const month = Number(releaseDate.slice(0, 2))
  const day = Number(releaseDate.slice(2, 4))
  const target = new Date(releaseYear, month - 1, day)

  // 0231など、Dateが自動補正する不正な日付を除外する。
  if (
    target.getFullYear() !== releaseYear ||
    target.getMonth() !== month - 1 ||
    target.getDate() !== day
  ) {
    return null
  }

  return getRemainingDays(target, now)
}

export type DateRangeStatus =
  | { kind: 'upcoming'; remainingDays: number }
  | { kind: 'ongoing'; remainingDays: number }

/** 開始日・終了日を含む期間について、開始前または開催中の状態を返す。 */
export function getDateRangeStatus(
  firstDateTime: string,
  lastDateTime: string,
  now = new Date()
): DateRangeStatus | null {
  const firstDate = new Date(firstDateTime)
  const lastDate = new Date(lastDateTime)
  if (
    Number.isNaN(firstDate.getTime()) ||
    Number.isNaN(lastDate.getTime()) ||
    Number.isNaN(now.getTime())
  ) {
    return null
  }

  const firstDay = toCalendarDayNumber(firstDate)
  const lastDay = toCalendarDayNumber(lastDate)
  const currentDay = toCalendarDayNumber(now)
  if (firstDay > lastDay || currentDay > lastDay) return null

  if (currentDay < firstDay) {
    return {
      kind: 'upcoming',
      remainingDays: Math.round((firstDay - currentDay) / MILLISECONDS_PER_DAY),
    }
  }

  return {
    kind: 'ongoing',
    remainingDays: Math.round((lastDay - currentDay) / MILLISECONDS_PER_DAY),
  }
}
