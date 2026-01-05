/**
 * カテゴリフィルタコンポーネント
 * Music Bubble Explorer V2
 *
 * 第2フィルタ: 楽曲・作詞・作曲・編曲・タグの5種類から複数選択
 */

import type { CategoryFilterValue } from '../../types'
import { CATEGORY_OPTIONS } from '../../services/filterService'
import './CategoryFilter.css'

interface CategoryFilterProps {
  selectedCategories: CategoryFilterValue[]
  onChange: (categories: CategoryFilterValue[]) => void
}

export function CategoryFilter({ selectedCategories, onChange }: CategoryFilterProps) {
  const handleOptionClick = (optionValue: CategoryFilterValue) => {
    // トグル動作
    if (selectedCategories.includes(optionValue)) {
      onChange(selectedCategories.filter(c => c !== optionValue))
    } else {
      onChange([...selectedCategories, optionValue])
    }
  }

  const handleClearClick = () => {
    onChange([])
  }

  return (
    <div className="category-filter">
      <span className="category-filter__label">カテゴリ</span>
      <div className="category-filter__options">
        <button
          type="button"
          className={`category-filter__clear ${selectedCategories.length === 0 ? 'category-filter__clear--active' : ''}`}
          onClick={handleClearClick}
          aria-pressed={selectedCategories.length === 0}
        >
          すべて
        </button>
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`category-filter__option ${selectedCategories.includes(option.value) ? 'category-filter__option--selected' : ''}`}
            onClick={() => handleOptionClick(option.value)}
            aria-pressed={selectedCategories.includes(option.value)}
          >
            <span className="category-filter__icon" aria-hidden="true">
              {option.icon}
            </span>
            <span className="category-filter__text">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CategoryFilter
