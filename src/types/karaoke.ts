export interface KaraokeSong {
  id: string
  title: string
  originalArtist?: string
  releaseYear?: number
  streamingEpisodes: number[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface KaraokeSongDraft {
  title: string
  originalArtist: string
  releaseYear: string
  streamingEpisodes: string[]
  notes: string
}

export type CreateKaraokeSongInput = Omit<KaraokeSong, 'id' | 'createdAt' | 'updatedAt'>

export interface KaraokeValidationErrors {
  title?: string
  releaseYear?: string
  streamingEpisodes?: Record<number, string>
}

export type KaraokeSortType =
  | 'streaming-oldest'
  | 'streaming-newest'
  | 'release-oldest'
  | 'release-newest'
  | 'updated'

export interface KaraokeListState {
  query: string
  sortBy: KaraokeSortType
  episodeFilter: number | null
  releaseYearFilter: number | null
  scrollTop: number
}

export interface KaraokeSongRepository {
  getAll(): Promise<KaraokeSong[]>
  getById(id: string): Promise<KaraokeSong | null>
  create(input: CreateKaraokeSongInput): Promise<string>
  update(id: string, input: CreateKaraokeSongInput): Promise<void>
  delete(id: string): Promise<void>
}

interface KaraokeRepositoryErrorBase {
  message: string
  cause?: unknown
}

export type KaraokeRepositoryError =
  | (KaraokeRepositoryErrorBase & {
      type: 'firebase-unconfigured' | 'permission-denied' | 'not-found'
      retryable: false
    })
  | (KaraokeRepositoryErrorBase & {
      type: 'offline' | 'network'
      retryable: true
    })
