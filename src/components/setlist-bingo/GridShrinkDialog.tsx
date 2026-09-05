import { useCallback, useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, RefObject } from 'react'
import './GridShrinkDialog.css'

export interface GridShrinkDialogProps {
  /** 縮小によって除外される、入力済み予想曲の件数 */
  excludedFilledCount: number
  /** 縮小を確定する。draftへの適用とdialogのcloseは親が制御する */
  onConfirm: () => void
  /** 縮小を取り消す。draftを変更せずdialogを閉じる処理は親が制御する */
  onCancel: () => void
  /** dialogを開いたGrid Size操作。dialog終了時にfocusを戻す */
  triggerRef: RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * 入力済み曲を失うGrid縮小だけに使用するcontrolled確認dialog。
 * 確定・cancelのどちらでもstateを内部更新せず、判断を親へ通知する。
 */
export function GridShrinkDialog({
  excludedFilledCount,
  onConfirm,
  onCancel,
  triggerRef,
}: GridShrinkDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const returnFocusTarget = triggerRef.current
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()
    if (document.activeElement !== cancelButtonRef.current) {
      dialogRef.current?.focus()
    }

    return () => {
      document.body.style.overflow = previousOverflow
      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus()
      }
    }
  }, [triggerRef])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      event.preventDefault()

      if (focusableElements.length === 0) {
        dialog.focus()
        return
      }

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
      const direction = event.shiftKey ? -1 : 1
      const baseIndex = currentIndex >= 0 ? currentIndex : event.shiftKey ? 0 : -1
      const nextIndex =
        (baseIndex + direction + focusableElements.length) % focusableElements.length
      focusableElements[nextIndex]?.focus()
    },
    [onCancel],
  )

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onCancel()
      }
    },
    [onCancel],
  )

  return (
    <div className="grid-shrink-dialog__backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="grid-shrink-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="grid-shrink-dialog__title">
          曲数を減らしますか？
        </h2>
        <p id={descriptionId} className="grid-shrink-dialog__description">
          曲数を変更すると、入力済みの予想曲
          <strong>{excludedFilledCount}曲</strong>
          がカードから除外されます。
        </p>
        <p className="grid-shrink-dialog__note">
          キャンセルすると、現在の曲数と入力内容をそのまま保持します。
        </p>

        <div className="grid-shrink-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="grid-shrink-dialog__cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="grid-shrink-dialog__confirm"
            onClick={onConfirm}
          >
            曲数を変更する
          </button>
        </div>
      </div>
    </div>
  )
}

export default GridShrinkDialog
