import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorMessage, Header, LoadingSpinner, Navigation } from '../components/common'
import { KaraokeSongList } from '../components/karaoke'
import { useKaraokeSongs } from '../hooks'
import { AnalyticsEvents, trackEvent, trackSearch } from '../services/analyticsService'
import type { KaraokeDisplayMode, KaraokeListState, KaraokeSortType } from '../types'
import {
  isKaraokeDisplayMode,
  loadKaraokeListState,
  saveKaraokeListState,
} from '../utils/karaokeListState'
import { DEFAULT_KARAOKE_SORT, isKaraokeSortType } from '../utils/karaokeSorting'
import './KaraokeListPage.css'

const KARAOKE_LIST_PATH = '/karaoke-songs'

function parseEpisodeFilter(value: string | null): number | null {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value)) return null
  const episode = Number(value)
  return Number.isFinite(episode) && episode >= 1 && episode <= Number.MAX_SAFE_INTEGER
    ? episode
    : null
}

function parseReleaseYearFilter(value: string | null): number | null {
  if (!value || !/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= 1000 && year <= 9999 ? year : null
}

/** カラオケ歌唱曲の取得、検索状態、スクロール復元、画面遷移を管理する一覧ページ。 */
export function KaraokeListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const requestedSort = searchParams.get('sort')
  const sortBy = isKaraokeSortType(requestedSort) ? requestedSort : DEFAULT_KARAOKE_SORT
  const requestedDisplayMode = searchParams.get('display')
  const displayMode = isKaraokeDisplayMode(requestedDisplayMode) ? requestedDisplayMode : 'all'
  const episodeFilter = parseEpisodeFilter(searchParams.get('episode'))
  const releaseYearFilter = parseReleaseYearFilter(searchParams.get('year'))
  const { karaokeSongs, isLoading, error, isOffline, retry } = useKaraokeSongs()
  const [initialListState] = useState(loadKaraokeListState)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasRestoredScrollRef = useRef(false)
  const listStateRef = useRef<KaraokeListState>({
    query,
    sortBy,
    displayMode,
    episodeFilter,
    releaseYearFilter,
    scrollTop:
      initialListState.query === query &&
      initialListState.sortBy === sortBy &&
      initialListState.displayMode === displayMode &&
      initialListState.episodeFilter === episodeFilter &&
      initialListState.releaseYearFilter === releaseYearFilter
        ? initialListState.scrollTop
        : 0,
  })

  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_カラオケ一覧)
  }, [])

  useEffect(() => {
    const current = listStateRef.current
    if (
      current.query === query &&
      current.sortBy === sortBy &&
      current.displayMode === displayMode &&
      current.episodeFilter === episodeFilter &&
      current.releaseYearFilter === releaseYearFilter
    )
      return
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
    const nextState = {
      query,
      sortBy,
      displayMode,
      episodeFilter,
      releaseYearFilter,
      scrollTop: 0,
    }
    listStateRef.current = nextState
    saveKaraokeListState(nextState)
  }, [displayMode, episodeFilter, query, releaseYearFilter, sortBy])

  useEffect(() => {
    if (isLoading || error || !scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    let saveFrameId: number | null = null

    const handleScroll = () => {
      listStateRef.current = {
        ...listStateRef.current,
        scrollTop: scrollContainer.scrollTop,
      }

      if (saveFrameId !== null) return
      saveFrameId = window.requestAnimationFrame(() => {
        saveKaraokeListState(listStateRef.current)
        saveFrameId = null
      })
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (saveFrameId !== null) window.cancelAnimationFrame(saveFrameId)
    }
  }, [error, isLoading])

  useEffect(() => {
    if (isLoading || error || hasRestoredScrollRef.current || !scrollContainerRef.current) return

    const targetScrollTop = listStateRef.current.scrollTop
    let settleFrameId: number | null = null
    const restoreFrameId = window.requestAnimationFrame(() => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      scrollContainer.scrollTop = targetScrollTop
      settleFrameId = window.requestAnimationFrame(() => {
        const settledScrollContainer = scrollContainerRef.current
        if (!settledScrollContainer) return

        settledScrollContainer.scrollTop = targetScrollTop
        const restoredScrollTop = settledScrollContainer.scrollTop
        listStateRef.current = {
          query,
          sortBy,
          displayMode,
          episodeFilter,
          releaseYearFilter,
          scrollTop: restoredScrollTop,
        }
        saveKaraokeListState(listStateRef.current)
        hasRestoredScrollRef.current = true
      })
    })

    return () => {
      window.cancelAnimationFrame(restoreFrameId)
      if (settleFrameId !== null) window.cancelAnimationFrame(settleFrameId)
    }
  }, [
    displayMode,
    episodeFilter,
    error,
    isLoading,
    karaokeSongs.length,
    query,
    releaseYearFilter,
    sortBy,
  ])

  const updateUrl = useCallback(
    (
      nextQuery: string,
      nextSort: KaraokeSortType,
      nextEpisode: number | null,
      nextReleaseYear: number | null,
      nextDisplayMode: KaraokeDisplayMode
    ) => {
      const params = new URLSearchParams()
      if (nextQuery) params.set('q', nextQuery)
      if (nextSort !== DEFAULT_KARAOKE_SORT) params.set('sort', nextSort)
      if (nextEpisode !== null) params.set('episode', String(nextEpisode))
      if (nextReleaseYear !== null) params.set('year', String(nextReleaseYear))
      if (nextDisplayMode !== 'all') params.set('display', nextDisplayMode)
      setSearchParams(params, { replace: true })
    },
    [setSearchParams]
  )

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
      const nextState = {
        query: nextQuery,
        sortBy,
        displayMode,
        episodeFilter,
        releaseYearFilter,
        scrollTop: 0,
      }
      listStateRef.current = nextState
      saveKaraokeListState(nextState)
      updateUrl(nextQuery, sortBy, episodeFilter, releaseYearFilter, displayMode)
      if (nextQuery) trackSearch('カラオケ', nextQuery)
    },
    [displayMode, episodeFilter, releaseYearFilter, sortBy, updateUrl]
  )

  const handleSortChange = useCallback(
    (nextSort: KaraokeSortType) => {
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
      const nextState = {
        query,
        sortBy: nextSort,
        displayMode,
        episodeFilter,
        releaseYearFilter,
        scrollTop: 0,
      }
      listStateRef.current = nextState
      saveKaraokeListState(nextState)
      updateUrl(query, nextSort, episodeFilter, releaseYearFilter, displayMode)
      trackEvent(AnalyticsEvents.カラオケ_ソート変更, { sort_type: nextSort })
    },
    [displayMode, episodeFilter, query, releaseYearFilter, updateUrl]
  )

  const handleDisplayModeChange = useCallback(
    (nextDisplayMode: KaraokeDisplayMode) => {
      const nextState = {
        query,
        sortBy,
        displayMode: nextDisplayMode,
        episodeFilter,
        releaseYearFilter,
        scrollTop: listStateRef.current.scrollTop,
      }
      listStateRef.current = nextState
      saveKaraokeListState(nextState)
      updateUrl(query, sortBy, episodeFilter, releaseYearFilter, nextDisplayMode)
    },
    [episodeFilter, query, releaseYearFilter, sortBy, updateUrl]
  )

  const handleEpisodeFilterChange = useCallback(
    (nextEpisode: number | null) => {
      const nextState = {
        query,
        sortBy,
        displayMode,
        episodeFilter: nextEpisode,
        releaseYearFilter,
        scrollTop: 0,
      }
      listStateRef.current = nextState
      saveKaraokeListState(nextState)
      updateUrl(query, sortBy, nextEpisode, releaseYearFilter, displayMode)
      trackEvent(AnalyticsEvents.カラオケ_フィルター適用, {
        filter_type: '配信回',
        filter_value: nextEpisode ?? 'すべて',
      })
    },
    [displayMode, query, releaseYearFilter, sortBy, updateUrl]
  )

  const handleReleaseYearFilterChange = useCallback(
    (nextYear: number | null) => {
      const nextState = {
        query,
        sortBy,
        displayMode,
        episodeFilter,
        releaseYearFilter: nextYear,
        scrollTop: 0,
      }
      listStateRef.current = nextState
      saveKaraokeListState(nextState)
      updateUrl(query, sortBy, episodeFilter, nextYear, displayMode)
      trackEvent(AnalyticsEvents.カラオケ_フィルター適用, {
        filter_type: '発売年',
        filter_value: nextYear ?? 'すべて',
      })
    },
    [displayMode, episodeFilter, query, sortBy, updateUrl]
  )

  const handleClearAll = useCallback(() => {
    const nextState = {
      query: '',
      sortBy: DEFAULT_KARAOKE_SORT,
      displayMode: 'all' as const,
      episodeFilter: null,
      releaseYearFilter: null,
      scrollTop: 0,
    }
    listStateRef.current = nextState
    saveKaraokeListState(nextState)
    updateUrl('', DEFAULT_KARAOKE_SORT, null, null, 'all')
  }, [updateUrl])

  const handleSongClick = useCallback(
    (songId: string) => {
      const scrollTop = scrollContainerRef.current?.scrollTop ?? listStateRef.current.scrollTop
      const state = { query, sortBy, displayMode, episodeFilter, releaseYearFilter, scrollTop }
      listStateRef.current = state
      saveKaraokeListState(state)
      trackEvent(AnalyticsEvents.カラオケ_詳細表示, { karaoke_song_id: songId })
      navigate(`${KARAOKE_LIST_PATH}/${encodeURIComponent(songId)}`)
    },
    [displayMode, episodeFilter, navigate, query, releaseYearFilter, sortBy]
  )

  const handleNavigate = useCallback((path: string) => navigate(path), [navigate])
  const handleBack = useCallback(() => navigate('/songs'), [navigate])
  const handleAdd = useCallback(() => {
    trackEvent(AnalyticsEvents.カラオケ_新規作成)
    navigate(`${KARAOKE_LIST_PATH}/new`)
  }, [navigate])

  return (
    <div className="karaoke-list-page">
      <Header title="カラオケ歌唱一覧" showBackButton onBack={handleBack} />

      <main className="karaoke-list-page__main" aria-busy={isLoading}>
        {isLoading ? (
          <div className="karaoke-list-page__status">
            <LoadingSpinner size="large" message="カラオケ歌唱曲を読み込んでいます..." />
          </div>
        ) : error ? (
          <div className="karaoke-list-page__status karaoke-list-page__error">
            <ErrorMessage
              message={error.message}
              type={isOffline || error.type === 'offline' ? 'warning' : 'error'}
              onRetry={retry}
              retryLabel="もう一度読み込む"
            />
          </div>
        ) : (
          <div className="karaoke-list-page__content">
            <KaraokeSongList
              songs={karaokeSongs}
              query={query}
              sortBy={sortBy}
              displayMode={displayMode}
              episodeFilter={episodeFilter}
              releaseYearFilter={releaseYearFilter}
              onQueryChange={handleQueryChange}
              onSortChange={handleSortChange}
              onDisplayModeChange={handleDisplayModeChange}
              onEpisodeFilterChange={handleEpisodeFilterChange}
              onReleaseYearFilterChange={handleReleaseYearFilterChange}
              onClearAll={handleClearAll}
              onSongClick={handleSongClick}
              scrollContainerRef={scrollContainerRef}
            />
          </div>
        )}

        <button
          type="button"
          className="karaoke-list-page__add-button"
          onClick={handleAdd}
          aria-label="カラオケ歌唱曲を新規登録"
          title="カラオケ歌唱曲を新規登録"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </main>

      <Navigation currentPath="/songs" onNavigate={handleNavigate} />
    </div>
  )
}

export default KaraokeListPage
