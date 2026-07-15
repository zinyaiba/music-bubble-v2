import type { Song } from '../types'

export type SongReleaseType = 'single' | 'album'

export interface SongReleaseDate {
  year?: number
  date?: string
}

export function getSongReleaseDate(
  song: Song,
  releaseType: SongReleaseType
): SongReleaseDate {
  const year =
    releaseType === 'single' ? song.singleReleaseYear : song.albumReleaseYear
  const date =
    releaseType === 'single' ? song.singleReleaseDate : song.albumReleaseDate

  if (year !== undefined || date) return { year, date }
  return { year: song.releaseYear, date: song.releaseDate }
}

function toSortKey(release: SongReleaseDate): string | null {
  if (!release.year) return null
  return `${release.year}-${release.date ?? '1231'}`
}

export function shouldShowEmbedsForRelease(
  song: Song,
  releaseType: SongReleaseType
): boolean {
  if (!song.singleName || !song.albumName) return true

  const singleKey = toSortKey(getSongReleaseDate(song, 'single'))
  const albumKey = toSortKey(getSongReleaseDate(song, 'album'))

  // 日付を比較できない場合や同日の場合は、初出とみなすシングル側だけに表示する
  if (!singleKey || !albumKey || singleKey === albumKey) {
    return releaseType === 'single'
  }

  const earliestType = singleKey < albumKey ? 'single' : 'album'
  return releaseType === earliestType
}
