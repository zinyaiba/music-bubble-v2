/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  type InitialEntry,
} from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheService } from '../services/cacheService'
import { firebaseService } from '../services/firebaseService'
import { karaokeSongService } from '../services/karaokeSongService'
import { liveService } from '../services/liveService'
import type { BingoState, PreviewRouteState } from '../types'
import { buildCanonicalShareUrl as buildActualCanonicalShareUrl } from '../utils/setlistBingoShareUrl'
import {
  PreviewOperationAnnouncement,
  SetlistBingoPreviewPage,
  type PreviewOperationDependencies,
  type PreviewOperationState,
} from './SetlistBingoPreviewPage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

interface MountedPage {
  container: HTMLDivElement
  root: Root
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const mountedPages: MountedPage[] = []
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const validBingoState: BingoState = {
  schemaVersion: 1,
  performanceName: '<script>記念公演</script>',
  participantName: '<b>参加者</b> 🎤',
  gridSize: 2,
  songTitles: ['一曲目', '二曲目', '三曲目', '四曲目'],
  designId: 'violet-ribbon',
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return { promise, resolve: resolvePromise }
}

function RouteCapture() {
  const location = useLocation()
  return (
    <output data-testid="route-capture">
      {JSON.stringify({ pathname: location.pathname, state: location.state })}
    </output>
  )
}

function mount(element: ReactNode): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mountedPages.push({ container, root })
  act(() => root.render(element))
  return container
}

function createOperationDependencies(
  overrides: Partial<PreviewOperationDependencies> = {},
): PreviewOperationDependencies {
  const pngBlob = new Blob(['png bytes'], { type: 'image/png' })

  return {
    generateBingoPng: vi.fn(async () => pngBlob),
    downloadPng: vi.fn(),
    createBingoPngFilename: vi.fn(() => 'preview-card.png'),
    createXPostText: vi.fn((performanceName: string, shareUrl?: string) => {
      const shareUrlBlock = shareUrl ? `\n\n${shareUrl}` : ''
      return (
        `【${performanceName}】\n私のセトリ予想はこれです！` +
        `${shareUrlBlock}\n\n#マロバブ #マロンで予想して`
      )
    }),
    buildCanonicalShareUrl: vi.fn(() => ({
      ok: true as const,
      url: 'https://app.example/music-bubble-v2/setlist-bingo/preview?b=encoded',
      encodedState: 'encoded',
    })),
    buildXIntent: vi.fn(({ text, url }) => {
      const intent = new URL('https://twitter.com/intent/tweet')
      intent.searchParams.set('text', text)
      if (url !== undefined) intent.searchParams.set('url', url)
      return intent.toString()
    }),
    openExternalNoOpener: vi.fn(),
    getRootStyle: vi.fn(
      () => ({ getPropertyValue: () => '' }) as unknown as CSSStyleDeclaration,
    ),
    getOrigin: vi.fn(() => 'https://app.example'),
    getBaseUrl: vi.fn(() => '/music-bubble-v2/'),
    ...overrides,
  }
}

