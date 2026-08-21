import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import type {
  CreateKaraokeSongInput,
  KaraokeRepositoryError,
  KaraokeSong,
  KaraokeSongRepository,
} from '../types/karaoke'

const COLLECTION_NAME = 'karaokeSongs'
const EPOCH_ISO = new Date(0).toISOString()

interface KaraokeSongDocument {
  title?: unknown
  originalArtist?: unknown
  releaseYear?: unknown
  streamingEpisodes?: unknown
  notes?: unknown
  createdAt?: unknown
  updatedAt?: unknown
}

type DocumentSnapshotLike = {
  id: string
  data: () => KaraokeSongDocument
}

const repositoryErrorTypes = new Set<KaraokeRepositoryError['type']>([
  'firebase-unconfigured',
  'offline',
  'permission-denied',
  'not-found',
  'network',
])

function isRepositoryError(error: unknown): error is KaraokeRepositoryError {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as Partial<KaraokeRepositoryError>
  return (
    typeof candidate.type === 'string' &&
    repositoryErrorTypes.has(candidate.type as KaraokeRepositoryError['type']) &&
    typeof candidate.message === 'string' &&
    typeof candidate.retryable === 'boolean'
  )
}
function getFirebaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  const code = (error as { code?: unknown }).code
  if (typeof code !== 'string') return undefined
  return code.split('/').at(-1)
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function classifiedError(
  type: KaraokeRepositoryError['type'],
  message: string,
  cause?: unknown
): KaraokeRepositoryError {
  const retryable = type === 'offline' || type === 'network'
  return cause === undefined
    ? ({ type, message, retryable } as KaraokeRepositoryError)
    : ({ type, message, retryable, cause } as KaraokeRepositoryError)
}

export function classifyKaraokeRepositoryError(
  error: unknown,
  networkMessage = 'カラオケ歌唱データの通信に失敗しました'
): KaraokeRepositoryError {
  if (isRepositoryError(error)) return error

  const code = getFirebaseErrorCode(error)
  if (code === 'permission-denied' || code === 'unauthenticated') {
    return classifiedError(
      'permission-denied',
      'カラオケ歌唱データへのアクセス権限がありません',
      error
    )
  }
  if (code === 'not-found') {
    return classifiedError('not-found', 'カラオケ歌唱曲が見つかりません', error)
  }
  if (isOffline()) {
    return classifiedError(
      'offline',
      'インターネット接続がありません。接続を確認して再試行してください',
      error
    )
  }
  return classifiedError('network', networkMessage, error)
}

function timestampToIso(value: unknown): string {
  let date: Date | undefined

  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else if (typeof value === 'object' && value !== null) {
    if ('toDate' in value && typeof value.toDate === 'function') {
      date = value.toDate()
    } else if ('seconds' in value && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000)
    }
  }

  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : EPOCH_ISO
}

function isValidStoredEpisode(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= Number.MAX_SAFE_INTEGER
}

function parseStoredEpisode(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return isValidStoredEpisode(value) ? value : undefined
  }
  if (typeof value !== 'string') return undefined

  const normalized = value
    .trim()
    .replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xfee0))
    .replace(/．/g, '.')
  const match = normalized.match(/^(?:第\s*)?(\d+(?:\.\d+)?)(?:\s*回)?$/)
  if (!match) return undefined
  const episode = Number(match[1])
  return isValidStoredEpisode(episode) ? episode : undefined
}

function toKaraokeSong(snapshot: DocumentSnapshotLike): KaraokeSong {
  const data = snapshot.data()
  const streamingEpisodes = Array.isArray(data.streamingEpisodes)
    ? data.streamingEpisodes
        .map(parseStoredEpisode)
        .filter((episode): episode is number => episode !== undefined)
    : []
  const song: KaraokeSong = {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    streamingEpisodes,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  }

  if (typeof data.originalArtist === 'string' && data.originalArtist.trim() !== '') {
    song.originalArtist = data.originalArtist
  }
  if (
    typeof data.releaseYear === 'number' &&
    Number.isInteger(data.releaseYear) &&
    data.releaseYear >= 1000 &&
    data.releaseYear <= 9999
  ) {
    song.releaseYear = data.releaseYear
  }
  if (typeof data.notes === 'string' && data.notes.trim() !== '') song.notes = data.notes

  return song
}
export class KaraokeSongService implements KaraokeSongRepository {
  private readonly database: Firestore | null

  constructor(database: Firestore | null = db) {
    this.database = database
  }

  private requireDatabase(): Firestore {
    if (!this.database) {
      throw classifiedError(
        'firebase-unconfigured',
        'Firebase が設定されていないため、カラオケ歌唱データを利用できません'
      )
    }
    return this.database
  }

  async getAll(): Promise<KaraokeSong[]> {
    try {
      const snapshot = await getDocs(collection(this.requireDatabase(), COLLECTION_NAME))
      return snapshot.docs.map((document) =>
        toKaraokeSong({
          id: document.id,
          data: () => document.data() as KaraokeSongDocument,
        })
      )
    } catch (error) {
      throw classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の取得に失敗しました')
    }
  }

  async getById(id: string): Promise<KaraokeSong | null> {
    try {
      const snapshot = await getDoc(doc(this.requireDatabase(), COLLECTION_NAME, id))
      if (!snapshot.exists()) return null
      return toKaraokeSong({
        id: snapshot.id,
        data: () => snapshot.data() as KaraokeSongDocument,
      })
    } catch (error) {
      throw classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の取得に失敗しました')
    }
  }

  async create(input: CreateKaraokeSongInput): Promise<string> {
    try {
      const documentData: Record<string, unknown> = {
        title: input.title,
        streamingEpisodes: [...input.streamingEpisodes],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      const originalArtist = input.originalArtist?.trim()
      const notes = input.notes?.trim()

      if (originalArtist) documentData.originalArtist = originalArtist
      if (input.releaseYear !== undefined) documentData.releaseYear = input.releaseYear
      if (notes) documentData.notes = notes

      const reference = await addDoc(
        collection(this.requireDatabase(), COLLECTION_NAME),
        documentData
      )
      return reference.id
    } catch (error) {
      throw classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の保存に失敗しました')
    }
  }

  async update(id: string, input: CreateKaraokeSongInput): Promise<void> {
    try {
      const originalArtist = input.originalArtist?.trim()
      const notes = input.notes?.trim()
      await updateDoc(doc(this.requireDatabase(), COLLECTION_NAME, id), {
        title: input.title,
        streamingEpisodes: [...input.streamingEpisodes],
        originalArtist: originalArtist || deleteField(),
        releaseYear: input.releaseYear ?? deleteField(),
        notes: notes || deleteField(),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      throw classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の更新に失敗しました')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.requireDatabase(), COLLECTION_NAME, id))
    } catch (error) {
      throw classifyKaraokeRepositoryError(error, 'カラオケ歌唱曲の削除に失敗しました')
    }
  }
}

export const karaokeSongService = new KaraokeSongService()
