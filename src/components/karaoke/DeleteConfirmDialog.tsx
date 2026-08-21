import { useCallback, useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, MouseEvent, RefObject } from 'react'
import './DeleteConfirmDialog.css'

export interface DeleteConfirmDialogProps {
  /** 削除対象として確認文に表示する曲名 */
  songTitle: string
  /** 削除処理中かどうか。true の間はすべての操作を無効化する */
  isDeleting: boolean
  /** 削除失敗時のメッセージ。指定中は確定操作を再試行として表示する */
  error?: string | null
  /** 削除を要求する。ダイアログを閉じるかどうかは親が制御する */
  onConfirm: () => void | Promise<void>
  /** キャンセルしてダイアログを閉じる */
  onCancel: () => void
  /** 閉じた後にフォーカスを戻す要素。省略時は表示直前の要素へ戻す */
  returnFocusRef?: RefObject<HTMLElement | null>
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
 * カラオケ歌唱曲の削除確認ダイアログ。
 * 非同期処理とエラーは親が管理するため、失敗しても自動では閉じない。
 */
export function DeleteConfirmDialog({
  songTitle,
  isDeleting,
  error = null,
  onConfirm,
  onCancel,
  returnFocusRef,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const confirmationRequestedRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  useEffect(() => {
    const previouslyFocused =
      returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    cancelButtonRef.current?.focus()
    if (document.activeElement !== cancelButtonRef.current) {
      dialogRef.current?.focus()
    }

    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [returnFocusRef])

  useEffect(() => {
    if (isDeleting) {
      dialogRef.current?.focus()
      return
    }
    confirmationRequestedRef.current = false
  }, [isDeleting])

  const requestCancel = useCallback(() => {
    if (!isDeleting) {
      onCancel()
    }
  }, [isDeleting, onCancel])

  const handleConfirm = useCallback(async () => {
    if (isDeleting || confirmationRequestedRef.current) return

    confirmationRequestedRef.current = true
    try {
      await onConfirm()
    } catch {
      // エラー表示と再試行可能な状態への更新は親コンポーネントが担当する。
    } finally {
      confirmationRequestedRef.current = false
    }
  }, [isDeleting, onConfirm])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (!isDeleting) {
          onCancel()
        }
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
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
    [isDeleting, onCancel]
  )

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        requestCancel()
      }
    },
    [requestCancel]
  )

  const describedBy = error ? `${descriptionId} ${errorId}` : descriptionId

  return (
    <div className="delete-confirm-dialog__backdrop" onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        className="delete-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        aria-busy={isDeleting}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="delete-confirm-dialog__title">
          カラオケ歌唱曲を削除
        </h2>
        <p id={descriptionId} className="delete-confirm-dialog__description">
          「<strong>{songTitle}</strong>」を削除しますか？
          <span className="delete-confirm-dialog__irreversible">
            削除したカラオケ歌唱曲は復元できません。
          </span>
        </p>

        {error && (
          <p id={errorId} className="delete-confirm-dialog__error" role="alert">
            {error}
            <span className="delete-confirm-dialog__retry-hint">
              接続状態を確認して、もう一度削除してください。
            </span>
          </p>
        )}

        <div className="delete-confirm-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="delete-confirm-dialog__cancel"
            onClick={requestCancel}
            disabled={isDeleting}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="delete-confirm-dialog__confirm"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? '削除中…' : error ? '削除を再試行' : '削除する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmDialog
