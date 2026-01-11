/**
 * アーティストフィルタコンポーネント
 * Music Bubble Explorer V2
 *
 * Requirements:
 * - 3.1: TOPページにアーティストフィルタセレクタを表示
 * - 3.2: 固定の3種類のアーティストフィルタオプションを提供（栗林みな実/Minami/それ以外）
 * - 3.3: 「栗林みな実」選択時は該当楽曲のみ表示
 * - 3.4: 「Minami」選択時は該当楽曲のみ表示
 * - 3.5: 「それ以外」選択時は栗林みな実/Minami以外の楽曲を表示
 * - 3.6: 未選択時は全アーティストを表示
 */

import type { ArtistFilterValue } from '../../types'
import './ArtistFilter.css'

interface ArtistFilterProps {
  value: ArtistFilterValue
  onChange: (value: ArtistFilterValue) => void
}

// 固定の4種類のアーティストフィルタオプション
const ARTIST_OPTIONS: { value: ArtistFilterValue; label: string }[] = [
  { value: '栗林みな実', label: '栗林みな実' },
  { value: 'Minami', label: 'Minami' },
  { value: 'wild3', label: 'ワイルド三人娘' },
  { value: 'other', label: 'それ以外' },
]

export function ArtistFilter({ value, onChange }: ArtistFilterProps) {
  const handleOptionClick = (optionValue: ArtistFilterValue) => {
    // 同じオプションをクリックした場合は選択解除
    if (value === optionValue) {
      onChange(null)
    } else {
      onChange(optionValue)
    }
  }

  const handleClearClick = () => {
    onChange(null)
  }

  return (
    <div className="artist-filter">
      <span className="artist-filter__label">アーティスト</span>
      <div className="artist-filter__options">
        <button
          type="button"
          className={`artist-filter__clear ${value === null ? 'artist-filter__clear--active' : ''}`}
          onClick={handleClearClick}
          aria-pressed={value === null}
        >
          すべて
        </button>
        {ARTIST_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`artist-filter__option ${value === option.value ? 'artist-filter__option--selected' : ''}`}
            onClick={() => handleOptionClick(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ArtistFilter
