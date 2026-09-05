/// <reference types="node" />

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { navigate, getAllLives } = vi.hoisted(() => ({
  navigate: vi.fn(),
  getAllLives: vi.fn().mockResolvedValue([]),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams('q='), vi.fn()],
}))
vi.mock('../hooks', () => ({
  useDataFetch: () => ({ songs: [], isLoading: false, error: null, isOffline: false, retry: vi.fn() }),
}))
vi.mock('../services/analyticsService', () => ({
  AnalyticsEvents: { ページ閲覧_曲一覧: 'ページ閲覧_曲一覧', 曲_新規作成: '曲_新規作成' },
  trackEvent: vi.fn(),
  trackSearch: vi.fn(),
}))
vi.mock('../services/errorService', () => ({
  errorService: {
    getOnlineStatus: () => true,
    withRetry: (operation: () => unknown) => operation(),
    logError: vi.fn(),
  },
}))
vi.mock('../services/liveService', () => ({
  liveService: { getAllLives },
}))

import { SongListPage } from './SongListPage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  navigate.mockClear()
  getAllLives.mockClear()
  localStorage.clear()
  sessionStorage.clear()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  localStorage.clear()
  sessionStorage.clear()
})

describe('SongListPage karaoke entry FAB', () => {
  it('has an accessible microphone icon and navigates to the karaoke list', async () => {
    await act(async () => {
      root.render(<SongListPage />)
      await Promise.resolve()
    })

    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="カラオケ歌唱一覧を開く"]',
    )
    expect(button?.className).toBe('song-list-page__karaoke-button')
    expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')

    act(() => button?.click())
    expect(navigate).toHaveBeenCalledWith('/karaoke-songs')
  })
})
