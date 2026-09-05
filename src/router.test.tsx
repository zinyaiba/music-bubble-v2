import { createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import type { BingoState, PreviewRouteState } from './types'
import { router as browserRouter } from './router'

const validBingoState: BingoState = {
  schemaVersion: 1,
  performanceName: 'Routing Test Live',
  gridSize: 2,
  songTitles: ['Song 1', 'Song 2', 'Song 3', 'Song 4'],
  designId: 'rose-bubble',
}

const previewRouteState: PreviewRouteState = {
  kind: 'preview-bingo',
  bingoState: validBingoState,
}

const testRouters: ReturnType<typeof createMemoryRouter>[] = []

function createTestRouter(
  options: Parameters<typeof createMemoryRouter>[1],
): ReturnType<typeof createMemoryRouter> {
  const router = createMemoryRouter(browserRouter.routes, options)
  testRouters.push(router)
  return router
}

function getMatchedLeafPath(router: ReturnType<typeof createMemoryRouter>): string | undefined {
  return router.state.matches.at(-1)?.route.path
}

afterEach(() => {
  while (testRouters.length > 0) {
    testRouters.pop()?.dispose()
  }
})

describe('setlist bingo routes', () => {
  it('任意のbasename配下の直接Preview URLをwildcardではなくPreview routeへ解決する', () => {
    const router = createTestRouter({
      basename: '/deployment-root',
      initialEntries: ['/deployment-root/setlist-bingo/preview?b=encoded-state'],
    })

    expect(router.state.location.pathname).toBe(
      '/deployment-root/setlist-bingo/preview',
    )
    expect(router.state.location.search).toBe('?b=encoded-state')
    expect(getMatchedLeafPath(router)).toBe('setlist-bingo/preview')
  })

  it('作成画面からPreviewへBingo Stateをメモリ遷移状態として渡す', async () => {
    const router = createTestRouter({
      initialEntries: ['/setlist-bingo/new'],
    })

    await router.navigate('/setlist-bingo/preview', { state: previewRouteState })

    expect(router.state.location.pathname).toBe('/setlist-bingo/preview')
    expect(router.state.location.state).toEqual(previewRouteState)
    expect(getMatchedLeafPath(router)).toBe('setlist-bingo/preview')
  })

  it('不正な共有queryを含む直接URLもPreview routeへ渡してinvalid viewの判定を可能にする', () => {
    const router = createTestRouter({
      basename: '/another-base',
      initialEntries: ['/another-base/setlist-bingo/preview?b=not-valid%21'],
    })

    expect(router.state.location.search).toBe('?b=not-valid%21')
    expect(getMatchedLeafPath(router)).toBe('setlist-bingo/preview')
  })

  it('戻る・進むで作成、Preview、次画面の履歴とPreviewのメモリ状態を復元する', async () => {
    const router = createTestRouter({
      initialEntries: ['/setlist-bingo/new'],
    })

    await router.navigate('/setlist-bingo/preview', { state: previewRouteState })
    await router.navigate('/info')

    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/setlist-bingo/preview')
    expect(router.state.location.state).toEqual(previewRouteState)
    expect(getMatchedLeafPath(router)).toBe('setlist-bingo/preview')

    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/setlist-bingo/new')
    expect(getMatchedLeafPath(router)).toBe('setlist-bingo/new')

    await router.navigate(1)
    expect(router.state.location.pathname).toBe('/setlist-bingo/preview')
    expect(router.state.location.state).toEqual(previewRouteState)

    await router.navigate(1)
    expect(router.state.location.pathname).toBe('/info')
    expect(getMatchedLeafPath(router)).toBe('info')
  })
})
