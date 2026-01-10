/**
 * TagEditDialog コンポーネント
 * タグの名称変更・削除ダイアログ
 */

import { useState, useCallback, useEffect } from 'react'
import type { Tag } from '../../types'
import './TagEditDialog.css'

export interface TagEditDialogProps {
  /** 編集対象のタグ */
  tag: Tag
  /** 既存のタグ名一覧（重複チェック用） */
  existingTagNames: string[]
  /** 閉じる時のコールバック */
  onClose: () => void
  /** 名称変更時のコールバック */
  onRename: (oldName: string, newName: string) => Promise<void>
  /** 削除時のコールバック */
  onDelete: (tagName: string) => Promise<void>
}

type DialogMode = 'menu' | 'rename' | 'delete' | 'merge-confirm'

/**
 * TagEditDialog コンポーネント
 */
export function TagEditDialog({
  tag,
  existingTagNames,
  onClose,
  onRename,
  onDelete,
}: TagEditDialogProps) {
  const [mode, setMode] = useState<DialogMode>('menu')
  const [newTagName, setNewTagName] = useState(tag.name)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 統合先のタグ情報
  const [mergeTargetTag, setMergeTargetTag] = useState<string | null>(null)

  // ESCキーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isProcessing])

  // 名称変更の確認
  const handleRenameConfirm = useCallback(() => {
    const trimmedName = newTagName.trim()
    
    if (!trimmedName) {
      setError('タグ名を入力してください')
      return
    }

    if (trimmedName === tag.name) {
      onClose()
      return
    }

    // 既存タグと同名かチェック
    if (existingTagNames.includes(trimmedName)) {
      setMergeTargetTag(trimmedName)
      setMode('merge-confirm')
      return
    }

    // 名称変更を実行
    setIsProcessing(true)
    setError(null)

    onRename(tag.name, trimmedName)
      .then(() => {
        onClose()
      })
      .catch((err) => {
        console.error('タグの名称変更に失敗しました:', err)
        setError('タグの名称変更に失敗しました')
      })
      .finally(() => {
        setIsProcessing(false)
      })
  }, [newTagName, tag.name, existingTagNames, onClose, onRename])

  // 名称変更の実行（統合時用）
  const handleRename = useCallback(async (newName: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      await onRename(tag.name, newName)
      onClose()
    } catch (err) {
      console.error('タグの名称変更に失敗しました:', err)
      setError('タグの名称変更に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }, [tag.name, onRename, onClose])

  // 削除の実行
  const handleDelete = useCallback(async () => {
    setIsProcessing(true)
    setError(null)

    try {
      await onDelete(tag.name)
      onClose()
    } catch (err) {
      console.error('タグの削除に失敗しました:', err)
      setError('タグの削除に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }, [tag.name, onDelete, onClose])

  // 背景クリックで閉じる
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose()
    }
  }, [onClose, isProcessing])

  return (
    <div className="tag-edit-dialog__backdrop" onClick={handleBackdropClick}>
      <div className="tag-edit-dialog" role="dialog" aria-modal="true">
        {/* メニューモード */}
        {mode === 'menu' && (
          <>
            <div className="tag-edit-dialog__header">
              <h2 className="tag-edit-dialog__title">タグを編集</h2>
              <p className="tag-edit-dialog__tag-name">{tag.name}</p>
              <p className="tag-edit-dialog__tag-count">{tag.songCount}曲</p>
            </div>
            <div className="tag-edit-dialog__actions">
              <button
                type="button"
                className="tag-edit-dialog__action-button"
                onClick={() => setMode('rename')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                名称を変更
              </button>
              <button
                type="button"
                className="tag-edit-dialog__action-button tag-edit-dialog__action-button--danger"
                onClick={() => setMode('delete')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                削除
              </button>
            </div>
            <div className="tag-edit-dialog__footer">
              <button
                type="button"
                className="tag-edit-dialog__cancel-button"
                onClick={onClose}
              >
                キャンセル
              </button>
            </div>
          </>
        )}

        {/* 名称変更モード */}
        {mode === 'rename' && (
          <>
            <div className="tag-edit-dialog__header">
              <h2 className="tag-edit-dialog__title">タグ名を変更</h2>
            </div>
            <div className="tag-edit-dialog__content">
              <label className="tag-edit-dialog__label">
                新しいタグ名
                <input
                  type="text"
                  className="tag-edit-dialog__input"
                  value={newTagName}
                  onChange={(e) => {
                    setNewTagName(e.target.value)
                    setError(null)
                  }}
                  placeholder="タグ名を入力"
                  autoFocus
                  disabled={isProcessing}
                />
              </label>
              {error && <p className="tag-edit-dialog__error">{error}</p>}
            </div>
            <div className="tag-edit-dialog__footer">
              <button
                type="button"
                className="tag-edit-dialog__cancel-button"
                onClick={() => {
                  setMode('menu')
                  setNewTagName(tag.name)
                  setError(null)
                }}
                disabled={isProcessing}
              >
                戻る
              </button>
              <button
                type="button"
                className="tag-edit-dialog__confirm-button"
                onClick={handleRenameConfirm}
                disabled={isProcessing || !newTagName.trim()}
              >
                {isProcessing ? '処理中...' : '変更'}
              </button>
            </div>
          </>
        )}

        {/* 統合確認モード */}
        {mode === 'merge-confirm' && mergeTargetTag && (
          <>
            <div className="tag-edit-dialog__header">
              <h2 className="tag-edit-dialog__title">タグの統合</h2>
            </div>
            <div className="tag-edit-dialog__content">
              <div className="tag-edit-dialog__warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p>
                  「<strong>{mergeTargetTag}</strong>」は既に存在します。
                  <br />
                  「<strong>{tag.name}</strong>」を「<strong>{mergeTargetTag}</strong>」に統合しますか？
                </p>
              </div>
              <p className="tag-edit-dialog__merge-info">
                統合すると、「{tag.name}」が付いている{tag.songCount}曲に「{mergeTargetTag}」が追加されます。
              </p>
              {error && <p className="tag-edit-dialog__error">{error}</p>}
            </div>
            <div className="tag-edit-dialog__footer">
              <button
                type="button"
                className="tag-edit-dialog__cancel-button"
                onClick={() => {
                  setMode('rename')
                  setMergeTargetTag(null)
                  setError(null)
                }}
                disabled={isProcessing}
              >
                戻る
              </button>
              <button
                type="button"
                className="tag-edit-dialog__confirm-button tag-edit-dialog__confirm-button--warning"
                onClick={() => handleRename(mergeTargetTag)}
                disabled={isProcessing}
              >
                {isProcessing ? '処理中...' : '統合する'}
              </button>
            </div>
          </>
        )}

        {/* 削除確認モード */}
        {mode === 'delete' && (
          <>
            <div className="tag-edit-dialog__header">
              <h2 className="tag-edit-dialog__title">タグを削除</h2>
            </div>
            <div className="tag-edit-dialog__content">
              <div className="tag-edit-dialog__warning tag-edit-dialog__warning--danger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p>
                  「<strong>{tag.name}</strong>」を削除しますか？
                  <br />
                  この操作は取り消せません。
                </p>
              </div>
              <p className="tag-edit-dialog__delete-info">
                {tag.songCount}曲からこのタグが削除されます。
              </p>
              {error && <p className="tag-edit-dialog__error">{error}</p>}
            </div>
            <div className="tag-edit-dialog__footer">
              <button
                type="button"
                className="tag-edit-dialog__cancel-button"
                onClick={() => {
                  setMode('menu')
                  setError(null)
                }}
                disabled={isProcessing}
              >
                戻る
              </button>
              <button
                type="button"
                className="tag-edit-dialog__confirm-button tag-edit-dialog__confirm-button--danger"
                onClick={handleDelete}
                disabled={isProcessing}
              >
                {isProcessing ? '処理中...' : '削除する'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TagEditDialog
