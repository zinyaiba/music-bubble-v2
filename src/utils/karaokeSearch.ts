import type { KaraokeSong, KaraokeSortType } from '../types'
import { DEFAULT_KARAOKE_SORT, sortKaraokeSongs } from './karaokeSorting'

export interface KaraokeSongListProjection {
  query: string
  songs: KaraokeSong[]
  visibleCount: number
  totalCount: number
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase()
}

export function getKaraokeEpisodeOptions(songs: KaraokeSong[]): number[] {
  return [...new Set(songs.flatMap((song) => song.streamingEpisodes))].sort((a, b) => a - b)
}

export function getKaraokeReleaseYearOptions(songs: KaraokeSong[]): number[] {
  return [
    ...new Set(songs.flatMap((song) => (song.releaseYear === undefined ? [] : [song.releaseYear]))),
  ].sort((a, b) => a - b)
}

export function filterKaraokeSongs(
  songs: KaraokeSong[],
  query: string,
  episodeFilter: number | null = null,
  releaseYearFilter: number | null = null
): KaraokeSong[] {
  const normalizedQuery = normalizeSearchQuery(query)

  return songs.filter(({ title, originalArtist, streamingEpisodes, releaseYear, notes }) => {
    const matchesQuery =
      normalizedQuery === '' ||
      normalizeSearchQuery(title).includes(normalizedQuery) ||
      normalizeSearchQuery(originalArtist ?? '').includes(normalizedQuery) ||
      normalizeSearchQuery(notes ?? '').includes(normalizedQuery)
    const matchesEpisode = episodeFilter === null || streamingEpisodes.includes(episodeFilter)
    const matchesReleaseYear = releaseYearFilter === null || releaseYear === releaseYearFilter
    return matchesQuery && matchesEpisode && matchesReleaseYear
  })
}

export function projectKaraokeSongList(
  songs: KaraokeSong[],
  query: string,
  sortBy: KaraokeSortType = DEFAULT_KARAOKE_SORT,
  episodeFilter: number | null = null,
  releaseYearFilter: number | null = null
): KaraokeSongListProjection {
  const visibleSongs = sortKaraokeSongs(
    filterKaraokeSongs(songs, query, episodeFilter, releaseYearFilter),
    sortBy
  )
  return { query, songs: visibleSongs, visibleCount: visibleSongs.length, totalCount: songs.length }
}

export function clearKaraokeSongSearch(songs: KaraokeSong[]): KaraokeSongListProjection {
  return projectKaraokeSongList(songs, '')
}
