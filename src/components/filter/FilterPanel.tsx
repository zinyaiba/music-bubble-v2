/**
 * フィルタパネルコンポーネント
 * Music Bubble Explorer V2
 *
 * アーティストフィルタとカテゴリフィルタを統合したパネル
 *
 * Requirements:
 * - 3.1-3.6: アーティストフィルタ機能
 * - 4.1-4.5: カテゴリフィルタ機能（楽曲・作詞・作曲・編曲・タグ）複数選択可能
 */

import { useState } from 'react'
import type { ArtistFilterValue, CategoryFilterValue } from '../../types'
import { ArtistFilter } from './ArtistFilter'
import { CategoryFilter } from './CategoryFilter'
import { GenreFilter } from './GenreFilter'
import './FilterPanel.css'

interface FilterPanelProps {
  /** アーティストフィルタの値 */
  artistFilter: ArtistFilterValue
  /** アーティストフィルタ変更時のコールバック */
  onArtistFilterChange: (value: ArtistFilterValue) => void
  /** 選択中のカテゴリ（複数） */
  selectedCategories: CategoryFilterValue[]
  /** カテゴリフィルタ変更時のコールバック */
  onCategoryFilterChange: (categories: CategoryFilterValue[]) => void
  /** 利用可能なジャンル */
  availableGenres: string[]
  /** 選択中のジャンル */
  selectedGenres: string[]
  /** ジャンルフィルタ変更時のコールバック */
  onGenreFilterChange: (genres: string[]) => void
  /** フィルタリセット時のコールバック */
  onReset: () => void
  /** フィルタがアクティブかどうか */
  isFilterActive: boolean
  /** フィルタリング後の楽曲数 */
  filteredCount?: number
  /** 全楽曲数 */
  totalCount?: number
  /** コンパクトモード */
  compact?: boolean
  /** 折りたたみ可能 */
  collapsible?: boolean
  /** 初期状態で展開するか */
  defaultExpanded?: boolean
}

export function FilterPanel({
  artistFilter,
  onArtistFilterChange,
  selectedCategories,
  onCategoryFilterChange,
  availableGenres,
  selectedGenres,
  onGenreFilterChange,
  onReset,
  isFilterActive,
  filteredCount,
  totalCount,
  compact = false,
  collapsible = false,
  defaultExpanded = true,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
  }

  const panelClassName = `filter-panel ${compact ? 'filter-panel--compact' : ''}`

  // タグカテゴリが選択されている場合のみジャンルフィルタを表示
  const showGenreFilter = selectedCategories.includes('tag')

  const renderContent = () => (
    <div
      className={`filter-panel__content ${!isExpanded && collapsible ? 'filter-panel__content--collapsed' : ''}`}
    >
      <div className="filter-panel__section">
        <ArtistFilter value={artistFilter} onChange={onArtistFilterChange} />
      </div>

      <div className="filter-panel__divider" />

      <div className="filter-panel__section">
        <CategoryFilter selectedCategories={selectedCategories} onChange={onCategoryFilterChange} />
      </div>

      {/* タグカテゴリ選択時のみジャンルフィルタを表示 */}
      {showGenreFilter && (
        <>
          <div className="filter-panel__divider" />
          <div className="filter-panel__section">
            <GenreFilter
              genres={availableGenres}
              selectedGenres={selectedGenres}
              onChange={onGenreFilterChange}
            />
          </div>
        </>
      )}

      {/* フィルタ結果表示 */}
      {filteredCount !== undefined && totalCount !== undefined && (
        <>
          <div className="filter-panel__divider" />
          <div className="filter-panel__result">
            <span>
              <span className="filter-panel__result-count">{filteredCount}</span>
              {' / '}
              {totalCount} 曲
            </span>
            {isFilterActive && (
              <span>フィルタ適用中</span>
            )}
          </div>
        </>
      )}
    </div>
  )

  if (collapsible) {
    return (
      <div className={panelClassName}>
        <button
          type="button"
          className="filter-panel__toggle"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          <span>フィルタ</span>
          <span
            className={`filter-panel__toggle-icon ${isExpanded ? 'filter-panel__toggle-icon--expanded' : ''}`}
          >
            ▼
          </span>
        </button>
        {renderContent()}
      </div>
    )
  }

  return (
    <div className={panelClassName}>
      <div className="filter-panel__header">
        <h3 className="filter-panel__title">フィルタ</h3>
        <button
          type="button"
          className="filter-panel__reset"
          onClick={onReset}
          disabled={!isFilterActive}
        >
          リセット
        </button>
      </div>
      {renderContent()}
    </div>
  )
}

export default FilterPanel
