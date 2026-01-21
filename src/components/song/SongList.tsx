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
import type { SongDisplayMode } from './SongCard'
import './SongList.css'

/** 表示モードの定義 */
const DISPLAY_MODES: { mode: SongDisplayMode; icon: string; label: string }[] = [
  { mode: 'compact', icon: '☰', label: '簡易表示' },
  { mode: 'artist', icon: '🎤', label: 'アーティスト' },
  { mode: 'lyricist', icon: '✍', label: '作詞' },
  { mode: 'composer', icon: '🎼', label: '作曲' },
  { mode: 'arranger', icon: '🎧', label: '編曲' },
  { mode: 'release', icon: '📅', label: '発売日' },
  { mode: 'all', icon: 'ALL', label: 'すべて表示' },
]

/** コンテンツフィルタの型 */
export type ContentFilterValue = 
  | 'all' 
  | 'with-content' 
  | 'without-content'
  | 'kuribayashi'
  | 'minami'
  | 'wild3'
  | 'other-artist'

/** コンテンツフィルタの定義 */
const CONTENT_FILTERS: { value: ContentFilterValue; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'with-content', label: 'コンテンツあり' },
  { value: 'without-content', label: 'コンテンツなし' },
  { value: 'kuribayashi', label: '栗林みな実' },
  { value: 'minami', label: 'Minami' },
  { value: 'wild3', label: 'ワイルド三人娘' },
  { value: 'other-artist', label: 'その他アーティスト' },
]

/** 楽曲がコンテンツを持っているかチェック */
function hasContent(song: Song): boolean {
  // musicServiceEmbeds配列に有効な埋め込みがあるか
  if (song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
    return song.musicServiceEmbeds.some(embed => embed.embed && embed.embed.trim() !== '')
  }
  // 旧形式のmusicServiceEmbedがあるか
  if (song.musicServiceEmbed && song.musicServiceEmbed.trim() !== '') {
    return true
  }
  return false
}

/** アーティストが栗林みな実かチェック */
function isKuribayashi(song: Song): boolean {
  return song.artists?.some(artist => artist === '栗林みな実') ?? false
}

/** アーティストがMinamiかチェック */
function isMinami(song: Song): boolean {
  return song.artists?.some(artist => artist === 'Minami') ?? false
}

/** アーティストがワイルド三人娘を含むかチェック */
function isWild3(song: Song): boolean {
  return song.artists?.some(artist => artist.includes('ワイルド三人娘')) ?? false
}

/** アーティストがその他（栗林みな実、Minami、ワイルド三人娘以外）かチェック */
function isOtherArtist(song: Song): boolean {
  return !isKuribayashi(song) && !isMinami(song) && !isWild3(song)
}

/** フィルタを適用 */
function applyFilter(songs: Song[], filter: ContentFilterValue): Song[] {
  switch (filter) {
    case 'with-content':
      return songs.filter(hasContent)
    case 'without-content':
      return songs.filter(song => !hasContent(song))
    case 'kuribayashi':
      return songs.filter(isKuribayashi)
    case 'minami':
      return songs.filter(isMinami)
    case 'wild3':
      return songs.filter(isWild3)
    case 'other-artist':
      return songs.filter(isOtherArtist)
    default:
      return songs
  }
}

/** 曜日の定義 */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 発売日から曜日を計算 */
function getDayOfWeek(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day)
  return date.getDay()
}

