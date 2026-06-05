/**
 * LiveList コンポーネント
 * ライブ一覧表示と検索・フィルタ・並び替え機能
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { Live, LiveType, GroupedLiveItem } from '../../types'
import { searchLives } from '../../services/liveSearchService'
import type { LiveSortType } from '../../utils/liveSorting'
import { tourGroupingService } from '../../services/tourGroupingService'
import { LiveCard } from './LiveCard'
import { TourCard } from './TourCard'
import './LiveList.css'

/** コンテンツフィルタの型 */
export type LiveContentFilterValue = 'all' | 'with-content' | 'without-content'

/** コンテンツフィルタの定義 */
const CONTENT_FILTERS: { value: LiveContentFilterValue; label: string }[] = [
  { value: 'all', label: 'コンテンツ' },
  { value: 'with-content', label: 'コンテンツあり' },
  { value: 'without-content', label: 'コンテンツなし' },
]

/** ライブ種別フィルタの定義 */
const LIVE_TYPE_FILTERS: { value: LiveType | 'all'; label: string }[] = [
  { value: 'all', label: 'カテゴリ' },
  { value: 'tour', label: 'ツアー' },
  { value: 'solo', label: '単独公演' },
  { value: 'festival', label: 'フェス' },
  { value: 'event', label: 'イベント' },
  { value: 'release', label: 'リリイベ' },
  { value: 'other', label: 'その他' },
]

/** ライブが埋め込みコンテンツを持っているかチェック */
function hasContent(live: Live): boolean {
  return live.embeds !== undefined && live.embeds.length > 0
}

/** コンテンツフィルタを適用 */
function applyContentFilter(lives: Live[], filter: LiveContentFilterValue): Live[] {
  switch (filter) {
    case 'with-content':
      return lives.filter(hasContent)
    case 'without-content':
      return lives.filter((live) => !hasContent(live))
    default:
      return lives
  }
}

/** ライブ種別フィルタを適用 */
function applyLiveTypeFilter(lives: Live[], liveType: LiveType | 'all'): Live[] {
  if (liveType === 'all') return lives
  return lives.filter((live) => live.liveType === liveType)
}

/** 日付から年を取得 */
function getYear(dateTime: string): number {
  try {
    const date = new Date(dateTime)
    return date.getFullYear()
  } catch {
    return 0
  }
}

/** 日付から月を取得 */
function getMonth(dateTime: string): number {
  try {
    const date = new Date(dateTime)
    return date.getMonth() + 1 // 0-11 → 1-12
  } catch {
    return 0
  }
}

/** 公演地のリストを取得（ツアーのみ） */
function getTourLocations(lives: Live[]): string[] {
  const locations = new Set<string>()
  lives.forEach((live) => {
    if (live.liveType === 'tour' && live.tourLocation) {
      locations.add(live.tourLocation)
    }
  })
  return Array.from(locations).sort()
}

export interface LiveListProps {
  /** ライブデータ配列 */
  lives: Live[]
  /** ライブクリック時のコールバック */
  onLiveClick: (liveId: string) => void
  /** ツアークリック時のコールバック（ツアー名を渡す） */
  onTourClick: (tourName: string) => void
  /** 空の場合のメッセージ */
  emptyMessage?: string
  /** 初期検索クエリ */
  initialQuery?: string
  /** 初期並び替え */
  initialSortBy?: LiveSortType
  /** 初期コンテンツフィルタ */
  initialContentFilter?: LiveContentFilterValue
  /** 初期ライブ種別フィルタ */
  initialLiveTypeFilter?: LiveType | 'all'
  /** 初期年フィルタ */
  initialYearFilter?: string
  /** 初期月フィルタ */
  initialMonthFilter?: string
  /** 初期公演地フィルタ */
  initialLocationFilter?: string
  /** 検索状態変更時のコールバック */
  onSearchStateChange?: (
    query: string,
    sortBy: LiveSortType,
    contentFilter: LiveContentFilterValue,
    liveTypeFilter: LiveType | 'all',
    yearFilter: string,
    monthFilter: string,
    locationFilter: string
  ) => void
}

/**
 * LiveList コンポーネント
 * ライブ一覧を検索・フィルタ・並び替え機能付きで表示
 */
