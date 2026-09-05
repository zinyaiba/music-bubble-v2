import {
  isValidElement,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const stateOverrides = vi.hoisted(() => ({
  cursor: 0,
  values: new Map<number, unknown>(),
}))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useCallback: (callback: unknown) => callback,
  useMemo: (factory: () => unknown) => factory(),
  useRef: (initial: unknown) => ({ current: initial }),
  useState: (initial: unknown) => {
    const index = stateOverrides.cursor++
    const value = stateOverrides.values.has(index) ? stateOverrides.values.get(index) : initial
    return [value, vi.fn()]
  },
}))

import type { Song } from '../../types'
import { SetlistEditor, type SetlistItemFormData } from './SetlistEditor'

interface TestElementProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onClick?: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  'aria-label'?: string
}

function findAll(
  node: ReactNode,
  predicate: (element: ReactElement<TestElementProps>) => boolean,
  matches: ReactElement<TestElementProps>[] = []
): ReactElement<TestElementProps>[] {
  if (!isValidElement<TestElementProps>(node)) return matches
  if (predicate(node)) matches.push(node)

  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
  for (const child of children) {
    findAll(child, predicate, matches)
  }
  return matches
}

function findAllByLabel(node: ReactNode, label: string): ReactElement<TestElementProps>[] {
  return findAll(node, (element) => element.props['aria-label'] === label)
}

function renderEditor(props: Parameters<typeof SetlistEditor>[0]): ReactNode {
  stateOverrides.cursor = 0
  return SetlistEditor(props)
}

function createSong(id: string, title: string): Song {
  return { id, title, lyricists: [], composers: [], arrangers: [] }
}

const items: SetlistItemFormData[] = [
  { songId: 'song-1', songTitle: 'Song 1', note: 'note 1', isDailySong: false },
  { songId: 'song-2', songTitle: 'Song 2', note: 'note 2', isDailySong: true },
]
const songs = [createSong('song-1', 'Song 1'), createSong('song-2', 'Song 2')]

describe('SetlistEditor regression', () => {
  beforeEach(() => {
    stateOverrides.cursor = 0
    stateOverrides.values.clear()
  })

  it('keeps exact registered-song addition and free-input addition unchanged', () => {
    const onRegisteredChange = vi.fn()
    stateOverrides.values.set(0, '  song 1  ')
    const registeredTree = renderEditor({ items, songs, onChange: onRegisteredChange })

    findAll(registeredTree, (element) => element.props.children === '追加')[0].props.onClick?.()
    expect(onRegisteredChange).toHaveBeenCalledWith([
      ...items,
      { songId: 'song-1', songTitle: 'song 1', isDailySong: false },
    ])

    const onFreeInputChange = vi.fn()
    stateOverrides.values.set(0, '  Unregistered Song  ')
    const freeInputTree = renderEditor({ items, songs, onChange: onFreeInputChange })
    const preventDefault = vi.fn()

    findAllByLabel(freeInputTree, '楽曲名を入力')[0].props.onKeyDown?.({
      key: 'Enter',
      preventDefault,
    } as unknown as KeyboardEvent<HTMLInputElement>)

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(onFreeInputChange).toHaveBeenCalledWith([
      ...items,
      { songId: undefined, songTitle: 'Unregistered Song', isDailySong: false },
    ])
  })

  it('keeps editing with case-insensitive exact ID resolution unchanged', () => {
    const onChange = vi.fn()
    stateOverrides.values.set(3, 0)
    stateOverrides.values.set(4, '  SONG 2  ')
    stateOverrides.values.set(6, true)
    const tree = renderEditor({ items, songs, onChange })
    const editInput = findAll(
      tree,
      (element) => element.props.className === 'setlist-editor__edit-input'
    )[0]

    editInput.props.onKeyDown?.({
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent<HTMLInputElement>)

    expect(onChange).toHaveBeenCalledWith([
      { ...items[0], songId: 'song-2', songTitle: 'SONG 2' },
      items[1],
    ])
  })

  it('keeps note, daily-song, reorder, and delete operations unchanged', () => {
    const onChange = vi.fn()
    const tree = renderEditor({ items, songs, onChange })

    findAllByLabel(tree, 'Song 1の備考')[0].props.onChange?.({
      target: { value: 'updated note' },
    } as ChangeEvent<HTMLInputElement>)
    expect(onChange).toHaveBeenLastCalledWith([
      { ...items[0], note: 'updated note' },
      items[1],
    ])

    findAllByLabel(tree, '日替わり曲に設定')[0].props.onClick?.()
    expect(onChange).toHaveBeenLastCalledWith([
      { ...items[0], isDailySong: true },
      items[1],
    ])

    findAllByLabel(tree, '下に移動')[0].props.onClick?.()
    expect(onChange).toHaveBeenLastCalledWith([items[1], items[0]])

    findAllByLabel(tree, '削除')[0].props.onClick?.()
    expect(onChange).toHaveBeenLastCalledWith([items[1]])
  })

  it('keeps disabled list operations unavailable', () => {
    const tree = renderEditor({ items, songs, onChange: vi.fn(), disabled: true })

    expect(findAllByLabel(tree, '削除')).toEqual([])
    expect(findAllByLabel(tree, '上に移動')).toEqual([])
    expect(findAllByLabel(tree, '下に移動')).toEqual([])
    expect(findAllByLabel(tree, 'Song 1の備考')[0].props.disabled).toBe(true)
  })
})
