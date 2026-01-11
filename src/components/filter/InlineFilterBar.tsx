/**
 * インラインフィルタバーコンポーネント
 * Music Bubble Explorer V2
 *
 * TOP画面内でタップで切り替え可能なフィルタUI
 */

import type { ArtistFilterValue, CategoryFilterValue } from '../../types'
import { CATEGORY_OPTIONS } from '../../services/filterService'
import './InlineFilterBar.css'

interface InlineFilterBarProps {
  /** アーティストフィルタの値 */
  artistFilter: ArtistFilterValue
  /** アーティストフィルタ変更時のコールバック */
  onArtistFilterChange: (value: ArtistFilterValue) => void
  /** 選択中のカテゴリ（複数） */
  selectedCategories: CategoryFilterValue[]
  /** カテゴリトグル時のコールバック */
  onCategoryToggle: (category: CategoryFilterValue) => void
}

// アーティストフィルタオプション
const ARTIST_OPTIONS: { value: ArtistFilterValue; label: string }[] = [
  { value: '栗林みな実', label: '栗林みな実' },
  { value: 'Minami', label: 'Minami' },
  { value: 'wild3', label: 'ワイルド三人娘' },
  { value: 'other', label: 'その他' },
]

export function InlineFilterBar({
  artistFilter,
  onArtistFilterChange,
  selectedCategories,
  onCategoryToggle,
}: InlineFilterBarProps) {
  const handleArtistClick = (value: ArtistFilterValue) => {
    // 同じ値をクリックしたら解除
    if (artistFilter === value) {
      onArtistFilterChange(null)
    } else {
      onArtistFilterChange(value)
    }
  }

  return (
    <div className="inline-filter-bar">
      {/* 第1フィルタ: アーティスト */}
      <div className="inline-filter-bar__section">
        <div className="inline-filter-bar__chips">
          {ARTIST_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`inline-filter-bar__chip ${artistFilter === option.value ? 'inline-filter-bar__chip--selected' : ''}`}
              onClick={() => handleArtistClick(option.value)}
              aria-pressed={artistFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 区切り線 */}
      <div className="inline-filter-bar__divider" />

      {/* 第2フィルタ: カテゴリ（複数選択可能） */}
      <div className="inline-filter-bar__section">
        <div className="inline-filter-bar__chips">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`inline-filter-bar__chip inline-filter-bar__chip--category ${selectedCategories.includes(option.value) ? 'inline-filter-bar__chip--selected' : ''}`}
              onClick={() => onCategoryToggle(option.value)}
              aria-pressed={selectedCategories.includes(option.value)}
            >
              <span className="inline-filter-bar__chip-icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="inline-filter-bar__chip-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default InlineFilterBar