export function LiveList({
  lives,
  onLiveClick,
  onTourClick,
  emptyMessage = 'ライブが見つかりません',
  initialQuery = '',
  initialSortBy = 'newest',
  initialContentFilter = 'all',
  initialLiveTypeFilter = 'all',
  initialYearFilter = 'all',
  initialMonthFilter = 'all',
  initialLocationFilter = 'all',
  onSearchStateChange,
}: LiveListProps) {
  const [query, setQuery] = useState(initialQuery)
  const [sortBy, setSortBy] = useState<LiveSortType>(initialSortBy)
  const [contentFilter, setContentFilter] = useState<LiveContentFilterValue>(initialContentFilter)
  const [liveTypeFilter, setLiveTypeFilter] = useState<LiveType | 'all'>(initialLiveTypeFilter)
  const [yearFilter, setYearFilter] = useState(initialYearFilter)
  const [monthFilter, setMonthFilter] = useState(initialMonthFilter)
  const [locationFilter, setLocationFilter] = useState(initialLocationFilter)

  // ライブデータから年のリストを生成（降順）
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    lives.forEach((live) => {
      const year = getYear(live.dateTime)
      if (year > 0) {
        years.add(year)
      }
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [lives])

  // 検索とフィルタを適用した楽曲（年フィルタ前）
  const filteredLivesBeforeDate = useMemo(() => {
    let filtered = searchLives(lives, query)
    filtered = applyContentFilter(filtered, contentFilter)
    filtered = applyLiveTypeFilter(filtered, liveTypeFilter)
    return filtered
  }, [lives, query, contentFilter, liveTypeFilter])

  // 年フィルタ適用後のライブ（月フィルタ用）
  const filteredLivesAfterYear = useMemo(() => {
    if (yearFilter === 'all') return filteredLivesBeforeDate
    const year = parseInt(yearFilter, 10)
    return filteredLivesBeforeDate.filter((live) => getYear(live.dateTime) === year)
  }, [filteredLivesBeforeDate, yearFilter])

  // 年+月フィルタ適用後のライブ（公演地フィルタ用）
  const filteredLivesAfterMonth = useMemo(() => {
    if (monthFilter === 'all') return filteredLivesAfterYear
    const month = parseInt(monthFilter, 10)
    return filteredLivesAfterYear.filter((live) => getMonth(live.dateTime) === month)
  }, [filteredLivesAfterYear, monthFilter])

  // 年ごとのライブ数を計算
  const yearCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredLivesBeforeDate.forEach((live) => {
      const year = getYear(live.dateTime)
      if (year > 0) {
        counts.set(year, (counts.get(year) || 0) + 1)
      }
    })
    return counts
  }, [filteredLivesBeforeDate])

  // 月ごとのライブ数を計算
  const monthCounts = useMemo(() => {
    const counts = new Map<number, number>()
    filteredLivesAfterYear.forEach((live) => {
      const month = getMonth(live.dateTime)
      if (month > 0) {
        counts.set(month, (counts.get(month) || 0) + 1)
      }
    })
    return counts
  }, [filteredLivesAfterYear])

  // 公演地のリスト
  const availableLocations = useMemo(() => {
    return getTourLocations(filteredLivesAfterMonth)
  }, [filteredLivesAfterMonth])

  // 公演地ごとのライブ数を計算
  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>()
    filteredLivesAfterMonth.forEach((live) => {
      if (live.liveType === 'tour' && live.tourLocation) {
        counts.set(live.tourLocation, (counts.get(live.tourLocation) || 0) + 1)
      }
    })
    return counts
  }, [filteredLivesAfterMonth])

  // 検索状態が変更されたら親に通知
  useEffect(() => {
    onSearchStateChange?.(
      query,
      sortBy,
      contentFilter,
      liveTypeFilter,
      yearFilter,
      monthFilter,
      locationFilter
    )
  }, [query, sortBy, contentFilter, liveTypeFilter, yearFilter, monthFilter, locationFilter, onSearchStateChange])

  // 検索・フィルタ結果をメモ化（ソートはツアーグループ化時に実施）
  const filteredLives = useMemo(() => {
    let filtered = searchLives(lives, query)
    filtered = applyContentFilter(filtered, contentFilter)
    filtered = applyLiveTypeFilter(filtered, liveTypeFilter)

    // 年フィルタを適用
    if (yearFilter !== 'all') {
      const year = parseInt(yearFilter, 10)
      filtered = filtered.filter((live) => getYear(live.dateTime) === year)
    }

    // 月フィルタを適用
    if (monthFilter !== 'all') {
      const month = parseInt(monthFilter, 10)
      filtered = filtered.filter((live) => getMonth(live.dateTime) === month)
    }

    // 公演地フィルタを適用
    if (locationFilter !== 'all') {
      filtered = filtered.filter(
        (live) => live.liveType === 'tour' && live.tourLocation === locationFilter
      )
    }

    return filtered
  }, [lives, query, contentFilter, liveTypeFilter, yearFilter, monthFilter, locationFilter])

  // フィルタ後のライブ総数
  const filteredLivesCount = filteredLives.length

  // ツアーグループ化（ソート順を適用）
  const groupedItems = useMemo<GroupedLiveItem[]>(() => {
    return tourGroupingService.groupLives(filteredLives, sortBy)
  }, [filteredLives, sortBy])

  // 検索クエリの変更ハンドラ
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  // 検索クリアハンドラ
  const handleClearQuery = useCallback(() => {
    setQuery('')
  }, [])

  // 並び替えの変更
  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as LiveSortType)
  }, [])

  // コンテンツフィルタの変更
  const handleContentFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setContentFilter(e.target.value as LiveContentFilterValue)
  }, [])

  // ライブ種別フィルタの変更
  const handleLiveTypeFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLiveTypeFilter(e.target.value as LiveType | 'all')
  }, [])

  // 年フィルタの変更
  const handleYearFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setYearFilter(e.target.value)
  }, [])

  // 月フィルタの変更
  const handleMonthFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonthFilter(e.target.value)
  }, [])

  // 公演地フィルタの変更
  const handleLocationFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocationFilter(e.target.value)
  }, [])

  return (
    <div className="live-list">
      {/* 検索バー */}
      <div className="live-list__search">
        {/* 検索入力行 */}
        <div className="live-list__search-row">
          <div className="live-list__search-input-wrapper">
            <svg
              className="live-list__search-icon"
              width="16"
              height="16"
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
              className="live-list__search-input"
              placeholder="セトリ、公演名、地域など"
              value={query}
              onChange={handleQueryChange}
              aria-label="ライブを検索"
            />
            {query && (
              <button
                type="button"
                className="live-list__search-clear"
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
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <div className="live-list__search-meta">
            <span className="live-list__search-count">
              {filteredLivesCount}公演
            </span>
          </div>
        </div>

        {/* フィルタとソート */}
        <div className="live-list__controls">
          {/* 1段目: ソート・カテゴリ・コンテンツ */}
          <div className="live-list__controls-row">
            {/* ソート */}
            <svg
              className="live-list__control-icon"
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
              className="live-list__sort-select"
              value={sortBy}
              onChange={handleSortChange}
              aria-label="並び替え"
            >
              <option value="newest">新しい順</option>
              <option value="oldest">古い順</option>
              <option value="updated">更新順</option>
            </select>

            {/* カテゴリフィルタ */}
            <svg
              className="live-list__control-icon"
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
              className="live-list__type-filter"
              value={liveTypeFilter}
              onChange={handleLiveTypeFilterChange}
              aria-label="ライブ種別フィルタ"
            >
              {LIVE_TYPE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            {/* コンテンツフィルタ */}
            <select
              className="live-list__content-filter"
              value={contentFilter}
              onChange={handleContentFilterChange}
              aria-label="コンテンツフィルタ"
            >
              {CONTENT_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2段目: 日付フィルタ */}
          <div className="live-list__controls-row">
            {/* 日付フィルタアイコン */}
            <svg
              className="live-list__control-icon"
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
              className="live-list__year-filter"
              value={yearFilter}
              onChange={handleYearFilterChange}
              aria-label="年フィルタ"
            >
              <option value="all">年</option>
              {availableYears.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}({yearCounts.get(year) || 0})
                </option>
              ))}
            </select>
            <select
              className="live-list__month-filter"
              value={monthFilter}
              onChange={handleMonthFilterChange}
              aria-label="月フィルタ"
            >
              <option value="all">月</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                <option key={month} value={month.toString()}>
                  {month}月({monthCounts.get(month) || 0})
                </option>
              ))}
            </select>
            <select
              className="live-list__location-filter"
              value={locationFilter}
              onChange={handleLocationFilterChange}
              aria-label="公演地フィルタ"
            >
              <option value="all">地域</option>
              {availableLocations.map((location) => (
                <option key={location} value={location}>
                  {location}({locationCounts.get(location) || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ライブリスト */}
      <div className="live-list__items">
        {groupedItems.length > 0 ? (
          groupedItems.map((item) =>
            item.type === 'tour' ? (
              <TourCard
                key={`tour-${item.data.id}`}
                tourGroup={item.data}
                onClick={(tourGroup) => onTourClick(tourGroup.tourName)}
              />
            ) : (
              <LiveCard
                key={`live-${item.data.id}`}
                live={item.data}
                onClick={onLiveClick}
              />
            )
          )
        ) : (
          <div className="live-list__empty">
            <p className="live-list__empty-message">{emptyMessage}</p>
            {query && (
              <button type="button" className="live-list__empty-clear" onClick={handleClearQuery}>
                検索をクリア
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveList
