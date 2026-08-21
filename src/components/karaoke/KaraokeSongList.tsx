import { useMemo, useRef, useState, type ChangeEvent, type CompositionEvent, type Ref } from 'react'
import type { KaraokeSong, KaraokeSortType } from '../../types'
import {
  filterKaraokeSongs,
  getKaraokeEpisodeOptions,
  getKaraokeReleaseYearOptions,
  projectKaraokeSongList,
} from '../../utils/karaokeSearch'
import { DEFAULT_KARAOKE_SORT } from '../../utils/karaokeSorting'
import { KaraokeSongCard } from './KaraokeSongCard'
import './KaraokeSongList.css'

export interface KaraokeSongListProps {
  songs: KaraokeSong[]
  query: string
  sortBy?: KaraokeSortType
  episodeFilter?: number | null
  releaseYearFilter?: number | null
  onQueryChange: (query: string) => void
  onSortChange?: (sortBy: KaraokeSortType) => void
  onEpisodeFilterChange?: (episode: number | null) => void
  onReleaseYearFilterChange?: (year: number | null) => void
  onClearAll?: () => void
  onSongClick: (songId: string) => void
  scrollContainerRef?: Ref<HTMLDivElement>
}

export function KaraokeSongList({
  songs,
  query,
  sortBy = DEFAULT_KARAOKE_SORT,
  episodeFilter = null,
  releaseYearFilter = null,
  onQueryChange,
  onSortChange,
  onEpisodeFilterChange,
  onReleaseYearFilterChange,
  onClearAll,
  onSongClick,
  scrollContainerRef,
}: KaraokeSongListProps) {
  const [inputQuery, setInputQuery] = useState(query)
  const isComposingRef = useRef(false)
  const projection = projectKaraokeSongList(
    songs,
    inputQuery,
    sortBy,
    episodeFilter,
    releaseYearFilter
  )
  const episodeOptions = getKaraokeEpisodeOptions(songs)
  const releaseYearOptions = getKaraokeReleaseYearOptions(songs)
  const releaseYearCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filterKaraokeSongs(songs, inputQuery, episodeFilter).forEach((song) => {
      if (song.releaseYear !== undefined) {
        counts.set(song.releaseYear, (counts.get(song.releaseYear) ?? 0) + 1)
      }
    })
    return counts
  }, [songs, inputQuery, episodeFilter])
  const hasActiveConditions =
    inputQuery !== '' ||
    sortBy !== DEFAULT_KARAOKE_SORT ||
    episodeFilter !== null ||
    releaseYearFilter !== null

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value
    setInputQuery(nextQuery)
    if (!isComposingRef.current) onQueryChange(nextQuery)
  }

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false
    setInputQuery(event.currentTarget.value)
    onQueryChange(event.currentTarget.value)
  }

  const handleClearQuery = () => {
    setInputQuery('')
    onQueryChange('')
  }

  const handleClear = () => {
    setInputQuery('')
    if (onClearAll) {
      onClearAll()
    } else {
      onQueryChange('')
      onSortChange?.(DEFAULT_KARAOKE_SORT)
      onEpisodeFilterChange?.(null)
      onReleaseYearFilterChange?.(null)
    }
  }

  return (
    <section className="karaoke-song-list" aria-label="カラオケ歌唱曲一覧">
      <div className="karaoke-song-list__search">
        <div className="karaoke-song-list__search-row">
          <div className="karaoke-song-list__search-input-wrapper">
            <svg
              className="karaoke-song-list__search-icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="karaoke-song-search"
              className="karaoke-song-list__search-input"
              type="text"
              value={inputQuery}
              onChange={handleQueryChange}
              onCompositionStart={() => {
                isComposingRef.current = true
              }}
              onCompositionEnd={handleCompositionEnd}
              placeholder="曲名・原曲アーティスト名・備考で検索"
              aria-label="カラオケ歌唱曲を検索"
            />
            {inputQuery && (
              <button
                type="button"
                className="karaoke-song-list__search-clear"
                onClick={handleClearQuery}
                aria-label="検索をクリア"
              >
                <svg
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <p
            className="karaoke-song-list__count"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {projection.visibleCount}/{projection.totalCount}曲
          </p>
        </div>

        <div className="karaoke-song-list__controls" aria-label="一覧の表示条件">
          <div className="karaoke-song-list__control-group">
            <svg
              className="karaoke-song-list__control-icon"
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
              id="karaoke-song-sort"
              className="karaoke-song-list__sort-select"
              value={sortBy}
              onChange={(event) => onSortChange?.(event.target.value as KaraokeSortType)}
              aria-label="並び替え"
            >
              <option value="streaming-oldest">配信回の古い順</option>
              <option value="streaming-newest">配信回の新しい順</option>
              <option value="release-oldest">発売年の古い順</option>
              <option value="release-newest">発売年の新しい順</option>
              <option value="updated">データの更新順</option>
            </select>
          </div>

          <div className="karaoke-song-list__control-group karaoke-song-list__filter-group">
            <svg
              className="karaoke-song-list__control-icon"
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
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <select
              id="karaoke-episode-filter"
              className="karaoke-song-list__filter-select"
              value={episodeFilter ?? ''}
              onChange={(event) =>
                onEpisodeFilterChange?.(event.target.value ? Number(event.target.value) : null)
              }
              aria-label="配信回フィルター"
            >
              <option value="">配信回</option>
              {episodeOptions.map((episode) => (
                <option key={episode} value={episode}>
                  第{episode}回
                </option>
              ))}
            </select>
            <select
              id="karaoke-year-filter"
              className="karaoke-song-list__filter-select"
              value={releaseYearFilter ?? ''}
              onChange={(event) =>
                onReleaseYearFilterChange?.(event.target.value ? Number(event.target.value) : null)
              }
              aria-label="発売年フィルター"
            >
              <option value="">発売年</option>
              {releaseYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}年({releaseYearCounts.get(year) ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className="karaoke-song-list__spacer" />
          {hasActiveConditions && (
            <button
              type="button"
              className="karaoke-song-list__clear-filters-button"
              onClick={handleClear}
              aria-label="すべての条件をクリア"
              title="すべてクリア"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon
                  points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
                  stroke="currentColor"
                />
                <line x1="18" y1="6" x2="6" y2="18" stroke="#e74c3c" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="#e74c3c" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} className="karaoke-song-list__items">
        {projection.totalCount === 0 ? (
          <div className="karaoke-song-list__empty" role="status">
            <p>カラオケ歌唱曲が登録されていません</p>
          </div>
        ) : projection.visibleCount === 0 ? (
          <div className="karaoke-song-list__empty" role="status">
            <p>指定した条件に一致する曲はありません</p>
            <button
              type="button"
              className="karaoke-song-list__clear"
              onClick={handleClear}
              aria-label="検索とフィルターを解除して全件表示"
            >
              条件を解除
            </button>
          </div>
        ) : (
          <ul className="karaoke-song-list__results">
            {projection.songs.map((song) => (
              <li key={song.id}>
                <KaraokeSongCard song={song} onClick={() => onSongClick(song.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default KaraokeSongList