function mountPage(
  routeState?: PreviewRouteState,
  operationDependencies?: PreviewOperationDependencies,
): HTMLDivElement {
  const initialEntry: InitialEntry = {
    pathname: '/setlist-bingo/preview',
    state: routeState,
  }

  return mount(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/setlist-bingo/preview"
          element={
            <SetlistBingoPreviewPage
              operationDependencies={operationDependencies}
            />
          }
        />
        <Route path="/setlist-bingo/new" element={<RouteCapture />} />
        <Route path="*" element={<RouteCapture />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function flushAsyncUpdates(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

function getButton(container: ParentNode, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) throw new Error(`Button not found: ${text}`)
  return button
}

function clickButton(container: ParentNode, text: string): void {
  act(() => getButton(container, text).click())
}

function getRouteCapture(container: ParentNode): {
  pathname: string
  state: unknown
} | null {
  const output = container.querySelector<HTMLOutputElement>(
    '[data-testid="route-capture"]',
  )
  return output?.textContent ? JSON.parse(output.textContent) : null
}

beforeEach(() => {
  window.history.replaceState(null, '', '/setlist-bingo/preview')
})

afterEach(() => {
  while (mountedPages.length > 0) {
    const mounted = mountedPages.pop()
    if (!mounted) continue
    act(() => mounted.root.unmount())
    mounted.container.remove()
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SetlistBingoPreviewPage', () => {
  it('valid stateの時だけBingoCardと編集・保存・共有の4操作を表示する', () => {
    const container = mountPage({
      kind: 'preview-bingo',
      bingoState: validBingoState,
    })

    expect(container.querySelector('h1')?.textContent).toBe('セトリ予想ビンゴ')
    expect(container.querySelector('.bingo-card')).not.toBeNull()
    expect(container.querySelector('.bingo-card__heading')?.textContent).toBe(
      `${validBingoState.performanceName}名前：${validBingoState.participantName}`,
    )
    expect(container.querySelector('.bingo-card__participant-name')?.textContent).toBe(
      `名前：${validBingoState.participantName}`,
    )
    expect(
      [...container.querySelectorAll('.bingo-card__cell')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(validBingoState.songTitles)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).not.toContain('画像共有で利用できる')

    const actionLabels = [...container.querySelectorAll<HTMLButtonElement>(
      '.setlist-bingo-preview-page__actions button',
    )].map((button) => button.textContent?.trim())
    expect(actionLabels).toEqual([
      '編集に戻る',
      '画像で保存する',
      'Xでポストする（URLなし）※画像添付用',
      'Xでポストする（URLあり）',
    ])
  })

  it('編集に戻る時に正規化済みstate、曲順、design、Source Liveをlosslessに渡す', () => {
    const sourceLive = {
      id: 'live/2026',
      performanceName: '元のライブ公演名',
    }
    const container = mountPage({
      kind: 'preview-bingo',
      bingoState: validBingoState,
      sourceLive,
    })

    clickButton(container, '編集に戻る')

    expect(getRouteCapture(container)).toEqual({
      pathname: '/setlist-bingo/new',
      state: {
        kind: 'edit-bingo',
        bingoState: validBingoState,
        sourceLive,
      },
    })
  })

  it('invalid stateでは固定理由とstateなしNew Createだけを表示する', () => {
    const container = mountPage()

    expect(container.textContent).toContain('プレビューに必要なビンゴ情報が無効です。')
    expect(container.querySelector('.bingo-card')).toBeNull()
    expect(container.textContent).not.toContain('編集に戻る')
    expect(container.textContent).not.toContain('画像で保存する')
    expect(container.textContent).not.toContain('Xでポストする（URLなし）※画像添付用')
    expect(container.textContent).not.toContain('Xでポストする（URLあり）')

    clickButton(container, '新しく作る')
    expect(getRouteCapture(container)).toEqual({
      pathname: '/setlist-bingo/new',
      state: null,
    })
  })

  it('画像保存でPNGを生成して1回downloadしsuccessを通知する', async () => {
    const dependencies = createOperationDependencies()
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, '画像で保存する')
    await flushAsyncUpdates()

    expect(dependencies.generateBingoPng).toHaveBeenCalledOnce()
    expect(dependencies.getRootStyle).toHaveBeenCalledOnce()
    const rootStyle = vi.mocked(dependencies.getRootStyle).mock.results[0]?.value
    expect(dependencies.generateBingoPng).toHaveBeenCalledWith(
      validBingoState,
      rootStyle,
    )
    expect(dependencies.createBingoPngFilename).toHaveBeenCalledWith(
      validBingoState.performanceName,
    )
    expect(dependencies.downloadPng).toHaveBeenCalledOnce()
    expect(dependencies.downloadPng).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/png' }),
      'preview-card.png',
    )
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'ビンゴ画像を保存しました。',
    )
    expect(container.querySelector('.bingo-card')).not.toBeNull()
  })

  it('画像保存failureをcode別に通知し、同じstateからretryできる', async () => {
    const dependencies = createOperationDependencies()
    vi.mocked(dependencies.generateBingoPng).mockRejectedValueOnce({
      code: 'png_blob_failed',
    })
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, '画像で保存する')
    await flushAsyncUpdates()

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      '画像を生成できませんでした。もう一度お試しください。',
    )
    expect(container.querySelector('.bingo-card__title')?.textContent).toBe(
      validBingoState.performanceName,
    )

    clickButton(container, '画像保存を再試行')
    await flushAsyncUpdates()

    expect(dependencies.generateBingoPng).toHaveBeenCalledTimes(2)
    expect(dependencies.downloadPng).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'ビンゴ画像を保存しました。',
    )
  })

  it('URLなし投稿では画像・共有URLを生成せずX Intentを開く', async () => {
    const dependencies = createOperationDependencies()
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, 'Xでポストする（URLなし）※画像添付用')
    await flushAsyncUpdates()

    expect(dependencies.generateBingoPng).not.toHaveBeenCalled()
    expect(dependencies.downloadPng).not.toHaveBeenCalled()
    expect(dependencies.buildCanonicalShareUrl).not.toHaveBeenCalled()
    expect(dependencies.createXPostText).toHaveBeenCalledWith(
      validBingoState.performanceName,
    )
    expect(dependencies.buildXIntent).toHaveBeenCalledWith({
      text:
        `【${validBingoState.performanceName}】\n` +
        '私のセトリ予想はこれです！\n\n' +
        '#マロバブ #マロンで予想して',
    })
    expect(dependencies.openExternalNoOpener).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Xの投稿画面を開きました。',
    )
  })

  it('Canonical URLを本文のハッシュタグ前に1回だけ含めたX Intentを開く', async () => {
    const dependencies = createOperationDependencies()
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, 'Xでポストする（URLあり）')
    await flushAsyncUpdates()

    expect(dependencies.buildCanonicalShareUrl).toHaveBeenCalledOnce()
    expect(dependencies.buildCanonicalShareUrl).toHaveBeenCalledWith(
      validBingoState,
      'https://app.example',
      '/music-bubble-v2/',
    )
    const shareUrl =
      'https://app.example/music-bubble-v2/setlist-bingo/preview?b=encoded'
    expect(dependencies.createXPostText).toHaveBeenCalledWith(
      validBingoState.performanceName,
      shareUrl,
    )
    expect(dependencies.buildXIntent).toHaveBeenCalledWith({
      text:
        `【${validBingoState.performanceName}】\n` +
        '私のセトリ予想はこれです！\n\n' +
        `${shareUrl}\n\n` +
        '#マロバブ #マロンで予想して',
    })
    expect(dependencies.openExternalNoOpener).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Xの投稿画面を開きました。',
    )
  })

  it('URL超過ではIntentを開かず画像代替とretryを表示する', async () => {
    const dependencies = createOperationDependencies()
    vi.mocked(dependencies.buildCanonicalShareUrl).mockReturnValueOnce({
      ok: false,
      code: 'share_url_too_long',
    })
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, 'Xでポストする（URLあり）')
    await flushAsyncUpdates()

    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '共有URLが長すぎるためURLでは共有できません。',
    )
    expect(container.textContent).toContain(
      '画像で保存する方法を代替手段として利用できます。',
    )
    expect(container.querySelector('.bingo-card')).not.toBeNull()

    clickButton(container, 'URL共有を再試行')
    await flushAsyncUpdates()

    expect(dependencies.buildCanonicalShareUrl).toHaveBeenCalledTimes(2)
    expect(dependencies.openExternalNoOpener).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Xの投稿画面を開きました。',
    )
  })

  it('X Intent起動failureをcode別に通知してretryできる', async () => {
    const dependencies = createOperationDependencies()
    vi.mocked(dependencies.openExternalNoOpener)
      .mockImplementationOnce(() => {
        throw { code: 'x_intent_blocked' }
      })
      .mockImplementation(() => undefined)
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, 'Xでポストする（URLあり）')
    await flushAsyncUpdates()

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Xの投稿画面を開けませんでした。もう一度お試しください。',
    )

    clickButton(container, 'URL共有を再試行')
    await flushAsyncUpdates()

    expect(dependencies.openExternalNoOpener).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Xの投稿画面を開きました。',
    )
  })

  it('未解決PNG処理中はbuttonsをbusy disableし、多重clickで生成を1件に保つ', async () => {
    const deferred = createDeferred<Blob>()
    const generateBingoPng = vi.fn(() => deferred.promise)
    const dependencies = createOperationDependencies({ generateBingoPng })
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )
    const saveButton = getButton(container, '画像で保存する')

    act(() => {
      saveButton.click()
      saveButton.click()
      saveButton.click()
    })

    expect(generateBingoPng).toHaveBeenCalledOnce()
    expect(getButton(container, '画像で保存する').disabled).toBe(true)
    expect(getButton(container, 'Xでポストする（URLなし）※画像添付用').disabled).toBe(true)
    expect(getButton(container, 'Xでポストする（URLあり）').disabled).toBe(true)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'ビンゴ画像を生成しています。',
    )

    await act(async () => {
      deferred.resolve(new Blob(['png bytes'], { type: 'image/png' }))
      await deferred.promise
      await Promise.resolve()
    })

    expect(dependencies.downloadPng).toHaveBeenCalledOnce()
    expect(getButton(container, '画像で保存する').disabled).toBe(false)
  })

  it('busyとerrorをdiscriminated unionからLive Announcementへ写像する', () => {
    const busyState: PreviewOperationState = {
      status: 'sharing',
      action: 'share-url',
    }
    const busyContainer = mount(
      <PreviewOperationAnnouncement state={busyState} />,
    )
    const busyAnnouncement = busyContainer.querySelector('[role="status"]')

    expect(busyAnnouncement?.getAttribute('aria-live')).toBe('polite')
    expect(busyAnnouncement?.textContent).toBe(
      '共有URLからXの投稿画面を開いています。',
    )

    const errorState: PreviewOperationState = {
      status: 'error',
      action: 'share-without-url',
      code: 'x_intent_blocked',
    }
    const errorContainer = mount(
      <PreviewOperationAnnouncement state={errorState} />,
    )
    const errorAnnouncement = errorContainer.querySelector('[role="alert"]')

    expect(errorAnnouncement?.getAttribute('aria-live')).toBe('assertive')
    expect(errorAnnouncement?.getAttribute('aria-atomic')).toBe('true')
    expect(errorAnnouncement?.textContent).toBe(
      'Xの投稿画面を開けませんでした。もう一度お試しください。',
    )
  })

  it('native action controls、accessible action name、永続live regionを提供する', () => {
    const container = mountPage({
      kind: 'preview-bingo',
      bingoState: validBingoState,
    })
    const actionGroup = container.querySelector<HTMLElement>(
      '.setlist-bingo-preview-page__actions',
    )
    const actionButtons = [...actionGroup!.querySelectorAll('button')]
    const announcement = container.querySelector<HTMLElement>(
      '.setlist-bingo-preview-page__announcement',
    )

    expect(actionGroup?.getAttribute('aria-label')).toBe('ビンゴカードの操作')
    expect(actionButtons).toHaveLength(4)
    expect(
      actionButtons.every(
        (button) => button instanceof HTMLButtonElement && button.type === 'button',
      ),
    ).toBe(true)
    expect(announcement?.getAttribute('role')).toBe('status')
    expect(announcement?.getAttribute('aria-live')).toBe('polite')
    expect(announcement?.getAttribute('aria-atomic')).toBe('true')
    expect(container.querySelector('.bingo-card')?.getAttribute('aria-label')).toContain(
      validBingoState.performanceName,
    )
  })

  it('320pxから横scrollを避けるmax-width、mobile縦積み、focus contractを定義する', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/pages/SetlistBingoPreviewPage.css'),
      'utf8',
    )

    expect(css).toContain('overflow-x: hidden')
    expect(css).toContain('max-width: 800px')
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toContain('grid-template-columns: 1fr')
    expect(css).toContain(':focus-visible')
    expect(css).toContain(
      'outline: var(--border-width-normal) solid var(--color-text)',
    )
  })
})


