import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KaraokeRepositoryError, KaraokeSong } from '../types/karaoke'

const reactHarness = vi.hoisted(() => ({
  stateIndex: 0,
  refIndex: 0,
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  effects: [] as Array<() => void | (() => void)>,
}))

const serviceMocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  classify: vi.fn(),
}))

const errorServiceMocks = vi.hoisted(() => ({
  getOnlineStatus: vi.fn(() => true),
  withRetry: vi.fn(async (operation: () => Promise<unknown>) => operation()),
  logError: vi.fn(),
  onlineListener: undefined as ((online: boolean) => void) | undefined,
  unsubscribe: vi.fn(),
}))

vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = reactHarness.stateIndex++
    reactHarness.states[index] =
      typeof initial === 'function' ? (initial as () => unknown)() : initial
    return [
      reactHarness.states[index],
      (value: unknown) => {
        reactHarness.states[index] =
          typeof value === 'function'
            ? (value as (previous: unknown) => unknown)(reactHarness.states[index])
            : value
      },
    ]
  },
  useRef: (initial: unknown) => {
    const index = reactHarness.refIndex++
    const ref = { current: initial }
    reactHarness.refs[index] = ref
    return ref
  },
  useCallback: <T,>(callback: T) => callback,
  useEffect: (effect: () => void | (() => void)) => reactHarness.effects.push(effect),
}))

vi.mock('../services/errorService', () => ({
  errorService: {
    getOnlineStatus: errorServiceMocks.getOnlineStatus,
    withRetry: errorServiceMocks.withRetry,
    logError: errorServiceMocks.logError,
    addOnlineListener: vi.fn((listener: (online: boolean) => void) => {
      errorServiceMocks.onlineListener = listener
      return errorServiceMocks.unsubscribe
    }),
  },
}))

vi.mock('../services/karaokeSongService', () => ({
  karaokeSongService: { getAll: serviceMocks.getAll },
  classifyKaraokeRepositoryError: serviceMocks.classify,
}))

import { useKaraokeSongs } from './useKaraokeSongs'

const song: KaraokeSong = {
  id: 'karaoke-1',
  title: 'Song A',
  streamingEpisodes: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

function renderHook() {
  reactHarness.stateIndex = 0
  reactHarness.refIndex = 0
  // React is mocked above so this helper can exercise the hook lifecycle deterministically.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const result = useKaraokeSongs()
  const cleanup = reactHarness.effects[0]?.()
  return { result, cleanup }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('useKaraokeSongs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reactHarness.stateIndex = 0
    reactHarness.refIndex = 0
    reactHarness.states = []
    reactHarness.refs = []
    reactHarness.effects = []
    errorServiceMocks.onlineListener = undefined
    errorServiceMocks.getOnlineStatus.mockReturnValue(true)
    errorServiceMocks.withRetry.mockImplementation(
      async (operation: () => Promise<unknown>) => operation(),
    )
  })

  it('専用サービスから全件を取得し、共通の最大2回リトライ方針を使う', async () => {
    serviceMocks.getAll.mockResolvedValue([song])

    renderHook()
    await flushPromises()

    expect(serviceMocks.getAll).toHaveBeenCalledTimes(1)
    expect(errorServiceMocks.withRetry).toHaveBeenCalledWith(expect.any(Function), {
      maxRetries: 2,
      onRetry: expect.any(Function),
    })
    expect(reactHarness.states[0]).toEqual([song])
    expect(reactHarness.states[1]).toBe(false)
    expect(reactHarness.states[2]).toBeNull()
  })

  it('分類済みエラーとオフライン状態を保持し、retryで同じ取得を再実行する', async () => {
    const classifiedError: KaraokeRepositoryError = {
      type: 'offline',
      message: '接続を確認してください',
      retryable: true,
    }
    serviceMocks.getAll.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([song])
    serviceMocks.classify.mockReturnValue(classifiedError)

    const { result } = renderHook()
    await flushPromises()

    expect(reactHarness.states[2]).toBe(classifiedError)
    expect(reactHarness.states[3]).toBe(true)

    result.retry()
    await flushPromises()

    expect(serviceMocks.getAll).toHaveBeenCalledTimes(2)
    expect(reactHarness.states[0]).toEqual([song])
    expect(reactHarness.states[1]).toBe(false)
    expect(reactHarness.states[2]).toBeNull()
  })

  it('アンマウント後は進行中の取得結果で状態を更新しない', async () => {
    let resolveRequest: ((songs: KaraokeSong[]) => void) | undefined
    serviceMocks.getAll.mockReturnValue(
      new Promise<KaraokeSong[]>((resolve) => {
        resolveRequest = resolve
      }),
    )

    const { cleanup } = renderHook()
    const stateAtUnmount = [...reactHarness.states]
    expect(typeof cleanup).toBe('function')
    cleanup?.()

    resolveRequest?.([song])
    await flushPromises()

    expect(reactHarness.states).toEqual(stateAtUnmount)
    expect(errorServiceMocks.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
