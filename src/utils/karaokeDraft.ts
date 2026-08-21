import type {
  CreateKaraokeSongInput,
  KaraokeSongDraft,
  KaraokeValidationErrors,
} from '../types/karaoke'

const TITLE_REQUIRED_ERROR = '曲名を入力してください'
const RELEASE_YEAR_ERROR = '発売年は1000から9999までの4桁の整数で入力してください'
const RELEASE_YEAR_PATTERN = /^\d{4}$/
const STREAMING_EPISODE_PATTERN = /^\d+(?:\.\d+)?$/
const STREAMING_EPISODE_ERROR = '配信回は1以上の数値で入力してください'

export type KaraokeDraftResult =
  | {
      success: true
      input: CreateKaraokeSongInput
    }
  | {
      success: false
      errors: KaraokeValidationErrors
      input?: never
    }

export type StreamingEpisodeAction =
  | { type: 'add'; value?: string }
  | { type: 'remove'; index: number }

function parseReleaseYear(value: string): number | undefined {
  const normalized = value.trim()
  if (normalized === '' || !RELEASE_YEAR_PATTERN.test(normalized)) return undefined

  const year = Number(normalized)
  return year >= 1000 && year <= 9999 ? year : undefined
}

export function validateKaraokeDraft(draft: KaraokeSongDraft): KaraokeValidationErrors {
  const errors: KaraokeValidationErrors = {}

  if (draft.title.trim() === '') errors.title = TITLE_REQUIRED_ERROR

  const releaseYear = draft.releaseYear.trim()
  if (releaseYear !== '' && parseReleaseYear(releaseYear) === undefined) {
    errors.releaseYear = RELEASE_YEAR_ERROR
  }

  const episodeErrors: Record<number, string> = {}
  draft.streamingEpisodes.forEach((episode, index) => {
    const normalized = episode.trim()
    if (normalized === '') return
    const value = Number(normalized)
    if (
      !STREAMING_EPISODE_PATTERN.test(normalized) ||
      !Number.isFinite(value) ||
      value < 1 ||
      value > Number.MAX_SAFE_INTEGER
    ) {
      episodeErrors[index] = STREAMING_EPISODE_ERROR
    }
  })
  if (Object.keys(episodeErrors).length > 0) errors.streamingEpisodes = episodeErrors

  return errors
}
export function normalizeStreamingEpisodes(episodes: readonly string[]): number[] {
  return episodes
    .map((episode) => episode.trim())
    .filter((episode) => episode !== '' && STREAMING_EPISODE_PATTERN.test(episode))
    .map(Number)
    .filter(
      (episode) =>
        Number.isFinite(episode) && episode >= 1 && episode <= Number.MAX_SAFE_INTEGER
    )
}

export function normalizeKaraokeDraft(draft: KaraokeSongDraft): KaraokeDraftResult {
  const errors = validateKaraokeDraft(draft)
  if (Object.keys(errors).length > 0) return { success: false, errors }

  const input: CreateKaraokeSongInput = {
    title: draft.title.trim(),
    streamingEpisodes: normalizeStreamingEpisodes(draft.streamingEpisodes),
  }
  const originalArtist = draft.originalArtist.trim()
  const releaseYear = parseReleaseYear(draft.releaseYear)
  const notes = draft.notes.trim()

  if (originalArtist !== '') input.originalArtist = originalArtist
  if (releaseYear !== undefined) input.releaseYear = releaseYear
  if (notes !== '') input.notes = notes

  return { success: true, input }
}

export function streamingEpisodesReducer(
  episodes: string[],
  action: StreamingEpisodeAction
): string[] {
  switch (action.type) {
    case 'add':
      return [...episodes, action.value ?? '']
    case 'remove':
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= episodes.length) {
        return episodes
      }
      return episodes.filter((_, index) => index !== action.index)
  }
}
