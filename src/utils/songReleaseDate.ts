import type { Song } from '../types'

export type SongReleaseType = 'single' | 'album'

export interface SongReleaseDate {
  year?: number
  date?: string
}

/** リリース種別にかかわらず、楽曲共通の発売日を返す */
export function getSongReleaseDate(song: Song): SongReleaseDate {
  return { year: song.releaseYear, date: song.releaseDate }
}

/** 両方に属する場合は、従来どおりシングル側を初出として扱う */
export function shouldShowEmbedsForRelease(song: Song, releaseType: SongReleaseType): boolean {
  if (!song.singleName || !song.albumName) return true
  return releaseType === 'single'
}
