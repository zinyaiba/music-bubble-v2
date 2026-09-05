import { describe, expect, it } from 'vitest'

import type { Song } from '../types'
import { getSongSuggestions, resolveRegisteredSongId } from './songSuggestions'

function song(id: string, title: string): Song {
  return {
    id,
    title,
    lyricists: [],
    composers: [],
    arrangers: [],
  }
}

const songs = [
  song('1', 'Middle Match'),
  song('2', 'Match Long Title'),
  song('3', 'MATCH'),
  song('4', 'Another Match'),
  song('5', 'No result'),
]

describe('getSongSuggestions', () => {
  it('returns no suggestions for empty or whitespace-only queries', () => {
    expect(getSongSuggestions(songs, '')).toEqual([])
    expect(getSongSuggestions(songs, '　 ')).toEqual([])
  })

  it('matches case-insensitively and orders shorter prefix matches first', () => {
    expect(getSongSuggestions(songs, '  mAtCh ')).toEqual([
      songs[2],
      songs[1],
      songs[0],
      songs[3],
    ])

    const shiningSongs = [
      song('burst', 'Shining☆Days Burst'),
      song('base', 'Shining☆Days'),
    ]
    expect(getSongSuggestions(shiningSongs, 'Sh')).toEqual([
      shiningSongs[1],
      shiningSongs[0],
    ])
  })

  it('preserves registration order for equal-length prefixes and partial matches', () => {
    const ordered = [
      song('long-prefix', 'Song title with a long suffix'),
      song('short-prefix', 'Song'),
      song('partial-1', 'A song'),
      song('partial-2', 'My song'),
      song('same-1', 'Song A'),
      song('same-2', 'Song B'),
    ]

    expect(getSongSuggestions(ordered, 'song')).toEqual([
      ordered[1],
      ordered[4],
      ordered[5],
      ordered[0],
      ordered[2],
      ordered[3],
    ])
  })

  it('limits results to ten by default and honors a smaller explicit limit', () => {
    const manySongs = Array.from({ length: 12 }, (_, index) =>
      song(String(index), `Match ${index}`)
    )

    expect(getSongSuggestions(manySongs, 'match')).toEqual(manySongs.slice(0, 10))
    expect(getSongSuggestions(manySongs, 'match', 3)).toEqual(manySongs.slice(0, 3))
  })
})

describe('resolveRegisteredSongId', () => {
  it('resolves a trimmed case-insensitive exact title', () => {
    expect(resolveRegisteredSongId(songs, '  match  ')).toBe('3')
    expect(resolveRegisteredSongId(songs, 'middle')).toBeUndefined()
    expect(resolveRegisteredSongId(songs, '　')).toBeUndefined()
  })
})
