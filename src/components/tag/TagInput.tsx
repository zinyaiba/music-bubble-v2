/**
 * TagInput コンポーネント
 * タグ入力・選択UI
 *
 * Requirements:
 * - 5.3: 楽曲をタップした時、システムはその楽曲のタグ入力インターフェースを表示すること
 * - 5.6: システムはタグを視覚的に区別しやすく、読みやすい形式で表示すること
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import './TagInput.css'

export interface TagInputProps {
  /** 既存のタグ一覧（サジェスト用） */
  existingTags: string[]
  /** 選択されているタグ */
  selectedTags: string[]
  /** タグ変更時のコールバック */
  onChange: (tags: string[]) => void
  /** 無効化フラグ */
  disabled?: boolean
  /** プレースホルダー */
  placeholder?: string
}

/** 確認ダイアログの種類 */
type ConfirmDialogType = 'add' | 'remove' | null

/**
 * TagInput コンポーネント
 * タグの入力・選択・削除を行うUI
 */
export function TagInput({
  existingTags,
  selectedTags,
  onChange,
  disabled = false,
  placeholder = 'タグを入力...',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // 確認ダイアログの状態
  const [confirmDialog, setConfirmDialog] = useState<{
    type: ConfirmDialogType
    tagName: string
  } | null>(null)

  // サジェストリストをフィルタリング
  const suggestions = useMemo(() => {
    if (!inputValue.trim()) {
      // 入力がない場合は未選択のタグを表示
      return existingTags.filter((tag) => !selectedTags.includes(tag)).slice(0, 10)
    }

    const normalizedInput = inputValue.toLowerCase().trim()
    return existingTags
      .filter((tag) => tag.toLowerCase().includes(normalizedInput) && !selectedTags.includes(tag))
      .slice(0, 10)
  }, [existingTags, selectedTags, inputValue])

  // サジェストを表示するかどうか
  const showSuggestions = isFocused && suggestions.length > 0 && !confirmDialog

  // 追加ボタンが有効かどうか
  const canAddTag = inputValue.trim() && !selectedTags.includes(inputValue.trim())

  // タグ追加の確認ダイアログを表示
  const handleRequestAddTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim()
      if (!trimmedTag) return
      if (selectedTags.includes(trimmedTag)) return

      setConfirmDialog({ type: 'add', tagName: trimmedTag })
      setHighlightedIndex(-1)
    },
    [selectedTags]
  )

  // タグ削除の確認ダイアログを表示
  const handleRequestRemoveTag = useCallback((tagToRemove: string) => {
    setConfirmDialog({ type: 'remove', tagName: tagToRemove })
  }, [])

  // 確認ダイアログでOKを押した時
  const handleConfirm = useCallback(() => {
    if (!confirmDialog) return

    if (confirmDialog.type === 'add') {
      onChange([...selectedTags, confirmDialog.tagName])
      setInputValue('')
    } else if (confirmDialog.type === 'remove') {
      onChange(selectedTags.filter((tag) => tag !== confirmDialog.tagName))
    }

    setConfirmDialog(null)
    inputRef.current?.focus()
  }, [confirmDialog, selectedTags, onChange])

  // 確認ダイアログでキャンセルを押した時
  const handleCancel = useCallback(() => {
    setConfirmDialog(null)
    inputRef.current?.focus()
  }, [])

  // 入力変更ハンドラ
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])

  // 追加ボタンクリックハンドラ
  const handleAddButtonClick = useCallback(() => {
    if (canAddTag) {
      handleRequestAddTag(inputValue)
    }
  }, [canAddTag, inputValue, handleRequestAddTag])

  // キーボードイベントハンドラ
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          // サジェストから選択 → 入力欄に入力
          setInputValue(suggestions[highlightedIndex])
          setHighlightedIndex(-1)
          setIsFocused(false)
        } else if (inputValue.trim()) {
          // 追加ボタンと同じ動作
          handleRequestAddTag(inputValue)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Escape') {
        setIsFocused(false)
        inputRef.current?.blur()
      }
    },
    [inputValue, suggestions, highlightedIndex, handleRequestAddTag]
  )

  // フォーカスハンドラ
  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  // ブラーハンドラ
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // サジェストリスト内のクリックの場合はフォーカスを維持
    if (suggestionsRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    setIsFocused(false)
  }, [])

  // サジェストクリックハンドラ - 入力欄に入力するだけ
  const handleSuggestionClick = useCallback((tag: string) => {
    setInputValue(tag)
    setIsFocused(false)
    setHighlightedIndex(-1)
  }, [])

  // サジェストのmousedown/touchstartでフォーカスが外れるのを防ぐ
  const handleSuggestionPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
  }, [])

  // コンテナクリックでインプットにフォーカス
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="tag-input">
      {/* タグ追加領域（上部に配置） */}
      <div className="tag-input__add-section">
        <p className="tag-input__add-label">タグを追加</p>
        <div className="tag-input__add-row">
          <div
            className={`tag-input__container ${isFocused ? 'tag-input__container--focused' : ''} ${disabled ? 'tag-input__container--disabled' : ''}`}
            onClick={handleContainerClick}
          >
            <input
              ref={inputRef}
              type="text"
              className="tag-input__input"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              aria-label="タグを入力"
            />
          </div>
          <button
            type="button"
            className={`tag-input__add-button ${canAddTag ? '' : 'tag-input__add-button--disabled'}`}
            onClick={handleAddButtonClick}
            disabled={disabled || !canAddTag}
          >
            追加
          </button>
        </div>

        {/* サジェストリスト */}
        {showSuggestions && (
          <div ref={suggestionsRef} className="tag-input__suggestions" role="listbox">
            {suggestions.map((tag, index) => (
              <button
                key={tag}
                type="button"
                className={`tag-input__suggestion ${index === highlightedIndex ? 'tag-input__suggestion--highlighted' : ''}`}
                onClick={() => handleSuggestionClick(tag)}
                onMouseDown={handleSuggestionPointerDown}
                onTouchStart={handleSuggestionPointerDown}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* ヒント */}
        <p className="tag-input__hint">
          サジェストから選択、またはEnterで入力確定後「追加」ボタンを押してください
        </p>
      </div>

      {/* 登録済みタグの表示領域（下部に配置、スクロール可能） */}
      {selectedTags.length > 0 && (
        <div className="tag-input__registered">
          <p className="tag-input__registered-label">登録済みタグ ({selectedTags.length}件)</p>
          <div className="tag-input__registered-tags">
            {selectedTags.map((tag) => (
              <span key={tag} className="tag-input__tag">
                <span className="tag-input__tag-text">#{tag}</span>
                {!disabled && (
                  <button
                    type="button"
                    className="tag-input__tag-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRequestRemoveTag(tag)
                    }}
                    aria-label={`${tag}を削除`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 確認ダイアログ */}
      {confirmDialog && (
        <div className="tag-input__confirm-backdrop" onClick={handleCancel}>
          <div
            className="tag-input__confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <p className="tag-input__confirm-message">
              {confirmDialog.type === 'add'
                ? `「${confirmDialog.tagName}」を追加しますか？`
                : `「${confirmDialog.tagName}」を削除しますか？`}
            </p>
            <div className="tag-input__confirm-buttons">
              <button type="button" className="tag-input__confirm-cancel" onClick={handleCancel}>
                キャンセル
              </button>
              <button
                type="button"
                className={`tag-input__confirm-ok ${confirmDialog.type === 'remove' ? 'tag-input__confirm-ok--danger' : ''}`}
                onClick={handleConfirm}
              >
                {confirmDialog.type === 'add' ? '追加' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TagInput
