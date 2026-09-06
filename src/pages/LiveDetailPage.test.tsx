/// <reference types="node" />

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  type RouterProviderProps,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheService } from '../services/cacheService'
import { errorService } from '../services/errorService'
import { firebaseService } from '../services/firebaseService'
import { liveService } from '../services/liveService'
import type { Live, Song } from '../types'
import { LiveDetailPage } from './LiveDetailPage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

interface MountedPage {
  container: HTMLDivElement
  root: Root
  router: RouterProviderProps['router']
}

const song: Song = {
  id: 'song-1',
  title: 'Precious Memories',
  lyricists: [],
  composers: [],
  arrangers: [],
}

const validLive: Live = {
  id: 'live/id-1',
  liveType: 'solo',
  title: '  Anniversary Live  ',
  venueName: 'Tokyo Hall',
  dateTime: '2026-08-10T18:00:00.000Z',
  setlist: [
    {
      songId: song.id,
      songTitle: song.title,
      order: 1,
      isDailySong: true,
      note: 'Acoustic version',
    },
  ],
}

const mountedPages: MountedPage[] = []
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function RouteCapture() {
  const location = useLocation()
  return (
    <output data-testid="route-capture">
      {JSON.stringify({ pathname: location.pathname, state: location.state })}
    </output>
  )
}

function mountPage(live: Live = validLive): MountedPage {
  vi.mocked(liveService.getLiveById).mockResolvedValue(live)

  const router = createMemoryRouter(
    [
      { path: '/lives/:liveId', element: <LiveDetailPage /> },
      { path: '*', element: <RouteCapture /> },
    ],
    { initialEntries: [`/lives/${encodeURIComponent(live.id)}`] }
  )
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const mounted = { container, root, router }
  mountedPages.push(mounted)

  act(() => root.render(<RouterProvider router={router} />))
  return mounted
}

async function flushAsyncUpdates(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function click(element: HTMLElement): void {
  act(() => element.click())
}

function getButton(container: ParentNode, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button
}

function getRouteCapture(container: ParentNode): {
  pathname: string
  state: unknown
} | null {
  const output = container.querySelector<HTMLOutputElement>('[data-testid="route-capture"]')
  return output?.textContent ? JSON.parse(output.textContent) : null
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(errorService, 'getOnlineStatus').mockReturnValue(true)
  vi.spyOn(cacheService, 'getCachedSongs').mockReturnValue([song])
  vi.spyOn(cacheService, 'cacheSongs').mockImplementation(() => undefined)
  vi.spyOn(firebaseService, 'getAllSongs').mockResolvedValue([song])
  vi.spyOn(liveService, 'getLiveById').mockResolvedValue(validLive)
  vi.spyOn(liveService, 'deleteLive').mockResolvedValue(undefined)
})

afterEach(() => {
  while (mountedPages.length > 0) {
    const mounted = mountedPages.pop()
    if (!mounted) continue
    act(() => mounted.root.unmount())
    mounted.container.remove()
    mounted.router.dispose()
  }
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('LiveDetailPage existing behavior regression', () => {
  it('セットリスト閲覧、X投稿、編集遷移を維持する', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    const { container } = mountPage()
    await flushAsyncUpdates()

    expect(container.textContent).toContain(song.title)
    expect(container.textContent).toContain('Acoustic version')
    expect(container.querySelector('[aria-label="日替わり曲"]')).not.toBeNull()

    click(getButton(container, 'ライブの思い出を投稿しよう'))
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://twitter.com/intent/tweet?text='),
      '_blank',
      'noopener,noreferrer'
    )

    click(getButton(container, '編集'))
    expect(getRouteCapture(container)).toEqual({
      pathname: `/lives/${validLive.id}/edit`,
      state: null,
    })
  })

  it('削除確認と削除後のライブ一覧遷移を維持する', async () => {
    const { container } = mountPage()
    await flushAsyncUpdates()

    click(getButton(container, '削除'))
    expect(container.textContent).toContain('この操作は取り消せません。')
    click(getButton(container, '削除する'))
    await flushAsyncUpdates()

    expect(liveService.deleteLive).toHaveBeenCalledWith(validLive.id)
    expect(getRouteCapture(container)).toEqual({ pathname: '/lives', state: null })
  })

  it('ヘッダー、浮動戻るボタン、曲詳細遷移を維持する', async () => {
    const first = mountPage()
    await flushAsyncUpdates()

    click(first.container.querySelector<HTMLButtonElement>('.setlist-display__song-button')!)
    expect(getRouteCapture(first.container)).toEqual({ pathname: '/songs/song-1', state: null })

    const second = mountPage()
    await flushAsyncUpdates()
    expect(second.container.querySelector('.live-detail-page__floating-back')).not.toBeNull()
    click(second.container.querySelector<HTMLButtonElement>('.header-back-button')!)
    expect(getRouteCapture(second.container)).toEqual({ pathname: '/lives', state: null })
  })
})
