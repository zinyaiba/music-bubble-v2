/**
 * TagCard コンポーネント
 * タグ情報のコンパクト表示
 *
 * Requirements:
 * - 6.4: 各タグの楽曲数を表示すること
 */

import type { Tag } from '../../types'
import './TagCard.css'

export interface TagCardProps {
  /** タグデータ */
  tag: Tag
  /** クリック時のコールバック */
  onClick: () => void
  /** コンパクト表示モード */
  compact?: boolean
}

/**
 * TagCard コンポーネント
 * タグ情報をカード形式でコンパクトに表示
 */
export function TagCard({ tag, onClick, compact = false }: TagCardProps) {
  return (
    <article
      className={`tag-card ${compact ? 'tag-card--compact' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`${tag.name} - ${tag.songCount}曲`}
    >
      <div className="tag-card__content">
        <div className="tag-card__icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </div>
        <div className="tag-card__info">
          <h3 className="tag-card__name">#{tag.name}</h3>
          {!compact && (
            <p className="tag-card__count">{tag.songCount}曲</p>
          )}
        </div>
      </div>

      <div className="tag-card__meta">
        {compact && (
          <span className="tag-card__count-badge">{tag.songCount}</span>
        )}
        <div className="tag-card__arrow">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </article>
  )
}

export default TagCard
