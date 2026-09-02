import type { Live, Song } from '../types'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export interface SongPerformanceStats {
  performanceCount: number
  firstLive: Live | null
  lastLive: Live | null
  daysSinceLastPerformance: number | null
  daysFromReleaseToFirstPerformance: number | null
}

interface MatchedLive {
  live: Live
  date: Date
  matchCount: number
}

/** ローカル暦日をDSTの影響を受けない日番号へ変換する。 */
function toCalendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 2つのローカル暦日の差を日数で返す。 */
function differenceInCalendarDays(later: Date, earlier: Date): number {
  return Math.round(
    (toCalendarDayNumber(later) - toCalendarDayNumber(earlier)) / MILLISECONDS_PER_DAY
  )
}

/** 年月日を検証し、ローカル日時として生成する。 */
function createValidLocalDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

/** 楽曲の発売日を取得する。旧YYYY-MM-DD形式にも対応する。 */
function getReleaseDate(song: Song): Date | null {
  if (
    Number.isInteger(song.releaseYear) &&
    song.releaseYear !== undefined &&
    song.releaseYear >= 1000 &&
    song.releaseYear <= 9999 &&
    song.releaseDate &&
    /^\d{4}$/.test(song.releaseDate)
  ) {
    return createValidLocalDate(
      song.releaseYear,
      Number(song.releaseDate.slice(0, 2)),
      Number(song.releaseDate.slice(2, 4))
    )
  }

  const legacyDate = song.releaseDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!legacyDate) return null

  return createValidLocalDate(Number(legacyDate[1]), Number(legacyDate[2]), Number(legacyDate[3]))
}

/**
 * セットリストの楽曲名を完全一致で照合し、過去から当日までの歌唱実績を算出する。
 */
export function calculateSongPerformanceStats(
  song: Song,
  lives: Live[],
  now = new Date()
): SongPerformanceStats {
  const emptyStats: SongPerformanceStats = {
    performanceCount: 0,
    firstLive: null,
    lastLive: null,
    daysSinceLastPerformance: null,
    daysFromReleaseToFirstPerformance: null,
  }

  if (Number.isNaN(now.getTime())) return emptyStats

  const currentDay = toCalendarDayNumber(now)
  const matchedLives: MatchedLive[] = []

  for (const live of lives) {
    const date = new Date(live.dateTime)
    if (Number.isNaN(date.getTime()) || toCalendarDayNumber(date) > currentDay) continue

    const matchCount = live.setlist.reduce(
      (count, item) => count + (item.songTitle === song.title ? 1 : 0),
      0
    )
    if (matchCount > 0) {
      matchedLives.push({ live, date, matchCount })
    }
  }

  if (matchedLives.length === 0) return emptyStats

  matchedLives.sort((a, b) => a.date.getTime() - b.date.getTime())
  const first = matchedLives[0]
  const last = matchedLives[matchedLives.length - 1]
  const releaseDate = getReleaseDate(song)

  return {
    performanceCount: matchedLives.reduce((total, match) => total + match.matchCount, 0),
    firstLive: first.live,
    lastLive: last.live,
    daysSinceLastPerformance: differenceInCalendarDays(now, last.date),
    daysFromReleaseToFirstPerformance: releaseDate
      ? differenceInCalendarDays(first.date, releaseDate)
      : null,
  }
}
