/**
 * ジャンルフィルタコンポーネント
 * Music Bubble Explorer V2
 *
 * Requirements:
 * - 4.1: 第2フィルタとして機能するジャンルフィルタセレクタを表示
 * - 4.2: アーティストフィルタがアクティブな時、そのアーティストの楽曲で利用可能なジャンルのみを表示
 * - 4.3: ジャンル選択時は両方のフィルタに一致する楽曲のみを表示
 * - 4.4: ジャンル未選択時はアーティストフィルタに一致する全ての楽曲を表示
 * - 4.5: アーティストフィルタ変更時はジャンルオプションを動的に更新
 */

import './GenreFilter.css'

interface GenreFilterProps {
  /** 利用可能なジャンル（アーティストフィルタ適用後） */
  genres: string[]
  /** 選択中のジャンル */
  selectedGenres: string[]
  /** ジャンル選択変更時のコールバック */
  onChange: (genres: string[]) => void
}

export function GenreFilter({
  genres,
  selectedGenres,
  onChange,
}: GenreFilterProps) {
  const handleGenreClick = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      // 選択解除
      onChange(selectedGenres.filter((g) => g !== genre))
    } else {
      // 選択追加
      onChange([...selectedGenres, genre])
    }
  }

  const handleClearClick = () => {
    onChange([])
  }

  const handleBadgeRemove = (genre: string) => {
    onChange(selectedGenres.filter((g) => g !== genre))
  }

  // ジャンルがない場合
  if (genres.length === 0) {
    return (
      <div className="genre-filter">
        <span className="genre-filter__label">ジャンル / タグ</span>
        <p className="genre-filter__empty">利用可能なジャンルがありません</p>
      </div>
    )
  }

  return (
    <div className="genre-filter">
      <span className="genre-filter__label">
        ジャンル / タグ
        {selectedGenres.length > 0 && (
          <span className="genre-filter__count">
            ({selectedGenres.length}件選択中)
          </span>
        )}
      </span>

      {/* 選択中のジャンルバッジ */}
      {selectedGenres.length > 0 && (
        <div className="genre-filter__selected-badges">
          {selectedGenres.map((genre) => (
            <span key={genre} className="genre-filter__badge">
              {genre}
              <button
                type="button"
                className="genre-filter__badge-remove"
                onClick={() => handleBadgeRemove(genre)}
                aria-label={`${genre}を解除`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="genre-filter__options">
        <button
          type="button"
          className={`genre-filter__clear ${selectedGenres.length === 0 ? 'genre-filter__clear--active' : ''}`}
          onClick={handleClearClick}
          aria-pressed={selectedGenres.length === 0}
        >
          すべて
        </button>
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            className={`genre-filter__option ${selectedGenres.includes(genre) ? 'genre-filter__option--selected' : ''}`}
            onClick={() => handleGenreClick(genre)}
            aria-pressed={selectedGenres.includes(genre)}
          >
            {genre}
          </button>
        ))}
      </div>
    </div>
  )
}

export default GenreFilter
