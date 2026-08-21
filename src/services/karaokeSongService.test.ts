import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase/firestore'

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn((_database: unknown, path: string) => ({ path })),
  deleteDoc: vi.fn(),
  deleteField: vi.fn(() => 'DELETE_FIELD'),
  doc: vi.fn((_database: unknown, path: string, id: string) => ({ path, id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  updateDoc: vi.fn(),
}))

vi.mock('firebase/firestore', () => firestoreMocks)
vi.mock('../config/firebase', () => ({ db: { name: 'configured-db' } }))

import { KaraokeSongService, classifyKaraokeRepositoryError } from './karaokeSongService'

const database = { name: 'test-db' } as unknown as Firestore

describe('KaraokeSongService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    firestoreMocks.collection.mockImplementation((_database: unknown, path: string) => ({ path }))
    firestoreMocks.doc.mockImplementation((_database: unknown, path: string, id: string) => ({
      path,
      id,
    }))
    firestoreMocks.serverTimestamp.mockReturnValue('SERVER_TIMESTAMP')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('gets every karaoke song from only karaokeSongs and converts timestamps', async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        {
          id: 'karaoke-1',
          data: () => ({
            title: 'Song A',
            originalArtist: 'Artist A',
            releaseYear: 2024,
            streamingEpisodes: ['第1回', 2],
            notes: 'memo',
            createdAt: { toDate: () => new Date('2024-01-02T03:04:05.000Z') },
            updatedAt: { seconds: 1_704_164_646 },
          }),
        },
      ],
    })

    await expect(new KaraokeSongService(database).getAll()).resolves.toEqual([
      {
        id: 'karaoke-1',
        title: 'Song A',
        originalArtist: 'Artist A',
        releaseYear: 2024,
        streamingEpisodes: [1, 2],
        notes: 'memo',
        createdAt: '2024-01-02T03:04:05.000Z',
        updatedAt: '2024-01-02T03:04:06.000Z',
      },
    ])
    expect(firestoreMocks.collection).toHaveBeenCalledWith(database, 'karaokeSongs')
  })

  it('gets one document directly and returns null when it does not exist', async () => {
    firestoreMocks.getDoc.mockResolvedValue({ exists: () => false })

    await expect(new KaraokeSongService(database).getById('missing')).resolves.toBeNull()
    expect(firestoreMocks.doc).toHaveBeenCalledWith(database, 'karaokeSongs', 'missing')
  })
  it('creates a document with empty episodes, omits empty optionals, and uses server timestamps', async () => {
    firestoreMocks.addDoc.mockResolvedValue({ id: 'created-id' })

    await expect(
      new KaraokeSongService(database).create({
        title: 'Song B',
        originalArtist: '   ',
        streamingEpisodes: [],
        notes: '',
      })
    ).resolves.toBe('created-id')

    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      { path: 'karaokeSongs' },
      {
        title: 'Song B',
        streamingEpisodes: [],
        createdAt: 'SERVER_TIMESTAMP',
        updatedAt: 'SERVER_TIMESTAMP',
      }
    )
    expect(firestoreMocks.serverTimestamp).toHaveBeenCalledTimes(2)
  })

  it('deletes only the requested karaokeSongs document', async () => {
    firestoreMocks.deleteDoc.mockResolvedValue(undefined)

    await expect(new KaraokeSongService(database).delete('karaoke-2')).resolves.toBeUndefined()
    expect(firestoreMocks.doc).toHaveBeenCalledWith(database, 'karaokeSongs', 'karaoke-2')
    expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith({
      path: 'karaokeSongs',
      id: 'karaoke-2',
    })
  })

  it('classifies Firebase-unconfigured separately', async () => {
    await expect(new KaraokeSongService(null).getAll()).rejects.toMatchObject({
      type: 'firebase-unconfigured',
      retryable: false,
    })
  })

  it.each([
    ['firestore/permission-denied', 'permission-denied', false],
    ['firestore/unauthenticated', 'permission-denied', false],
    ['firestore/not-found', 'not-found', false],
    ['firestore/unavailable', 'network', true],
  ] as const)('classifies %s as %s', (code, type, retryable) => {
    expect(classifyKaraokeRepositoryError({ code })).toMatchObject({ type, retryable })
  })

  it('classifies failures as offline when the browser is offline', () => {
    vi.stubGlobal('navigator', { onLine: false })

    expect(classifyKaraokeRepositoryError(new Error('request failed'))).toMatchObject({
      type: 'offline',
      retryable: true,
    })
  })
})
