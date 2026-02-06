/**
 * TagList コンポーネント
 * タグ一覧表示と検索・ソート機能
 *
 * Requirements:
 * - 6.1: 全てのユニークなタグを表示すること
 * - 6.2: タグ名でフィルタリングする検索機能を提供すること
 * - 6.6: デフォルトでタグをアルファベット順にソートし、楽曲数でのソートオプションも提供すること
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Tag, Song } from '../../types'
import { filterAndSortTags } from '../../services/tagService'
import type { TagSortOrder } from '../../services/tagService'
import { TagCard } from './TagCard'
import './TagList.css'

export interface TagListProps {
  /** タグデータ配列 */
  tags: Tag[]
  /** 楽曲データ配列（楽曲名表示用） */
  songs?: Song[]
  /** タグクリック時のコールバック */
  onTagClick: (tagId: string) => void
  /** 空の場合のメッセージ */
  emptyMessage?: string
  /** 初期検索クエリ */
  initialQuery?: string
  /** 初期ソート順（デフォルト: 更新順） */
  initialSortBy?: TagSortOrder
  /** 初期コンパクト表示フラグ */
  initialCompact?: boolean
  /** 検索状態変更時のコールバック */
  onSearchStateChange?: (query: string, sortBy: TagSortOrder, compact: boolean) => void
}

/**
 * TagList コンポーネント
 * タグ一覧を検索・ソート機能付きで表示
 */
export function TagList({
  tags,
  songs = [],
  onTagClick,
  emptyMessage = 'タグが見つかりません',
  initialQuery = '',
  initialSortBy = 'recentlyUpdated',
  initialCompact = false,
  onSearchStateChange,
}: TagListProps) {
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<TagSortOrder>(initialSortBy)
  const [isCompactView, setIsCompactView] = useState(initialCompact)

  // 検索状態が変更されたら親に通知
  useEffect(() => {
    onSearchStateChange?.(query, sortBy, isCompactView)
  }, [query, sortBy, isCompactView, onSearchStateChange])

  // 検索・ソート結果をメモ化
  const filteredAndSortedTags = useMemo(() => {
    return filterAndSortTags(tags, { query, sortOrder: sortBy })
  }, [tags, query, sortBy])

  // 楽曲IDから楽曲名へのマップを作成
  const songNameMap = useMemo(() => {
    const map = new Map<string, string>()
    songs.forEach((song) => {
      map.set(song.id, song.title)
    })
    return map
  }, [songs])

  // タグIDから楽曲名配列を取得する関数
  const getSongNamesForTag = useCallback(
    (tag: Tag): string[] => {
      return tag.songIds
        .map((songId) => songNameMap.get(songId))
        .filter((name): name is string => name !== undefined)
    },
    [songNameMap]
  )

  // 検索クエリの変更ハンドラ
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  // 検索クリアハンドラ
  const handleClearQuery = useCallback(() => {
    setQuery('')
  }, [])

  // ソートの変更
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as TagSortOrder)
  }, [])

  // 表示モードの切り替え
  const handleToggleCompactView = useCallback(() => {
    setIsCompactView((prev) => !prev)
  }, [])

  return (
    <div className="tag-list">
      {/* 検索バー */}
      <div className="tag-list__search">
        {/* 検索入力行（検索バー + 統計） */}
        <div className="tag-list__search-row">
          <div className="tag-list__search-input-wrapper">
            <svg
              className="tag-list__search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="tag-list__search-input"
              placeholder="タグ名で検索..."
              value={query}
              onChange={handleQueryChange}
              aria-label="タグを検索"
            />
            {query && (
              <button
                type="button"
                className="tag-list__search-clear"
                onClick={handleClearQuery}
                aria-label="検索をクリア"
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
            )}
          </div>
          <span className="tag-list__search-count">
            {filteredAndSortedTags.length}/{tags.length}件
          </span>
        </div>

        {/* ソートと表示切替 */}
        <div className="tag-list__controls">
          <div className="tag-list__control-group">
            <svg
              className="tag-list__control-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            <select
              className="tag-list__sort-select"
              value={sortBy}
              onChange={handleSortChange}
              aria-label="並び替え"
            >
              <option value="alphabetical">五十音順</option>
              <option value="songCount">楽曲数順</option>
              <option value="recentlyUpdated">更新順</option>
            </select>
          </div>
          <button
            type="button"
            className={`tag-list__view-toggle ${isCompactView ? 'tag-list__view-toggle--active' : ''}`}
            onClick={handleToggleCompactView}
            aria-label={isCompactView ? '詳細表示に切り替え' : '簡易表示に切り替え'}
            title={isCompactView ? '詳細表示' : '簡易表示'}
          >
            {isCompactView ? '☰' : 'ALL'}
          </button>
        </div>
      </div>

      {/* タグリスト */}
      <div className="tag-list__items">
        {filteredAndSortedTags.length > 0 ? (
          filteredAndSortedTags.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onClick={() => onTagClick(tag.id)}
              compact={isCompactView}
              songNames={!isCompactView ? getSongNamesForTag(tag) : undefined}
            />
          ))
        ) : (
          <div className="tag-list__empty">
            <p className="tag-list__empty-message">{emptyMessage}</p>
            {query && (
              <button type="button" className="tag-list__empty-clear" onClick={handleClearQuery}>
                検索をクリア
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TagList
