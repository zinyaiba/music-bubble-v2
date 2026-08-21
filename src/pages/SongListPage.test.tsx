import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useCallback: (callback: unknown) => callback,
  useEffect: () => undefined,
  useState: (initial: unknown) => [initial, vi.fn()],
}))
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams('q='), vi.fn()],
}))
vi.mock('../hooks', () => ({
  useDataFetch: () => ({ songs: [], isLoading: false, error: null, isOffline: false, retry: vi.fn() }),
}))

import { SongListPage } from './SongListPage'

interface ElementProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
  'aria-label'?: string
}

function findByLabel(node: ReactNode, label: string): ReactElement<ElementProps> | null {
  if (!isValidElement<ElementProps>(node)) return null
  if (node.props['aria-label'] === label) return node
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]
  for (const child of children) {
    const match = findByLabel(child, label)
    if (match) return match
  }
  return null
}

describe('SongListPage karaoke entry FAB', () => {
  it('has an accessible microphone icon and navigates to the karaoke list', () => {
    const button = findByLabel(SongListPage(), 'カラオケ歌唱一覧を開く')
    expect(button?.props.className).toBe('song-list-page__karaoke-button')
    const icon = button?.props.children
    expect(isValidElement<Record<string, unknown>>(icon) && icon.props['aria-hidden']).toBeTruthy()
    button?.props.onClick?.()
    expect(navigate).toHaveBeenCalledWith('/karaoke-songs')
  })
})
