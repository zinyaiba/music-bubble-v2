/**
 * SongList コンポーネント
 * 楽曲一覧表示と検索・並び替え機能
 *
 * Requirements:
 * - 7.1: 全ての楽曲をスクロール可能なリストで表示
 * - 7.2: タイトル、アーティスト、作詞家、作曲家、編曲家、タグで楽曲をフィルタリングする検索機能
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Song } from '../../types'
import { searchSongs } from '../../services/songSearchService'
import { sortSongs } from '../../utils/songSorting'
import type { SongSortType } from '../../utils/songSorting'
import { SongCard } from './SongCard'
import './SongList.css'

export interface SongListProps {
  /** 楽曲データ配列 */
  songs: Song[]
  /** 楽曲クリック時のコールバック */
  onSongClick: (songId: string) => void
  /** 空の場合のメッセージ */
  emptyMessage?: string
  /** 初期検索クエリ */
  initialQuery?: string
  /** 初期タイトルのみ検索フラグ */
  initialTitleOnly?: boolean
  /** 初期並び替え */
  initialSortBy?: SongSortType
  /** 初期コンパクト表示フラグ */
  initialCompact?: boolean
  /** 検索状態変更時のコールバック */
  onSearchStateChange?: (query: string, titleOnly: boolean, sortBy: SongSortType, compact: boolean) => void
}

/**
 * SongList コンポーネント
 * 楽曲一覧を検索・並び替え機能付きで表示
 */
export function SongList({
  songs,
  onSongClick,
  emptyMessage = '楽曲が見つかりません',
  initialQuery = '',
  initialTitleOnly = false,
  initialSortBy = 'newest',
  initialCompact = false,
  onSearchStateChange,
}: SongListProps) {
  const [query, setQuery] = useState(initialQuery)
  const [titleOnly, setTitleOnly] = useState(initialTitleOnly)
  const [sortBy, setSortBy] = useState<SongSortType>(initialSortBy)
  const [isCompactView, setIsCompactView] = useState(initialCompact)

  // 検索状態が変更されたら親に通知
  useEffect(() => {
    onSearchStateChange?.(query, titleOnly, sortBy, isCompactView)
  }, [query, titleOnly, sortBy, isCompactView, onSearchStateChange])

  // 検索・並び替え結果をメモ化
  const filteredAndSortedSongs = useMemo(() => {
    const filtered = searchSongs(songs, query, { titleOnly })
    return sortSongs(filtered, sortBy)
  }, [songs, query, titleOnly, sortBy])

  // 検索クエリの変更ハンドラ
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    []
  )

  // 検索クリアハンドラ
  const handleClearQuery = useCallback(() => {
    setQuery('')
  }, [])

  // タイトルのみ検索の切り替え
  const handleTitleOnlyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitleOnly(e.target.checked)
    },
    []
  )

  // 並び替えの変更
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortBy(e.target.value as SongSortType)
    },
    []
  )

  // 表示モードの切り替え
  const handleToggleCompactView = useCallback(() => {
    setIsCompactView((prev) => !prev)
  }, [])

  return (
    <div className="song-list">
      {/* 検索バー */}
      <div className="song-list__search">
        <div className="song-list__search-input-wrapper">
          <svg
            className="song-list__search-icon"
            width="20"
            height="20"
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
            className="song-list__search-input"
            placeholder={titleOnly ? '楽曲名で検索...' : '検索（タイトル、アーティスト、タグ等）...'}
            value={query}
            onChange={handleQueryChange}
            aria-label="楽曲を検索"
          />
          {query && (
            <button
              type="button"
              className="song-list__search-clear"
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

        {/* 検索オプションと件数 */}
        <div className="song-list__search-options">
          <span className="song-list__search-count">
            {filteredAndSortedSongs.length} / {songs.length} 曲
          </span>
          <label className="song-list__title-only-toggle">
            <input
              type="checkbox"
              checked={titleOnly}
              onChange={handleTitleOnlyChange}
            />
            <span className="song-list__toggle-slider"></span>
            <span className="song-list__toggle-label">曲名のみ</span>
          </label>
        </div>

        {/* 並び替えと表示切替 */}
        <div className="song-list__controls">
          <select
            className="song-list__sort-select"
            value={sortBy}
            onChange={handleSortChange}
            aria-label="並び替え"
          >
            <option value="newest">新曲順</option>
            <option value="oldest">古い曲順</option>
            <option value="updated">更新順</option>
            <option value="alphabetical">五十音順</option>
          </select>
          <button
            type="button"
            className={`song-list__view-toggle ${isCompactView ? 'song-list__view-toggle--active' : ''}`}
            onClick={handleToggleCompactView}
            aria-label={isCompactView ? '詳細表示に切り替え' : '簡易表示に切り替え'}
            title={isCompactView ? '詳細表示' : '簡易表示'}
          >
            {isCompactView ? '☰' : '▤'}
          </button>
        </div>
      </div>

      {/* 楽曲リスト */}
      <div className="song-list__items">
        {filteredAndSortedSongs.length > 0 ? (
          filteredAndSortedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              onClick={() => onSongClick(song.id)}
              compact={isCompactView}
            />
          ))
        ) : (
          <div className="song-list__empty">
            <p className="song-list__empty-message">{emptyMessage}</p>
            {query && (
              <button
                type="button"
                className="song-list__empty-clear"
                onClick={handleClearQuery}
              >
                検索をクリア
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SongList
