/**
 * フィルタ状態管理フック
 * Music Bubble Explorer V2
 *
 * アーティストフィルタとカテゴリフィルタの状態を管理
 *
 * Requirements:
 * - 3.1-3.6: アーティストフィルタ機能
 * - 4.1-4.5: カテゴリフィルタ機能（楽曲・作詞・作曲・編曲・タグ）複数選択可能
 */

import { useState, useCallback, useMemo } from 'react'
import type { Song, ArtistFilterValue, CategoryFilterValue, FilterState } from '../types'
import {
  filterSongs,
  filterSongsByArtist,
  getAvailableGenresForArtist,
} from '../services/filterService'

interface UseFilterResult {
  // フィルタ状態
  filterState: FilterState
  // フィルタリング済み楽曲
  filteredSongs: Song[]
  // アーティストフィルタ適用後の楽曲（カテゴリフィルタ前）
  artistFilteredSongs: Song[]
  // 利用可能なジャンル（アーティストフィルタ適用後）
  availableGenres: string[]
  // アーティストフィルタ変更
  setArtistFilter: (value: ArtistFilterValue) => void
  // カテゴリフィルタ変更（複数選択）
  setCategoryFilter: (categories: CategoryFilterValue[]) => void
  // カテゴリをトグル
  toggleCategory: (category: CategoryFilterValue) => void
  // ジャンルフィルタ変更
  setGenreFilter: (genres: string[]) => void
  // ジャンルを追加
  addGenre: (genre: string) => void
  // ジャンルを削除
  removeGenre: (genre: string) => void
  // ジャンルをトグル
  toggleGenre: (genre: string) => void
  // フィルタをリセット
  resetFilter: () => void
  // フィルタがアクティブかどうか
  isFilterActive: boolean
}

const initialFilterState: FilterState = {
  artist: null,
  categories: [],
  genres: [],
}

export function useFilter(songs: Song[]): UseFilterResult {
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState)

  // アーティストフィルタ変更
  const setArtistFilter = useCallback((value: ArtistFilterValue) => {
    setFilterState((prev) => ({
      ...prev,
      artist: value,
      // アーティストフィルタ変更時はジャンルフィルタをリセット
      // （新しいアーティストで利用可能なジャンルが変わるため）
      genres: [],
    }))
  }, [])

  // カテゴリフィルタ変更（複数選択）
  const setCategoryFilter = useCallback((categories: CategoryFilterValue[]) => {
    setFilterState((prev) => ({
      ...prev,
      categories,
      // タグカテゴリが含まれない場合はジャンルフィルタをリセット
      genres: categories.includes('tag') ? prev.genres : [],
    }))
  }, [])

  // カテゴリをトグル
  const toggleCategory = useCallback((category: CategoryFilterValue) => {
    setFilterState((prev) => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category]
      return {
        ...prev,
        categories: newCategories,
        // タグカテゴリが含まれない場合はジャンルフィルタをリセット
        genres: newCategories.includes('tag') ? prev.genres : [],
      }
    })
  }, [])

  // ジャンルフィルタ変更
  const setGenreFilter = useCallback((genres: string[]) => {
    setFilterState((prev) => ({
      ...prev,
      genres,
    }))
  }, [])

  // ジャンルを追加
  const addGenre = useCallback((genre: string) => {
    setFilterState((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres
        : [...prev.genres, genre],
    }))
  }, [])

  // ジャンルを削除
  const removeGenre = useCallback((genre: string) => {
    setFilterState((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre),
    }))
  }, [])

  // ジャンルをトグル
  const toggleGenre = useCallback((genre: string) => {
    setFilterState((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }))
  }, [])

  // フィルタをリセット
  const resetFilter = useCallback(() => {
    setFilterState(initialFilterState)
  }, [])

  // アーティストフィルタ適用後の楽曲
  const artistFilteredSongs = useMemo(() => {
    return filterSongsByArtist(songs, filterState.artist)
  }, [songs, filterState.artist])

  // 利用可能なジャンル（アーティストフィルタ適用後）
  const availableGenres = useMemo(() => {
    return getAvailableGenresForArtist(songs, filterState.artist)
  }, [songs, filterState.artist])

  // フィルタリング済み楽曲
  const filteredSongs = useMemo(() => {
    return filterSongs(songs, filterState)
  }, [songs, filterState])

  // フィルタがアクティブかどうか
  const isFilterActive = useMemo(() => {
    return filterState.artist !== null || filterState.categories.length > 0 || filterState.genres.length > 0
  }, [filterState])

  return {
    filterState,
    filteredSongs,
    artistFilteredSongs,
    availableGenres,
    setArtistFilter,
    setCategoryFilter,
    toggleCategory,
    setGenreFilter,
    addGenre,
    removeGenre,
    toggleGenre,
    resetFilter,
    isFilterActive,
  }
}

export default useFilter