/** 日付フィルタの状態 */
export interface DateFilterState {
  year: string
  month: string
  day: string
  weekday: string
}

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
  /** 初期表示モード */
  initialDisplayMode?: SongDisplayMode
  /** 初期コンテンツフィルタ */
  initialContentFilter?: ContentFilterValue
  /** 初期年代フィルタ */
  initialYearFilter?: string
  /** 初期月フィルタ */
  initialMonthFilter?: string
  /** 初期日フィルタ */
  initialDayFilter?: string
  /** 初期曜日フィルタ */
  initialWeekdayFilter?: string
  /** 検索状態変更時のコールバック */
  onSearchStateChange?: (query: string, titleOnly: boolean, sortBy: SongSortType, displayMode: SongDisplayMode, contentFilter: ContentFilterValue, yearFilter: string, monthFilter: string, dayFilter: string, weekdayFilter: string) => void
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
  initialDisplayMode = 'all',
  initialContentFilter = 'all',
  initialYearFilter = 'all',
  initialMonthFilter = 'all',
  initialDayFilter = 'all',
  initialWeekdayFilter = 'all',
  onSearchStateChange,
}: SongListProps) {
  const [query, setQuery] = useState(initialQuery)
  const [titleOnly, setTitleOnly] = useState(initialTitleOnly)
  const [sortBy, setSortBy] = useState<SongSortType>(initialSortBy)
  const [displayMode, setDisplayMode] = useState<SongDisplayMode>(initialDisplayMode)
  const [contentFilter, setContentFilter] = useState<ContentFilterValue>(initialContentFilter)
  const [yearFilter, setYearFilter] = useState(initialYearFilter)
  const [monthFilter, setMonthFilter] = useState(initialMonthFilter)
  const [dayFilter, setDayFilter] = useState(initialDayFilter)
  const [weekdayFilter, setWeekdayFilter] = useState(initialWeekdayFilter)

  // 楽曲データから年のリストを生成（降順）
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    songs.forEach(song => {
      if (song.releaseYear) {
        years.add(song.releaseYear)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [songs])

  // 楽曲データから月のリストを生成
  const availableMonths = useMemo(() => {
    const months = new Set<number>()
    songs.forEach(song => {
      if (song.releaseDate && song.releaseDate.length >= 2) {
        const month = parseInt(song.releaseDate.substring(0, 2), 10)
        if (month >= 1 && month <= 12) {
          months.add(month)
        }
      }
    })
    return Array.from(months).sort((a, b) => a - b)
  }, [songs])

  // 楽曲データから日のリストを生成
  const availableDays = useMemo(() => {
    const days = new Set<number>()
    songs.forEach(song => {
      if (song.releaseDate && song.releaseDate.length >= 4) {
        const day = parseInt(song.releaseDate.substring(2, 4), 10)
        if (day >= 1 && day <= 31) {
          days.add(day)
        }
      }
    })
    return Array.from(days).sort((a, b) => a - b)
  }, [songs])

  // 検索とコンテンツ/アーティストフィルタを適用した楽曲（日付フィルタ前）
  const filteredSongsBeforeDate = useMemo(() => {
    let filtered = searchSongs(songs, query, { titleOnly })
    return applyFilter(filtered, contentFilter)
  }, [songs, query, titleOnly, contentFilter])

  // 年フィルタ適用後の楽曲（月・日・曜日フィルタ用）
  const filteredSongsAfterYear = useMemo(() => {
    if (yearFilter === 'all') return filteredSongsBeforeDate
    const year = parseInt(yearFilter, 10)
    return filteredSongsBeforeDate.filter(song => song.releaseYear === year)
  }, [filteredSongsBeforeDate, yearFilter])

  // 年+月フィルタ適用後の楽曲（日・曜日フィルタ用）
  const filteredSongsAfterMonth = useMemo(() => {
    if (monthFilter === 'all') return filteredSongsAfterYear
    const month = parseInt(monthFilter, 10)
    return filteredSongsAfterYear.filter(song => {
      if (!song.releaseDate || song.releaseDate.length < 2) return false
      const songMonth = parseInt(song.releaseDate.substring(0, 2), 10)
      return songMonth === month
    })
  }, [filteredSongsAfterYear, monthFilter])

  // 年+月+日フィルタ適用後の楽曲（曜日フィルタ用）
  const filteredSongsAfterDay = useMemo(() => {
    if (dayFilter === 'all') return filteredSongsAfterMonth
    const day = parseInt(dayFilter, 10)
    return filteredSongsAfterMonth.filter(song => {
      if (!song.releaseDate || song.releaseDate.length < 4) return false
      const songDay = parseInt(song.releaseDate.substring(2, 4), 10)
      return songDay === day
    })
  }, [filteredSongsAfterMonth, dayFilter])

  // 年代ごとの曲数を計算（検索+コンテンツフィルタ後）
  const yearCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredSongsBeforeDate.forEach(song => {
      if (song.releaseYear) {
        counts.set(song.releaseYear, (counts.get(song.releaseYear) || 0) + 1)
      }
    })
    return counts
  }, [filteredSongsBeforeDate])

  // 月ごとの曲数を計算（年フィルタ適用後）
  const monthCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredSongsAfterYear.forEach(song => {
      if (song.releaseDate && song.releaseDate.length >= 2) {
        const month = parseInt(song.releaseDate.substring(0, 2), 10)
        if (month >= 1 && month <= 12) {
          counts.set(month, (counts.get(month) || 0) + 1)
        }
      }
    })
    return counts
  }, [filteredSongsAfterYear])

  // 日ごとの曲数を計算（年+月フィルタ適用後）
  const dayCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredSongsAfterMonth.forEach(song => {
      if (song.releaseDate && song.releaseDate.length >= 4) {
        const day = parseInt(song.releaseDate.substring(2, 4), 10)
        if (day >= 1 && day <= 31) {
          counts.set(day, (counts.get(day) || 0) + 1)
        }
      }
    })
    return counts
  }, [filteredSongsAfterMonth])

  // 曜日ごとの曲数を計算（年+月+日フィルタ適用後）
  const weekdayCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredSongsAfterDay.forEach(song => {
      if (song.releaseYear && song.releaseDate && song.releaseDate.length >= 4) {
        const month = parseInt(song.releaseDate.substring(0, 2), 10)
        const day = parseInt(song.releaseDate.substring(2, 4), 10)
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const weekday = getDayOfWeek(song.releaseYear, month, day)
          counts.set(weekday, (counts.get(weekday) || 0) + 1)
        }
      }
    })
    return counts
  }, [filteredSongsAfterDay])

  // 検索状態が変更されたら親に通知
  useEffect(() => {
    onSearchStateChange?.(query, titleOnly, sortBy, displayMode, contentFilter, yearFilter, monthFilter, dayFilter, weekdayFilter)
  }, [query, titleOnly, sortBy, displayMode, contentFilter, yearFilter, monthFilter, dayFilter, weekdayFilter, onSearchStateChange])

  // 検索・並び替え・フィルタ結果をメモ化
  const filteredAndSortedSongs = useMemo(() => {
    let filtered = searchSongs(songs, query, { titleOnly })
    
    // コンテンツ/アーティストフィルタを適用
    filtered = applyFilter(filtered, contentFilter)
    
    // 年代フィルタを適用
    if (yearFilter !== 'all') {
      const year = parseInt(yearFilter, 10)
      filtered = filtered.filter(song => song.releaseYear === year)
    }
    
    // 月フィルタを適用
    if (monthFilter !== 'all') {
      const month = parseInt(monthFilter, 10)
      filtered = filtered.filter(song => {
        if (!song.releaseDate || song.releaseDate.length < 2) return false
        const songMonth = parseInt(song.releaseDate.substring(0, 2), 10)
        return songMonth === month
      })
    }
    
    // 日フィルタを適用
    if (dayFilter !== 'all') {
      const day = parseInt(dayFilter, 10)
      filtered = filtered.filter(song => {
        if (!song.releaseDate || song.releaseDate.length < 4) return false
        const songDay = parseInt(song.releaseDate.substring(2, 4), 10)
        return songDay === day
      })
    }
    
    // 曜日フィルタを適用
    if (weekdayFilter !== 'all') {
      const weekday = parseInt(weekdayFilter, 10)
      filtered = filtered.filter(song => {
        if (!song.releaseYear || !song.releaseDate || song.releaseDate.length < 4) return false
        const month = parseInt(song.releaseDate.substring(0, 2), 10)
        const day = parseInt(song.releaseDate.substring(2, 4), 10)
        if (month < 1 || month > 12 || day < 1 || day > 31) return false
        const songWeekday = getDayOfWeek(song.releaseYear, month, day)
        return songWeekday === weekday
      })
    }
    
    return sortSongs(filtered, sortBy)
  }, [songs, query, titleOnly, sortBy, contentFilter, yearFilter, monthFilter, dayFilter, weekdayFilter])

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

  // コンテンツフィルタの変更
  const handleContentFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setContentFilter(e.target.value as ContentFilterValue)
    },
    []
  )

  // 年代フィルタの変更
  const handleYearFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setYearFilter(e.target.value)
    },
    []
  )

  // 月フィルタの変更
  const handleMonthFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setMonthFilter(e.target.value)
    },
    []
  )

  // 日フィルタの変更
  const handleDayFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setDayFilter(e.target.value)
    },
    []
  )

  // 曜日フィルタの変更
  const handleWeekdayFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setWeekdayFilter(e.target.value)
    },
    []
  )

  // 表示モードの切り替え（次のモードへ）
  const handleCycleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const currentIndex = DISPLAY_MODES.findIndex((m) => m.mode === prev)
      const nextIndex = (currentIndex + 1) % DISPLAY_MODES.length
      return DISPLAY_MODES[nextIndex].mode
    })
  }, [])

  // 現在の表示モード情報を取得
  const currentModeInfo = DISPLAY_MODES.find((m) => m.mode === displayMode) || DISPLAY_MODES[0]

  return (
    <div className="song-list">
      {/* 検索バー */}
      <div className="song-list__search">
        {/* 検索入力行（検索バー + 統計 + 曲名のみトグル） */}
        <div className="song-list__search-row">
          <div className="song-list__search-input-wrapper">
            <svg
              className="song-list__search-icon"
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
              className="song-list__search-input"
              placeholder={titleOnly ? '曲名で検索...' : '検索...'}
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
          <div className="song-list__search-meta">
            <span className="song-list__search-count">
              {filteredAndSortedSongs.length}/{songs.length}曲
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
        </div>

        {/* 並び替えと表示切替 */}
        <div className="song-list__controls">
          <div className="song-list__control-group">
            <svg
              className="song-list__control-icon"
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
              className="song-list__sort-select"
              value={sortBy}
              onChange={handleSortChange}
              aria-label="並び替え"
            >
              <option value="newest">新曲順</option>
              <option value="oldest">古い曲順</option>
              <option value="updated">更新順</option>
              <option value="alphabetical">五十音順</option>
              <option value="artist">栗林みな実を優先</option>
              <option value="minami">Minamiを優先</option>
              <option value="wild3">ワイルド三人娘を優先</option>
            </select>
          </div>
          <div className="song-list__control-group">
            <svg
              className="song-list__control-icon"
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
              className="song-list__content-filter"
              value={contentFilter}
              onChange={handleContentFilterChange}
              aria-label="コンテンツフィルタ"
            >
              {CONTENT_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <div className="song-list__control-group song-list__date-filters">
            <svg
              className="song-list__control-icon"
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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <select
              className="song-list__year-filter"
              value={yearFilter}
              onChange={handleYearFilterChange}
              aria-label="年代フィルタ"
            >
              <option value="all">全年({filteredSongsBeforeDate.length})</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>
                  {year}({yearCounts.get(year) || 0})
                </option>
              ))}
            </select>
            <select
              className="song-list__month-filter"
              value={monthFilter}
              onChange={handleMonthFilterChange}
              aria-label="月フィルタ"
            >
              <option value="all">全月({filteredSongsAfterYear.length})</option>
              {availableMonths.map(month => (
                <option key={month} value={month.toString()}>
                  {month}月({monthCounts.get(month) || 0})
                </option>
              ))}
            </select>
            <select
              className="song-list__day-filter"
              value={dayFilter}
              onChange={handleDayFilterChange}
              aria-label="日フィルタ"
            >
              <option value="all">全日({filteredSongsAfterMonth.length})</option>
              {availableDays.map(day => (
                <option key={day} value={day.toString()}>
                  {day}日({dayCounts.get(day) || 0})
                </option>
              ))}
            </select>
            <select
              className="song-list__weekday-filter"
              value={weekdayFilter}
              onChange={handleWeekdayFilterChange}
              aria-label="曜日フィルタ"
            >
              <option value="all">全曜日({filteredSongsAfterDay.length})</option>
              {[0, 1, 2, 3, 4, 5, 6].map(weekday => (
                <option key={weekday} value={weekday.toString()}>
                  {WEEKDAYS[weekday]}曜({weekdayCounts.get(weekday) || 0})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="song-list__view-toggle"
            onClick={handleCycleDisplayMode}
            aria-label={`表示モード: ${currentModeInfo.label}`}
            title={currentModeInfo.label}
          >
            {currentModeInfo.icon}
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
              displayMode={displayMode}
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
