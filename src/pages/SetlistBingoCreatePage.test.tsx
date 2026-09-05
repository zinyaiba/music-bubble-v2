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
import type { CreateRouteState, Song } from '../types'
import { SetlistBingoCreatePage } from './SetlistBingoCreatePage'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

interface MountedPage {
  container: HTMLDivElement
  root: Root
}

const mountedPages: MountedPage[] = []
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function createSong(id: string, title: string): Song {
  return { id, title, lyricists: [], composers: [], arrangers: [] }
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

function mountPage(routeState?: CreateRouteState): HTMLDivElement {
  const initialEntry: InitialEntry = {
    pathname: '/setlist-bingo/new',
    state: routeState,
  }

  return mount(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/setlist-bingo/new" element={<SetlistBingoCreatePage />} />
        <Route path="/setlist-bingo/preview" element={<RouteCapture />} />
        <Route path="/lives/:liveId" element={<RouteCapture />} />
        <Route path="/tours/:tourName" element={<RouteCapture />} />
        <Route path="*" element={<RouteCapture />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function flushAsyncUpdates(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function click(element: HTMLElement): void {
  act(() => element.click())
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function getButton(container: ParentNode, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
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
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(cacheService, 'getCachedSongs').mockReturnValue([])
  vi.spyOn(cacheService, 'cacheSongs').mockImplementation(() => undefined)
  vi.spyOn(firebaseService, 'getAllSongs').mockResolvedValue([])
})

afterEach(() => {
  while (mountedPages.length > 0) {
    const mounted = mountedPages.pop()
    if (!mounted) continue
    act(() => mounted.root.unmount())
    mounted.container.remove()
  }
  vi.restoreAllMocks()
})

describe('SetlistBingoCreatePage', () => {
  it('Source Liveから9曲/default designで初期化し、Header/Navigationと非永続な戻り操作を表示する', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    const sourceLive = { id: 'live-1', performanceName: '  Anniversary Live  ' }
    const container = mountPage({ kind: 'source-live', sourceLive })
    await flushAsyncUpdates()

    const performanceInput = container.querySelector<HTMLInputElement>(
      '.setlist-bingo-create-page__text-input',
    )
    const gridRadios = [...container.querySelectorAll<HTMLInputElement>(
      'input[name="setlist-bingo-grid-size"]',
    )]
    const designRadios = [...container.querySelectorAll<HTMLInputElement>(
      '.bingo-design-picker__radio',
    )]

    expect(container.querySelector('h1')?.textContent).toBe('セトリ予想ビンゴ作成')
    expect(container.querySelector('nav[aria-label="メインナビゲーション"]')).not.toBeNull()
    expect(container.querySelector('[aria-current="page"]')?.textContent).toContain('ライブ')
    expect(performanceInput?.value).toBe(sourceLive.performanceName)
    expect(gridRadios.find((radio) => radio.checked)?.value).toBe('3')
    expect(container.querySelectorAll('input[role="combobox"]')).toHaveLength(9)
    expect(designRadios).toHaveLength(3)
    expect(designRadios.find((radio) => radio.checked)?.value).toBe('rose-bubble')
    expect(container.querySelector('.setlist-bingo-create-page__source-back')).toBeNull()
    expect(container.textContent).not.toContain('ライブ詳細に戻る')
    expect(container.textContent).not.toContain('ツアー詳細に戻る')

    setInputValue(
      container.querySelector<HTMLInputElement>('input[role="combobox"]')!,
      '保存されない編集中の曲',
    )
    const headerBack = container.querySelector<HTMLButtonElement>('button[aria-label="戻る"]')
    if (!headerBack) throw new Error('Header back button not found')
    click(headerBack)

    expect(getRouteCapture(container)).toEqual({
      pathname: '/lives/live-1',
      state: null,
    })
    expect(storageWrite).not.toHaveBeenCalled()
    expect(cacheService.cacheSongs).not.toHaveBeenCalled()
  })

  it('cache miss時だけ登録曲を取得して既存song cacheへ保存する', async () => {
    const songs = [createSong('song-1', 'Precious Memories')]
    vi.mocked(cacheService.getCachedSongs).mockReturnValue(null)
    vi.mocked(firebaseService.getAllSongs).mockResolvedValue(songs)

    const container = mountPage()
    await flushAsyncUpdates()

    expect(firebaseService.getAllSongs).toHaveBeenCalledOnce()
    expect(cacheService.cacheSongs).toHaveBeenCalledWith(songs)
    expect(container.textContent).not.toContain('登録曲1曲を読み込みました。')

    const firstSongInput = container.querySelector<HTMLInputElement>('input[role="combobox"]')!
    setInputValue(firstSongInput, 'precious')
    expect(container.querySelector('[role="option"]')?.textContent).toBe('Precious Memories')
  })

  it('登録曲取得失敗後も自由入力とdraftを維持し、retryで候補を読み込む', async () => {
    const songs = [createSong('song-retry', 'Retry Song')]
    vi.mocked(cacheService.getCachedSongs).mockReturnValue(null)
    vi.mocked(firebaseService.getAllSongs)
      .mockRejectedValueOnce(new Error('content-bearing error must not be shown'))
      .mockResolvedValueOnce(songs)

    const container = mountPage()
    await flushAsyncUpdates()

    expect(container.querySelector('.setlist-bingo-create-page__load-error')?.textContent).toContain(
      '登録曲の読み込みに失敗しました。自由入力は引き続き利用できます。',
    )
    expect(container.textContent).not.toContain('content-bearing error')

    const firstSongInput = container.querySelector<HTMLInputElement>('input[role="combobox"]')!
    expect(firstSongInput.disabled).toBe(false)
    setInputValue(firstSongInput, '自由入力を保持')
    click(getButton(container, '登録曲を再読み込み'))
    await flushAsyncUpdates()

    expect(firebaseService.getAllSongs).toHaveBeenCalledTimes(2)
    expect(cacheService.cacheSongs).toHaveBeenCalledWith(songs)
    expect(firstSongInput.value).toBe('自由入力を保持')
    expect(container.querySelector('.setlist-bingo-create-page__load-error')).toBeNull()
    expect(container.textContent).not.toContain('登録曲1曲を読み込みました。')
  })

  it('拡大時は入力順を保持し、入力済み末尾を失う縮小だけdialogで保留する', async () => {
    const container = mountPage()
    await flushAsyncUpdates()

    const firstInput = container.querySelector<HTMLInputElement>('input[role="combobox"]')!
    setInputValue(firstInput, '先頭曲')
    click(container.querySelector<HTMLInputElement>('input[name="setlist-bingo-grid-size"][value="4"]')!)

    let songInputs = [...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')]
    expect(songInputs).toHaveLength(16)
    expect(songInputs[0]?.value).toBe('先頭曲')
    expect(songInputs.slice(9).every((input) => input.value === '')).toBe(true)

    setInputValue(songInputs[9]!, '縮小で除外される曲')
    const nineSongRadio = container.querySelector<HTMLInputElement>(
      'input[name="setlist-bingo-grid-size"][value="3"]',
    )!
    click(nineSongRadio)

    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('1曲')
    expect(container.querySelector<HTMLInputElement>(
      'input[name="setlist-bingo-grid-size"][value="4"]',
    )?.checked).toBe(true)
    expect(container.querySelectorAll('input[role="combobox"]')).toHaveLength(16)

    click(getButton(container, 'キャンセル'))
    expect(container.querySelectorAll('input[role="combobox"]')).toHaveLength(16)
    expect([...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')][9]?.value).toBe(
      '縮小で除外される曲',
    )

    click(nineSongRadio)
    click(getButton(container, '曲数を変更する'))
    songInputs = [...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')]
    expect(songInputs).toHaveLength(9)
    expect(songInputs[0]?.value).toBe('先頭曲')
    expect(nineSongRadio.checked).toBe(true)
  })

  it('全validationを関連付け、無効時は遷移せず、有効時だけtrim済みstateをPreviewへ渡す', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    const sourceLive = { id: 'live-validation', performanceName: '初期公演' }
    const container = mountPage({ kind: 'source-live', sourceLive })
    await flushAsyncUpdates()

    const performanceInput = container.querySelector<HTMLInputElement>(
      '.setlist-bingo-create-page__text-input',
    )!
    const participantLabel = [...container.querySelectorAll<HTMLLabelElement>('label')].find(
      (label) => label.textContent?.trim() === '名前（任意）',
    )
    const participantInput = participantLabel
      ? document.getElementById(participantLabel.htmlFor) as HTMLInputElement | null
      : null
    if (!participantInput) throw new Error('Participant name input not found')
    setInputValue(performanceInput, '   ')
    click(getButton(container, '作成'))

    expect(getRouteCapture(container)).toBeNull()
    expect(performanceInput.getAttribute('aria-invalid')).toBe('true')
    expect(
      document.getElementById(performanceInput.getAttribute('aria-describedby')?.split(' ')[1] ?? '')
        ?.textContent,
    ).toBe('公演名を入力してください。')
    expect(container.textContent).not.toContain('曲名を入力してください。')
    expect(container.querySelectorAll('input[role="combobox"][aria-invalid="true"]')).toHaveLength(
      0,
    )

    setInputValue(performanceInput, '公'.repeat(81))
    setInputValue(participantInput, '名'.repeat(31))
    const songInputs = [...container.querySelectorAll<HTMLInputElement>('input[role="combobox"]')]
    setInputValue(songInputs[0]!, '曲'.repeat(51))
    click(getButton(container, '作成'))

    expect(container.textContent).toContain('公演名は80文字以下で入力してください。')
    expect(container.textContent).toContain('名前は30文字以下で入力してください。')
    expect(container.textContent).toContain('曲名は50文字以下で入力してください。')
    expect(getRouteCapture(container)).toBeNull()

    setInputValue(performanceInput, '  完成公演  ')
    setInputValue(participantInput, '  参加者 🎤  ')
    expect(
      [...container.querySelectorAll('.bingo-card__participant-name')].every(
        (element) => element.textContent === '名前：参加者 🎤',
      ),
    ).toBe(true)
    setInputValue(songInputs[0]!, '')
    click(getButton(container, '作成'))

    expect(getRouteCapture(container)).toEqual({
      pathname: '/setlist-bingo/preview',
      state: {
        kind: 'preview-bingo',
        bingoState: {
          schemaVersion: 1,
          performanceName: '完成公演',
          participantName: '参加者 🎤',
          gridSize: 3,
          songTitles: Array.from({ length: 9 }, () => ''),
          designId: 'rose-bubble',
        },
        sourceLive,
      },
    })
    expect(storageWrite).not.toHaveBeenCalled()
  })

  it('native controls、可視label/error関連付け、永続live regionを提供する', async () => {
    const container = mountPage()
    await flushAsyncUpdates()

    const performanceInput = container.querySelector<HTMLInputElement>(
      '.setlist-bingo-create-page__text-input',
    )!
    const performanceLabel = container.querySelector<HTMLLabelElement>(
      `label[for="${performanceInput.id}"]`,
    )
    const gridRadios = [
      ...container.querySelectorAll<HTMLInputElement>(
        'input[name="setlist-bingo-grid-size"]',
      ),
    ]
    const announcement = container.querySelector<HTMLElement>(
      '.setlist-bingo-create-page__announcement',
    )

    expect(performanceInput.type).toBe('text')
    expect(performanceLabel?.textContent).toBe('公演名')
    expect(
      [...container.querySelectorAll('label')].some(
        (label) => label.textContent?.trim() === '名前（任意）',
      ),
    ).toBe(true)
    expect(performanceInput.getAttribute('aria-describedby')).not.toBeNull()
    expect(gridRadios).toHaveLength(3)
    expect(gridRadios.every((radio) => radio.type === 'radio')).toBe(true)
    expect(container.querySelector('.setlist-bingo-create-page__grid-size legend')?.textContent).toBe(
      '曲数',
    )
    expect(container.querySelector('.prediction-song-grid legend')?.textContent).toBe(
      '予想曲',
    )
    expect(container.querySelector('.bingo-design-picker legend')?.textContent).toBe(
      'ビンゴデザイン',
    )
    expect(
      [...container.querySelectorAll('button')].every(
        (button) => button instanceof HTMLButtonElement,
      ),
    ).toBe(true)
    expect(announcement?.getAttribute('aria-live')).toBe('polite')
    expect(announcement?.getAttribute('aria-atomic')).toBe('true')
    expect(
      container.querySelector('.prediction-song-grid__announcement')?.getAttribute(
        'aria-live',
      ),
    ).toBe('polite')
  })

  it('320pxから横scrollを避けるmax-width/mobile一列/focus contractを定義する', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/pages/SetlistBingoCreatePage.css'),
      'utf8',
    )

    expect(css).toContain('overflow-x: hidden')
    expect(css).toContain('max-width: 800px')
    expect(css).toContain('@media (max-width: 767px)')
    expect(css).toMatch(
      /\.setlist-bingo-create-page__grid-options\s*\{\s*grid-template-columns:\s*1fr;/u,
    )
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline: var(--border-width-normal) solid var(--color-text)')
  })
})
