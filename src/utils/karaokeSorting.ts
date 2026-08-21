import type { KaraokeSong, KaraokeSortType } from '../types'

export const DEFAULT_KARAOKE_SORT: KaraokeSortType = 'streaming-newest'

const sortTypes = new Set<KaraokeSortType>([
  'streaming-oldest',
  'streaming-newest',
  'release-oldest',
  'release-newest',
  'updated',
])

export function isKaraokeSortType(value: unknown): value is KaraokeSortType {
  return typeof value === 'string' && sortTypes.has(value as KaraokeSortType)
}

function compareMissingLast<T>(
  a: T | undefined,
  b: T | undefined,
  compare: (x: T, y: T) => number
) {
  if (a === undefined) return b === undefined ? 0 : 1
  if (b === undefined) return -1
  return compare(a, b)
}

function episodeKey(song: KaraokeSong, newest: boolean): number | undefined {
  if (song.streamingEpisodes.length === 0) return undefined
  return newest ? Math.max(...song.streamingEpisodes) : Math.min(...song.streamingEpisodes)
}

export function sortKaraokeSongs(songs: KaraokeSong[], sortBy: KaraokeSortType): KaraokeSong[] {
  return songs
    .map((song, index) => ({ song, index }))
    .sort((a, b) => {
      let result = 0
      if (sortBy === 'streaming-oldest' || sortBy === 'streaming-newest') {
        const newest = sortBy === 'streaming-newest'
        result = compareMissingLast(
          episodeKey(a.song, newest),
          episodeKey(b.song, newest),
          (x, y) => (newest ? y - x : x - y)
        )
      } else if (sortBy === 'release-oldest' || sortBy === 'release-newest') {
        const newest = sortBy === 'release-newest'
        result = compareMissingLast(a.song.releaseYear, b.song.releaseYear, (x, y) =>
          newest ? y - x : x - y
        )
      } else {
        result = new Date(b.song.updatedAt).getTime() - new Date(a.song.updatedAt).getTime()
      }
      return result || a.index - b.index
    })
    .map(({ song }) => song)
}