describe('SetlistBingoPreviewPage URL sharing and non-persistence integration', () => {
  it('URL生成検証failureでもstate、画像代替、retryを保持する', async () => {
    const dependencies = createOperationDependencies()
    vi.mocked(dependencies.buildCanonicalShareUrl)
      .mockReturnValueOnce({
        ok: false,
        code: 'decoded_payload_too_large',
      })
      .mockReturnValueOnce({
        ok: true,
        url: 'https://app.example/music-bubble-v2/setlist-bingo/preview?b=retry',
        encodedState: 'retry',
      })
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, 'Xでポストする（URLあり）')
    await flushAsyncUpdates()

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '共有URLに含める情報が大きすぎるためURLでは共有できません。',
    )
    expect(container.textContent).toContain(
      '画像で保存する方法を代替手段として利用できます。',
    )
    expect(container.querySelector('.bingo-card__title')?.textContent).toBe(
      validBingoState.performanceName,
    )
    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()

    clickButton(container, 'URL共有を再試行')
    await flushAsyncUpdates()

    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(dependencies.buildCanonicalShareUrl).toHaveBeenCalledTimes(2)
    expect(dependencies.openExternalNoOpener).toHaveBeenCalledOnce()
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Xの投稿画面を開きました。',
    )
  })

  it('共有URLだけからSource Liveや保存serviceなしで同じカードを復元する', () => {
    const built = buildActualCanonicalShareUrl(
      validBingoState,
      window.location.origin,
      '/',
    )
    if (!built.ok) throw new Error(`Unexpected share URL failure: ${built.code}`)
    const sharedUrl = new URL(built.url)
    window.history.replaceState(
      null,
      '',
      `${sharedUrl.pathname}${sharedUrl.search}`,
    )

    const container = mountPage()

    expect(container.querySelector('.bingo-card__title')?.textContent).toBe(
      validBingoState.performanceName,
    )
    expect(container.querySelector('.bingo-card__participant-name')?.textContent).toBe(
      `名前：${validBingoState.participantName}`,
    )
    expect(
      [...container.querySelectorAll('.bingo-card__cell')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(validBingoState.songTitles)
  })

  it('作成・Preview・PNG・share moduleに禁止永続化APIやBingo save参照を持たない', () => {
    const sourcePaths = [
      'src/pages/SetlistBingoCreatePage.tsx',
      'src/pages/SetlistBingoPreviewPage.tsx',
      'src/services/setlistBingo/pngService.ts',
      'src/services/setlistBingo/canvasRenderer.ts',
      'src/services/setlistBingo/imageShareService.ts',
      'src/services/setlistBingo/xShareService.ts',
    ]
    const forbiddenReferences =
      /localStorage|sessionStorage|indexedDB|document\.cookie|cookie\s*=|caches\.|serviceWorker|saveService|persistenceService/iu

    for (const sourcePath of sourcePaths) {
      const source = readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
      expect(source, sourcePath).not.toMatch(forbiddenReferences)
    }

    const createSource = readFileSync(
      resolve(process.cwd(), 'src/pages/SetlistBingoCreatePage.tsx'),
      'utf8',
    )
    expect(createSource).not.toMatch(
      /firebaseService\.(?:addSong|updateSong|deleteSong)|liveService\.|karaokeSongService\./u,
    )
    expect(createSource.match(/cacheService\.[A-Za-z]+/gu)).toEqual([
      'cacheService.getCachedSongs',
      'cacheService.cacheSongs',
    ])
  })

  it('保存・PNG・共有・unmountを通してbackend/site storage writeはzero-callになる', async () => {
    const storageGet = vi.spyOn(Storage.prototype, 'getItem')
    const storageSet = vi.spyOn(Storage.prototype, 'setItem')
    const storageRemove = vi.spyOn(Storage.prototype, 'removeItem')
    const cookieWrite = vi.spyOn(Document.prototype, 'cookie', 'set')
    const indexedDbOpen = vi.fn()
    const indexedDbDelete = vi.fn()
    const cacheOpen = vi.fn()
    const cacheDelete = vi.fn()
    const serviceWorkerRegister = vi.fn()
    vi.stubGlobal('indexedDB', {
      open: indexedDbOpen,
      deleteDatabase: indexedDbDelete,
    })
    vi.stubGlobal('caches', { open: cacheOpen, delete: cacheDelete })
    vi.stubGlobal('navigator', {
      ...navigator,
      serviceWorker: { register: serviceWorkerRegister },
    })

    const addSong = vi.spyOn(firebaseService, 'addSong')
    const updateSong = vi.spyOn(firebaseService, 'updateSong')
    const deleteSong = vi.spyOn(firebaseService, 'deleteSong')
    const createLive = vi.spyOn(liveService, 'createLive')
    const updateLive = vi.spyOn(liveService, 'updateLive')
    const deleteLive = vi.spyOn(liveService, 'deleteLive')
    const createKaraoke = vi.spyOn(karaokeSongService, 'create')
    const updateKaraoke = vi.spyOn(karaokeSongService, 'update')
    const deleteKaraoke = vi.spyOn(karaokeSongService, 'delete')
    const cacheSongs = vi.spyOn(cacheService, 'cacheSongs')
    const cacheTags = vi.spyOn(cacheService, 'cacheTags')
    const clearCache = vi.spyOn(cacheService, 'clearCache')

    const dependencies = createOperationDependencies()
    const container = mountPage(
      { kind: 'preview-bingo', bingoState: validBingoState },
      dependencies,
    )

    clickButton(container, '画像で保存する')
    await flushAsyncUpdates()
    clickButton(container, 'Xでポストする（URLなし）※画像添付用')
    await flushAsyncUpdates()
    clickButton(container, 'Xでポストする（URLあり）')
    await flushAsyncUpdates()

    const firstMount = mountedPages.pop()
    if (!firstMount) throw new Error('Mounted preview not found')
    act(() => firstMount.root.unmount())
    firstMount.container.remove()

    expect(
      storageGet.mock.calls.every(
        ([key]) => key === 'music-bubble-v2-read-announcements',
      ),
    ).toBe(true)
    expect(storageSet).not.toHaveBeenCalled()
    expect(storageRemove).not.toHaveBeenCalled()
    expect(cookieWrite).not.toHaveBeenCalled()
    expect(indexedDbOpen).not.toHaveBeenCalled()
    expect(indexedDbDelete).not.toHaveBeenCalled()
    expect(cacheOpen).not.toHaveBeenCalled()
    expect(cacheDelete).not.toHaveBeenCalled()
    expect(serviceWorkerRegister).not.toHaveBeenCalled()
    expect(addSong).not.toHaveBeenCalled()
    expect(updateSong).not.toHaveBeenCalled()
    expect(deleteSong).not.toHaveBeenCalled()
    expect(createLive).not.toHaveBeenCalled()
    expect(updateLive).not.toHaveBeenCalled()
    expect(deleteLive).not.toHaveBeenCalled()
    expect(createKaraoke).not.toHaveBeenCalled()
    expect(updateKaraoke).not.toHaveBeenCalled()
    expect(deleteKaraoke).not.toHaveBeenCalled()
    expect(cacheSongs).not.toHaveBeenCalled()
    expect(cacheTags).not.toHaveBeenCalled()
    expect(clearCache).not.toHaveBeenCalled()
  })
})
