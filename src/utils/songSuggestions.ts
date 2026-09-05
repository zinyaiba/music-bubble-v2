import type { Song } from '../types'

export const DEFAULT_SONG_SUGGESTION_LIMIT = 10

function normalizeSongTitle(value: string): string {
  return value.trim().toLocaleLowerCase()
}

/**
 * Finds registered songs using the shared setlist rules.
 * Prefix matches are grouped first and ordered by shorter title; ties and
 * non-prefix matches preserve registration order.
 */
export function getSongSuggestions(
  songs: readonly Song[],
  rawQuery: string,
  limit = DEFAULT_SONG_SUGGESTION_LIMIT
): Song[] {
  const normalizedQuery = normalizeSongTitle(rawQuery)
  if (normalizedQuery.length === 0 || limit <= 0) {
    return []
  }

  const prefixMatches: Song[] = []
  const otherMatches: Song[] = []

  for (const song of songs) {
    const normalizedTitle = song.title.toLocaleLowerCase()
    if (!normalizedTitle.includes(normalizedQuery)) {
      continue
    }

    if (normalizedTitle.startsWith(normalizedQuery)) {
      prefixMatches.push(song)
    } else {
      otherMatches.push(song)
    }
  }

  prefixMatches.sort(
    (left, right) => Array.from(left.title).length - Array.from(right.title).length,
  )

  return [...prefixMatches, ...otherMatches].slice(0, Math.trunc(limit))
}

/** Resolves a case-insensitive exact title to its registered song ID. */
export function resolveRegisteredSongId(
  songs: readonly Song[],
  rawTitle: string
): string | undefined {
  const normalizedTitle = normalizeSongTitle(rawTitle)
  if (normalizedTitle.length === 0) {
    return undefined
  }

  return songs.find((song) => song.title.toLocaleLowerCase() === normalizedTitle)?.id
}
