/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GridSize, PredictionSongDraft } from '../../types'
import {
  confirmGridShrink,
  requestGridResize,
} from '../../utils/setlistBingoGrid'
import { GridShrinkDialog } from './GridShrinkDialog'

interface MountedComponent {
  container: HTMLDivElement
  root: Root
}

const mountedComponents: MountedComponent[] = []
const dialogCss = readFileSync(
  resolve(process.cwd(), 'src/components/setlist-bingo/GridShrinkDialog.css'),
  'utf8',
)

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function mount(element: React.ReactNode): HTMLDivElement {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  mountedComponents.push({ container, root })

  act(() => {
    root.render(element)
  })

  return container
}

function pressKey(element: Element, key: string, shiftKey = false) {
  act(() => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    )
  })
}

function click(element: HTMLElement) {
  act(() => {
    element.click()
  })
}

afterEach(() => {
  while (mountedComponents.length > 0) {
    const mounted = mountedComponents.pop()
    if (!mounted) continue
    act(() => mounted.root.unmount())
    mounted.container.remove()
  }
  document.body.style.overflow = ''
})

function DialogHarness() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
        9曲へ縮小
      </button>
      {isOpen && (
        <GridShrinkDialog
          excludedFilledCount={7}
          triggerRef={triggerRef}
          onCancel={() => setIsOpen(false)}
          onConfirm={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

const originalSlots: PredictionSongDraft[] = Array.from({ length: 16 }, (_, index) => ({
  songTitle: `${index + 1}曲目`,
}))

function ControlledResizeHarness() {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<{
    gridSize: GridSize
    slots: PredictionSongDraft[]
  }>({ gridSize: 4, slots: originalSlots })
  const [pending, setPending] = useState<{
    target: GridSize
    excludedFilledCount: number
  } | null>(null)

  const requestShrink = () => {
    const result = requestGridResize(draft.gridSize, draft.slots, 3)
    if (result.kind === 'confirmation-required') {
      setPending({
        target: result.target,
        excludedFilledCount: result.excludedFilledCount,
      })
    }
  }

  const confirmShrink = () => {
    if (!pending) return
    setDraft((current) => ({
      gridSize: pending.target,
      slots: confirmGridShrink(current.slots, pending.target),
    }))
    setPending(null)
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={requestShrink}>
        9曲へ縮小
      </button>
      <output data-testid="grid-size">{draft.gridSize}</output>
      <output data-testid="slot-count">{draft.slots.length}</output>
      <output data-testid="song-order">
        {draft.slots.map((slot) => slot.songTitle).join('|')}
      </output>
      {pending && (
        <GridShrinkDialog
          excludedFilledCount={pending.excludedFilledCount}
          triggerRef={triggerRef}
          onCancel={() => setPending(null)}
          onConfirm={confirmShrink}
        />
      )}
    </>
  )
}

function getButton(container: ParentNode, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')].find(
    (candidate) => candidate.textContent === name,
  )
  if (!button) throw new Error(`Button not found: ${name}`)
  return button
}

describe('GridShrinkDialog', () => {
  it('除外曲数とaccessible dialog semanticsを表示し、キャンセルへ初期focusする', () => {
    const container = mount(<DialogHarness />)
    const trigger = getButton(container, '9曲へ縮小')

    click(trigger)

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')
    const cancelButton = getButton(container, 'キャンセル')
    const titleId = dialog?.getAttribute('aria-labelledby')
    const descriptionId = dialog?.getAttribute('aria-describedby')

    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(titleId ?? '')?.textContent).toBe('曲数を減らしますか？')
    expect(document.getElementById(descriptionId ?? '')?.textContent).toContain('7曲')
    expect(document.activeElement).toBe(cancelButton)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('TabとShift+Tabをdialog内の操作間で循環させる', () => {
    const container = mount(<DialogHarness />)
    click(getButton(container, '9曲へ縮小'))

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')
    const cancelButton = getButton(container, 'キャンセル')
    const confirmButton = getButton(container, '曲数を変更する')
    if (!dialog) throw new Error('Dialog not found')

    expect(document.activeElement).toBe(cancelButton)
    pressKey(cancelButton, 'Tab')
    expect(document.activeElement).toBe(confirmButton)
    pressKey(confirmButton, 'Tab')
    expect(document.activeElement).toBe(cancelButton)
    pressKey(cancelButton, 'Tab', true)
    expect(document.activeElement).toBe(confirmButton)
  })

  it('Escapeでcancelし、dialogを開いたtriggerへfocusを戻す', () => {
    const container = mount(<DialogHarness />)
    const trigger = getButton(container, '9曲へ縮小')
    click(trigger)

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')
    if (!dialog) throw new Error('Dialog not found')
    pressKey(dialog, 'Escape')

    expect(container.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('表示中とcancelではdraftを保持し、confirm時だけordered prefixへ縮小する', () => {
    const container = mount(<ControlledResizeHarness />)
    const trigger = getButton(container, '9曲へ縮小')
    const readState = () => ({
      gridSize: container.querySelector('[data-testid="grid-size"]')?.textContent,
      slotCount: container.querySelector('[data-testid="slot-count"]')?.textContent,
      order: container.querySelector('[data-testid="song-order"]')?.textContent,
    })
    const unchangedState = {
      gridSize: '4',
      slotCount: '16',
      order: originalSlots.map((slot) => slot.songTitle).join('|'),
    }

    click(trigger)
    expect(readState()).toEqual(unchangedState)
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('7曲')

    click(getButton(container, 'キャンセル'))
    expect(readState()).toEqual(unchangedState)
    expect(document.activeElement).toBe(trigger)

    click(trigger)
    expect(readState()).toEqual(unchangedState)
    click(getButton(container, '曲数を変更する'))

    expect(readState()).toEqual({
      gridSize: '3',
      slotCount: '9',
      order: originalSlots
        .slice(0, 9)
        .map((slot) => slot.songTitle)
        .join('|'),
    })
    expect(document.activeElement).toBe(trigger)
  })

  it('confirm/cancelをnative buttonで公開し、focus indicatorを定義する', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const trigger = document.createElement('button')
    document.body.append(trigger)
    const triggerRef = { current: trigger }
    const container = mount(
      <GridShrinkDialog
        excludedFilledCount={1}
        triggerRef={triggerRef}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    click(getButton(container, '曲数を変更する'))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()

    trigger.remove()
    expect(dialogCss).toContain(
      '.grid-shrink-dialog__cancel:focus-visible,\n.grid-shrink-dialog__confirm:focus-visible',
    )
    expect(dialogCss).toContain('outline: var(--border-width-normal) solid var(--color-text)')
  })
})
