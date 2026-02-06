/**
 * SetlistEditor コンポーネント
 * セトリの編集コンポーネント
 *
 * Requirements:
 * - 6.4: 既存楽曲からの選択機能（オートコンプリート）
 * - 6.5: フリー入力での楽曲追加
 * - 6.6: ドラッグ＆ドロップまたは上下ボタンで楽曲の順序を変更
 * - 6.7: 日替わり曲としてマークすることを許可
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import type { Song } from '../../types'
import './SetlistEditor.css'

/**
 * セトリ項目のフォームデータ
 */
export interface SetlistItemFormData {
  /** 楽曲ID（既存楽曲の場合） */
  songId?: string
  /** 楽曲名 */
  songTitle: string
  /** 日替わり曲フラグ */
  isDailySong: boolean
}

export interface SetlistEditorProps {
  /** セトリ項目の配列 */
  items: SetlistItemFormData[]
  /** 楽曲データの配列（オートコンプリート用） */
  songs: Song[]
  /** 変更時のコールバック */
  onChange: (items: SetlistItemFormData[]) => void
  /** 無効化フラグ */
  disabled?: boolean
}

/**
 * SetlistEditor コンポーネント
 * セトリの追加・削除・並び替え・日替わり曲設定を行うUI
 */
export function SetlistEditor({ items, songs, onChange, disabled = false }: SetlistEditorProps) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // 編集モードの状態（編集中の項目インデックス、-1は編集なし）
  const [editingIndex, setEditingIndex] = useState(-1)
  const [editValue, setEditValue] = useState('')
  const [editHighlightedIndex, setEditHighlightedIndex] = useState(-1)
  const [isEditFocused, setIsEditFocused] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  const editSuggestionsRef = useRef<HTMLDivElement>(null)

  // サジェストリストをフィルタリング
  const suggestions = useMemo(() => {
    // 入力がない場合はサジェストを表示しない
    if (!inputValue.trim()) {
      return []
    }

    const normalizedInput = inputValue.toLowerCase().trim()
    return songs.filter((song) => song.title.toLowerCase().includes(normalizedInput)).slice(0, 10)
  }, [songs, inputValue])

  // 編集用サジェストリストをフィルタリング
  const editSuggestions = useMemo(() => {
    if (!editValue.trim()) {
      return []
    }

    const normalizedInput = editValue.toLowerCase().trim()
    return songs.filter((song) => song.title.toLowerCase().includes(normalizedInput)).slice(0, 10)
  }, [songs, editValue])

  // サジェストを表示するかどうか（入力があり、マッチする楽曲がある場合のみ）
  const showSuggestions = isFocused && inputValue.trim().length > 0 && suggestions.length > 0

  // 追加ボタンが有効かどうか
  const canAddItem = inputValue.trim().length > 0

  /**
   * セトリ項目を追加
   */
  const handleAddItem = useCallback(
    (songTitle: string, songId?: string) => {
      const trimmedTitle = songTitle.trim()
      if (!trimmedTitle) return

      const newItem: SetlistItemFormData = {
        songId,
        songTitle: trimmedTitle,
        isDailySong: false,
      }

      onChange([...items, newItem])
      setInputValue('')
      setHighlightedIndex(-1)
      inputRef.current?.focus()
    },
    [items, onChange]
  )

  /**
   * セトリ項目を削除
   */
  const handleRemoveItem = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index)
      onChange(newItems)
    },
    [items, onChange]
  )

  /**
   * セトリ項目を上に移動
   */
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      const newItems = [...items]
      ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
      onChange(newItems)
    },
    [items, onChange]
  )

  /**
   * セトリ項目を下に移動
   */
  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= items.length - 1) return
      const newItems = [...items]
      ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
      onChange(newItems)
    },
    [items, onChange]
  )

  /**
   * 日替わり曲フラグを切り替え
   */
  const handleToggleDailySong = useCallback(
    (index: number) => {
      const newItems = items.map((item, i) =>
        i === index ? { ...item, isDailySong: !item.isDailySong } : item
      )
      onChange(newItems)
    },
    [items, onChange]
  )

  /**
   * 編集モードを開始
   */
  const handleStartEdit = useCallback((index: number) => {
    setEditingIndex(index)
    setEditValue(items[index].songTitle)
    setEditHighlightedIndex(-1)
    setIsEditFocused(true)
    // 次のレンダリング後にフォーカス
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }, [items])

  /**
   * 編集をキャンセル
   */
  const handleCancelEdit = useCallback(() => {
    setEditingIndex(-1)
    setEditValue('')
    setEditHighlightedIndex(-1)
    setIsEditFocused(false)
  }, [])

  /**
   * 編集を確定
   */
  const handleConfirmEdit = useCallback(() => {
    if (editingIndex < 0 || !editValue.trim()) {
      handleCancelEdit()
      return
    }

    const trimmedValue = editValue.trim()
    const matchingSong = songs.find(
      (song) => song.title.toLowerCase() === trimmedValue.toLowerCase()
    )

    const newItems = items.map((item, i) =>
      i === editingIndex
        ? { ...item, songTitle: trimmedValue, songId: matchingSong?.id }
        : item
    )
    onChange(newItems)
    handleCancelEdit()
  }, [editingIndex, editValue, items, songs, onChange, handleCancelEdit])

  /**
   * 編集入力変更ハンドラ
   */
  const handleEditInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
    setEditHighlightedIndex(-1)
  }, [])

  /**
   * 編集キーボードイベントハンドラ
   */
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (editHighlightedIndex >= 0 && editHighlightedIndex < editSuggestions.length) {
          // サジェストから選択
          setEditValue(editSuggestions[editHighlightedIndex].title)
          setEditHighlightedIndex(-1)
          setIsEditFocused(false)
        } else {
          // 確定
          handleConfirmEdit()
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setEditHighlightedIndex((prev) => (prev < editSuggestions.length - 1 ? prev + 1 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setEditHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [editSuggestions, editHighlightedIndex, handleConfirmEdit, handleCancelEdit]
  )

  /**
   * 編集フォーカスハンドラ
   */
  const handleEditFocus = useCallback(() => {
    setIsEditFocused(true)
  }, [])

  /**
   * 編集ブラーハンドラ
   */
  const handleEditBlur = useCallback((e: React.FocusEvent) => {
    // サジェストリスト内のクリックの場合はフォーカスを維持
    if (editSuggestionsRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    // 少し遅延させて確定（ボタンクリックを許可）
    setTimeout(() => {
      if (editingIndex >= 0) {
        handleConfirmEdit()
      }
    }, 150)
  }, [editingIndex, handleConfirmEdit])

  /**
   * 編集サジェストクリックハンドラ
   * サジェストから選択した場合は直接その値で確定する
   */
  const handleEditSuggestionClick = useCallback((song: Song) => {
    if (editingIndex < 0) return

    const newItems = items.map((item, i) =>
      i === editingIndex
        ? { ...item, songTitle: song.title, songId: song.id }
        : item
    )
    onChange(newItems)
    
    // 編集モードを終了
    setEditingIndex(-1)
    setEditValue('')
    setEditHighlightedIndex(-1)
    setIsEditFocused(false)
  }, [editingIndex, items, onChange])

  /**
   * 入力変更ハンドラ
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setHighlightedIndex(-1)
  }, [])

  /**
   * 追加ボタンクリックハンドラ
   */
  const handleAddButtonClick = useCallback(() => {
    if (canAddItem) {
      // 入力値と一致する楽曲があればそのIDを使用
      const matchingSong = songs.find(
        (song) => song.title.toLowerCase() === inputValue.trim().toLowerCase()
      )
      handleAddItem(inputValue, matchingSong?.id)
    }
  }, [canAddItem, inputValue, songs, handleAddItem])

  /**
   * キーボードイベントハンドラ
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          // サジェストから選択 → 入力欄に入力（フォーカスは維持）
          setInputValue(suggestions[highlightedIndex].title)
          setHighlightedIndex(-1)
        } else if (inputValue.trim()) {
          // フリー入力で追加
          const matchingSong = songs.find(
            (song) => song.title.toLowerCase() === inputValue.trim().toLowerCase()
          )
          handleAddItem(inputValue, matchingSong?.id)
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
    [inputValue, suggestions, highlightedIndex, songs, handleAddItem]
  )

  /**
   * フォーカスハンドラ
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  /**
   * ブラーハンドラ
   */
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // サジェストリスト内のクリックの場合はフォーカスを維持
    if (suggestionsRef.current?.contains(e.relatedTarget as Node)) {
      return
    }
    setIsFocused(false)
  }, [])

  /**
   * サジェストクリックハンドラ - 入力欄に入力するだけ
   */
  const handleSuggestionClick = useCallback((song: Song) => {
    setInputValue(song.title)
    setIsFocused(false)
    setHighlightedIndex(-1)
  }, [])

  /**
   * サジェストのmousedown/touchstartでフォーカスが外れるのを防ぐ
   */
  const handleSuggestionPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
  }, [])

  /**
   * コンテナクリックでインプットにフォーカス
   */
  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="setlist-editor">
      {/* 楽曲追加領域 */}
      <div className="setlist-editor__add-section">
        <p className="setlist-editor__add-label">楽曲を追加</p>
        <div className="setlist-editor__add-row">
          <div
            className={`setlist-editor__input-container ${isFocused ? 'setlist-editor__input-container--focused' : ''} ${disabled ? 'setlist-editor__input-container--disabled' : ''}`}
            onClick={handleContainerClick}
          >
            <input
              ref={inputRef}
              type="text"
              className="setlist-editor__input"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="楽曲名を入力..."
              disabled={disabled}
              autoComplete="off"
              aria-label="楽曲名を入力"
            />
          </div>
          <button
            type="button"
            className={`setlist-editor__add-button ${canAddItem ? '' : 'setlist-editor__add-button--disabled'}`}
            onClick={handleAddButtonClick}
            disabled={disabled || !canAddItem}
          >
            追加
          </button>
        </div>

        {/* サジェストリスト */}
        {showSuggestions && (
          <div ref={suggestionsRef} className="setlist-editor__suggestions" role="listbox">
            {suggestions.map((song, index) => (
              <button
                key={song.id}
                type="button"
                className={`setlist-editor__suggestion ${index === highlightedIndex ? 'setlist-editor__suggestion--highlighted' : ''}`}
                onClick={() => handleSuggestionClick(song)}
                onMouseDown={handleSuggestionPointerDown}
                onTouchStart={handleSuggestionPointerDown}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                <span className="setlist-editor__suggestion-title">{song.title}</span>
                {song.artists && song.artists.length > 0 && (
                  <span className="setlist-editor__suggestion-artist">
                    {song.artists.join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="setlist-editor__hint">サジェストから選択、またはEnterで入力確定後「追加」ボタンを押してください</p>
      </div>

      {/* セトリ一覧 */}
      {items.length > 0 && (
        <div className="setlist-editor__list-section">
          <p className="setlist-editor__list-label">セトリ ({items.length}曲)</p>
          <ol className="setlist-editor__list">
            {items.map((item, index) => (
              <li key={`${index}-${item.songTitle}`} className="setlist-editor__item">
                {/* 順序番号 */}
                <span className="setlist-editor__order">{index + 1}</span>

                {/* 楽曲情報 */}
                <div className="setlist-editor__item-content">
                  {editingIndex === index ? (
                    // 編集モード
                    <div className="setlist-editor__edit-container">
                      <input
                        ref={editInputRef}
                        type="text"
                        className="setlist-editor__edit-input"
                        value={editValue}
                        onChange={handleEditInputChange}
                        onKeyDown={handleEditKeyDown}
                        onFocus={handleEditFocus}
                        onBlur={handleEditBlur}
                        placeholder="楽曲名を入力..."
                        autoComplete="off"
                      />
                      {/* 編集用サジェストリスト */}
                      {isEditFocused && editValue.trim().length > 0 && editSuggestions.length > 0 && (
                        <div ref={editSuggestionsRef} className="setlist-editor__edit-suggestions" role="listbox">
                          {editSuggestions.map((song, sIndex) => (
                            <button
                              key={song.id}
                              type="button"
                              className={`setlist-editor__suggestion ${sIndex === editHighlightedIndex ? 'setlist-editor__suggestion--highlighted' : ''}`}
                              onClick={() => handleEditSuggestionClick(song)}
                              onMouseDown={handleSuggestionPointerDown}
                              onTouchStart={handleSuggestionPointerDown}
                              onMouseEnter={() => setEditHighlightedIndex(sIndex)}
                              role="option"
                              aria-selected={sIndex === editHighlightedIndex}
                            >
                              <span className="setlist-editor__suggestion-title">{song.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 表示モード
                    <button
                      type="button"
                      className="setlist-editor__item-title-button"
                      onClick={() => !disabled && handleStartEdit(index)}
                      disabled={disabled}
                      title="クリックして編集"
                    >
                      {item.songTitle}
                    </button>
                  )}
                </div>

                {/* アクションボタン */}
                {!disabled && editingIndex !== index && (
                  <div className="setlist-editor__item-actions">
                    {/* 日替わり曲トグルチップ */}
                    <button
                      type="button"
                      className={`setlist-editor__daily-chip ${item.isDailySong ? 'setlist-editor__daily-chip--active' : ''}`}
                      onClick={() => handleToggleDailySong(index)}
                      title={item.isDailySong ? '日替わり曲を解除' : '日替わり曲に設定'}
                      aria-label={item.isDailySong ? '日替わり曲を解除' : '日替わり曲に設定'}
                      aria-pressed={item.isDailySong}
                    >
                      日替
                    </button>

                    {/* 上に移動 */}
                    <button
                      type="button"
                      className="setlist-editor__action-button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="上に移動"
                      aria-label="上に移動"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </button>

                    {/* 下に移動 */}
                    <button
                      type="button"
                      className="setlist-editor__action-button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === items.length - 1}
                      title="下に移動"
                      aria-label="下に移動"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* 削除 */}
                    <button
                      type="button"
                      className="setlist-editor__action-button setlist-editor__action-button--delete"
                      onClick={() => handleRemoveItem(index)}
                      title="削除"
                      aria-label="削除"
                    >
                      <svg
                        width="16"
                        height="16"
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
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 空の状態 */}
      {items.length === 0 && (
        <div className="setlist-editor__empty">
          <p className="setlist-editor__empty-message">セトリに楽曲が追加されていません</p>
        </div>
      )}
    </div>
  )
}

export default SetlistEditor
