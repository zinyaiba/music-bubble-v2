import type { KaraokeSong } from '../types'

export const KARAOKE_UNREGISTERED_VALUE = '未登録'

export interface KaraokeDetailViewModel {
  title: string
  originalArtist: string
  releaseYear: string
  streamingEpisodes: string[]
  notes: string
}

/** 有効な発売年を月日や接尾辞のない4桁文字列へ変換する。 */
export function formatKaraokeReleaseYear(releaseYear?: number): string {
  if (
    releaseYear === undefined ||
    !Number.isInteger(releaseYear) ||
    releaseYear < 1000 ||
    releaseYear > 9999
  ) {
    return KARAOKE_UNREGISTERED_VALUE
  }

  return String(releaseYear)
}

/** optional な文字列を詳細表示向けの値へ変換する。 */
export function formatKaraokeOptionalValue(value?: string): string {
  return value && value.trim().length > 0 ? value : KARAOKE_UNREGISTERED_VALUE
}

/** 配信回を保存順のまま表示文字列へ変換し、0件の場合は未登録表示を返す。 */
export function getKaraokeEpisodeDisplayItems(streamingEpisodes: readonly number[]): string[] {
  return streamingEpisodes.length > 0
    ? streamingEpisodes.map((episode) => `第${episode}回`)
    : [KARAOKE_UNREGISTERED_VALUE]
}

/** KaraokeSong を副作用のない詳細表示モデルへ変換する。 */
export function createKaraokeDetailViewModel(song: KaraokeSong): KaraokeDetailViewModel {
  return {
    title: song.title,
    originalArtist: formatKaraokeOptionalValue(song.originalArtist),
    releaseYear: formatKaraokeReleaseYear(song.releaseYear),
    streamingEpisodes: getKaraokeEpisodeDisplayItems(song.streamingEpisodes),
    notes: formatKaraokeOptionalValue(song.notes),
  }
}
