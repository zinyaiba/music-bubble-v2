import type { KaraokeDisplayMode, KaraokeListState, KaraokeSortType } from '../types'
import { DEFAULT_KARAOKE_SORT, isKaraokeSortType } from './karaokeSorting'

export const KARAOKE_LIST_STATE_STORAGE_KEY = 'karaokeSongListState'

const defaultListState = (): KaraokeListState => ({
  query: '',
  sortBy: DEFAULT_KARAOKE_SORT,
  displayMode: 'all',
  episodeFilter: null,
  releaseYearFilter: null,
  scrollTop: 0,
})

type ListStateStorage = Pick<Storage, 'getItem' | 'setItem'>

export function isKaraokeDisplayMode(value: unknown): value is KaraokeDisplayMode {
  return value === 'all' || value === 'compact'
}

function isOptionalPositiveNumber(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= Number.MAX_SAFE_INTEGER)
  )
}

function isOptionalReleaseYear(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (Number.isInteger(value) && Number(value) >= 1000 && Number(value) <= 9999)
  )
}

function isStoredListState(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Record<string, unknown>
  return (
    typeof state.query === 'string' &&
    (state.sortBy === undefined || isKaraokeSortType(state.sortBy)) &&
    (state.displayMode === undefined || isKaraokeDisplayMode(state.displayMode)) &&
    isOptionalPositiveNumber(state.episodeFilter) &&
    isOptionalReleaseYear(state.releaseYearFilter) &&
    typeof state.scrollTop === 'number' &&
    Number.isFinite(state.scrollTop) &&
    state.scrollTop >= 0
  )
}

function normalizeListState(state: Record<string, unknown>): KaraokeListState {
  return {
    query: state.query as string,
    sortBy: isKaraokeSortType(state.sortBy) ? state.sortBy : DEFAULT_KARAOKE_SORT,
    displayMode: isKaraokeDisplayMode(state.displayMode) ? state.displayMode : 'all',
    episodeFilter: typeof state.episodeFilter === 'number' ? state.episodeFilter : null,
    releaseYearFilter: typeof state.releaseYearFilter === 'number' ? state.releaseYearFilter : null,
    scrollTop: state.scrollTop as number,
  }
}

export function serializeListState(state: KaraokeListState): string {
  return JSON.stringify(isStoredListState(state) ? normalizeListState(state) : defaultListState())
}

export function deserializeListState(raw: string | null): KaraokeListState {
  if (raw === null) return defaultListState()
  try {
    const parsed: unknown = JSON.parse(raw)
    return isStoredListState(parsed) ? normalizeListState(parsed) : defaultListState()
  } catch {
    return defaultListState()
  }
}

function getSessionStorage(): ListStateStorage | null {
  try {
    return globalThis.sessionStorage
  } catch {
    return null
  }
}

export function loadKaraokeListState(
  storage: ListStateStorage | null = getSessionStorage()
): KaraokeListState {
  if (!storage) return defaultListState()
  try {
    return deserializeListState(storage.getItem(KARAOKE_LIST_STATE_STORAGE_KEY))
  } catch {
    return defaultListState()
  }
}

export function saveKaraokeListState(
  state: KaraokeListState,
  storage: ListStateStorage | null = getSessionStorage()
): void {
  if (!storage) return
  try {
    storage.setItem(KARAOKE_LIST_STATE_STORAGE_KEY, serializeListState(state))
  } catch {
    /* Storage may be unavailable. */
  }
}

export function buildKaraokeListUrl(
  query: string,
  sortBy: KaraokeSortType = DEFAULT_KARAOKE_SORT,
  episodeFilter: number | null = null,
  releaseYearFilter: number | null = null,
  displayMode: KaraokeDisplayMode = 'all'
): string {
  const params = new URLSearchParams({ q: query })
  if (sortBy !== DEFAULT_KARAOKE_SORT) params.set('sort', sortBy)
  if (episodeFilter !== null) params.set('episode', String(episodeFilter))
  if (releaseYearFilter !== null) params.set('year', String(releaseYearFilter))
  if (displayMode !== 'all') params.set('display', displayMode)
  return `/karaoke-songs?${params.toString()}`
}
