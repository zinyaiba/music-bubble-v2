import {
  useMemo,
  useReducer,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import type { PredictionSongDraft, Song } from '../../types'
import { getSongSuggestions } from '../../utils/songSuggestions'
import './SongTitleCombobox.css'

export interface SongTitleComboboxProps {
  id: string
  label: string
  value: PredictionSongDraft
  songs: readonly Song[]
  error?: string
  disabled?: boolean
  onChange: (value: PredictionSongDraft) => void
  inputRef?: (element: HTMLInputElement | null) => void
}

export interface SongTitleComboboxKeyboardState {
  isOpen: boolean
  highlightedIndex: number
}

export type SongTitleComboboxKeyboardAction =
  | { type: 'open'; optionCount: number }
  | { type: 'next'; optionCount: number }
  | { type: 'previous'; optionCount: number }
  | { type: 'close' }

// Pure keyboard contracts are intentionally exported for focused reducer tests.
// eslint-disable-next-line react-refresh/only-export-components
export const INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE: SongTitleComboboxKeyboardState = {
  isOpen: false,
  highlightedIndex: -1,
}

/** Pure keyboard-state reducer shared by the combobox event handlers and focused tests. */
// eslint-disable-next-line react-refresh/only-export-components
export function songTitleComboboxKeyboardReducer(
  state: SongTitleComboboxKeyboardState,
  action: SongTitleComboboxKeyboardAction,
): SongTitleComboboxKeyboardState {
  if (action.type === 'close') {
    return INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE
  }

  if (action.optionCount <= 0) {
    return INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE
  }

  if (action.type === 'open') {
    return { isOpen: true, highlightedIndex: -1 }
  }

  if (action.type === 'next') {
    const currentIndex = Math.min(state.highlightedIndex, action.optionCount - 1)
    return {
      isOpen: true,
      highlightedIndex: Math.min(currentIndex + 1, action.optionCount - 1),
    }
  }

  return {
    isOpen: true,
    highlightedIndex: state.highlightedIndex <= 0 ? -1 : state.highlightedIndex - 1,
  }
}

/** Controlled free-text input with optional registered-song suggestions. */
export function SongTitleCombobox({
  id,
  label,
  value,
  songs,
  error,
  disabled = false,
  onChange,
  inputRef,
}: SongTitleComboboxProps) {
  const [keyboardState, dispatchKeyboard] = useReducer(
    songTitleComboboxKeyboardReducer,
    INITIAL_SONG_TITLE_COMBOBOX_KEYBOARD_STATE,
  )
  const localInputRef = useRef<HTMLInputElement>(null)
  const suggestions = useMemo(
    () => getSongSuggestions(songs, value.songTitle),
    [songs, value.songTitle],
  )
  const listboxId = `${id}-suggestions`
  const errorId = `${id}-error`
  const isExpanded = keyboardState.isOpen && suggestions.length > 0
  const activeIndex =
    isExpanded && keyboardState.highlightedIndex >= 0 &&
    keyboardState.highlightedIndex < suggestions.length
      ? keyboardState.highlightedIndex
      : -1

  const setInputElement = (element: HTMLInputElement | null) => {
    localInputRef.current = element
    inputRef?.(element)
  }

  const selectSuggestion = (song: Song) => {
    onChange({ songTitle: song.title, registeredSongId: song.id })
    dispatchKeyboard({ type: 'close' })
    localInputRef.current?.focus()
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const songTitle = event.target.value
    onChange({ songTitle })
    dispatchKeyboard({
      type: songTitle.trim().length > 0 ? 'open' : 'close',
      optionCount: getSongSuggestions(songs, songTitle).length,
    } as SongTitleComboboxKeyboardAction)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault()
      dispatchKeyboard({ type: 'next', optionCount: suggestions.length })
      return
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault()
      dispatchKeyboard({ type: 'previous', optionCount: suggestions.length })
      return
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[activeIndex])
      return
    }

    if (event.key === 'Escape' && isExpanded) {
      event.preventDefault()
      dispatchKeyboard({ type: 'close' })
    }
  }

  const preventInputBlur = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <div className="song-title-combobox">
      <label className="song-title-combobox__label" htmlFor={id}>
        {label}
      </label>
      <div className="song-title-combobox__control">
        <input
          ref={setInputElement}
          id={id}
          className="song-title-combobox__input"
          type="text"
          value={value.songTitle}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => dispatchKeyboard({ type: 'open', optionCount: suggestions.length })}
          onBlur={() => dispatchKeyboard({ type: 'close' })}
        />
        {isExpanded && (
          <div id={listboxId} className="song-title-combobox__listbox" role="listbox">
            {suggestions.map((song, index) => (
              <button
                key={song.id}
                id={`${listboxId}-option-${index}`}
                className="song-title-combobox__option"
                data-highlighted={activeIndex === index ? 'true' : 'false'}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={activeIndex === index}
                onMouseDown={preventInputBlur}
                onMouseEnter={() => {
                  dispatchKeyboard({ type: 'close' })
                  for (let nextIndex = -1; nextIndex < index; nextIndex += 1) {
                    dispatchKeyboard({ type: 'next', optionCount: suggestions.length })
                  }
                }}
                onClick={() => selectSuggestion(song)}
              >
                {song.title}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="song-title-combobox__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
