/**
 * TagRegistrationPage コンポーネント
 * タグ登録ページ
 *
 * Requirements:
 * - 5.1: タグ登録ページに遷移した時、システムは全ての楽曲と現在のタグの一覧を表示すること
 * - 5.2: タイトル、アーティスト、既存タグで楽曲をフィルタリングする検索機能を提供すること
 * - 5.3: 楽曲をタップした時、システムはその楽曲のタグ入力インターフェースを表示すること
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Song } from '../types'
import { cacheService } from '../services/cacheService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { searchSongs } from '../services/songSearchService'
import { sortSongs } from '../utils/songSorting'
import type { SongSortType } from '../utils/songSorting'
import { tagService, generateTagsFromSongs } from '../services/tagService'
import { useDataFetch } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { TagInput } from '../components/tag/TagInput'
import './TagRegistrationPage.css'

/**
 * TagRegistrationPage コンポーネント
 * タグ登録ページ - 楽曲一覧とタグ入力
 */
export function TagRegistrationPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URLから状態を復元
  const initialQuery = searchParams.get('q') || ''
  const initialTitleOnly = searchParams.get('titleOnly') === 'true'
  const initialSortBy = (searchParams.get('sort') as SongSortType) || 'newest'
  const initialCompact = searchParams.get('compact') === 'true'
  const selectedSongId = searchParams.get('song') || null

  // 楽曲データの取得（エラーハンドリング統合）
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()
  const [localSongs, setLocalSongs] = useState<Song[]>([])
  const [query, setQuery] = useState(initialQuery)
  const [titleOnly, setTitleOnly] = useState(initialTitleOnly)
  const [sortBy, setSortBy] = useState<SongSortType>(initialSortBy)
  const [isCompactView, setIsCompactView] = useState(initialCompact)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_タグ登録)
  }, [])

  // songsが更新されたらlocalSongsも更新
  useMemo(() => {
    if (songs.length > 0) {
      setLocalSongs(songs)
    }
  }, [songs])

  // 全タグ一覧（サジェスト用）
  const allTags = useMemo(() => {
    const tags = generateTagsFromSongs(localSongs)
    return tags.map((tag) => tag.name).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [localSongs])

  // 検索結果
  const filteredSongs = useMemo(() => {
    const filtered = searchSongs(localSongs, query, { titleOnly })
    return sortSongs(filtered, sortBy)
  }, [localSongs, query, titleOnly, sortBy])

  // 選択された楽曲
  const selectedSong = useMemo(() => {
    if (!selectedSongId) return null
    return localSongs.find((song) => song.id === selectedSongId) || null
  }, [localSongs, selectedSongId])

  // 検索クエリの変更
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setQuery(newQuery)
      // URLを更新
      const params = new URLSearchParams(searchParams)
      if (newQuery) {
        params.set('q', newQuery)
      } else {
        params.delete('q')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 検索クリア
  const handleClearQuery = useCallback(() => {
    setQuery('')
    const params = new URLSearchParams(searchParams)
    params.delete('q')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // タイトルのみ検索の切り替え
  const handleTitleOnlyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitleOnly = e.target.checked
      setTitleOnly(newTitleOnly)
      const params = new URLSearchParams(searchParams)
      if (newTitleOnly) {
        params.set('titleOnly', 'true')
      } else {
        params.delete('titleOnly')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 並び替えの変更
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortBy = e.target.value as SongSortType
      setSortBy(newSortBy)
      const params = new URLSearchParams(searchParams)
      if (newSortBy !== 'newest') {
        params.set('sort', newSortBy)
      } else {
        params.delete('sort')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 表示モードの切り替え
  const handleToggleCompactView = useCallback(() => {
    setIsCompactView((prev) => {
      const newCompact = !prev
      const params = new URLSearchParams(searchParams)
      if (newCompact) {
        params.set('compact', 'true')
      } else {
        params.delete('compact')
      }
      setSearchParams(params, { replace: true })
      return newCompact
    })
  }, [searchParams, setSearchParams])

  // 楽曲選択
  const handleSongSelect = useCallback(
    (songId: string) => {
      trackEvent(AnalyticsEvents.タグ_登録開始, { song_id: songId })
      const params = new URLSearchParams(searchParams)
      params.set('song', songId)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 楽曲選択解除
  const handleDeselectSong = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('song')
    setSearchParams(params, { replace: true })
    setSaveMessage(null)
  }, [searchParams, setSearchParams])

  // タグ変更時の処理
  const handleTagsChange = useCallback(
    async (newTags: string[]) => {
      if (!selectedSong) return

      setIsSaving(true)
      setSaveMessage(null)

      try {
        await tagService.updateSongTags(selectedSong.id, newTags)

        // ローカルの楽曲データを更新
        setLocalSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.id === selectedSong.id ? { ...song, tags: newTags } : song
          )
        )

        // キャッシュも更新
        const updatedSongs = localSongs.map((song) =>
          song.id === selectedSong.id ? { ...song, tags: newTags } : song
        )
        cacheService.cacheSongs(updatedSongs)

        trackEvent(AnalyticsEvents.タグ_登録完了, {
          song_id: selectedSong.id,
          tag_count: newTags.length,
        })

        setSaveMessage('タグを保存しました')
        setTimeout(() => setSaveMessage(null), 2000)
      } catch (err) {
        console.error('タグの保存に失敗しました:', err)
        setSaveMessage('タグの保存に失敗しました')
      } finally {
        setIsSaving(false)
      }
    },
    [selectedSong, localSongs]
  )

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // ローディング中
  if (isLoading && songs.length === 0) {
    return (
      <div className="tag-registration-page">
        <Header title="タグ登録" showBackButton onBack={() => navigate('/')} />
        <main className="tag-registration-page__main">
          <LoadingSpinner
            size="large"
            message="データを読み込んでいます..."
            fullScreen
          />
        </main>
        <Navigation currentPath="/tag-registration" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="tag-registration-page">
      <Header title="タグ登録" showBackButton onBack={() => navigate('/')} />

      <main className="tag-registration-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="tag-registration-page__error">
            <ErrorMessage
              message={error}
              type={isOffline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={isOffline || error.includes('オフライン') ? undefined : retry}
            />
          </div>
        )}

        <div className="tag-registration-page__content">
          {/* 楽曲選択時のタグ編集UI */}
          {selectedSong ? (
            <div className="tag-registration-page__editor">
              <div className="tag-registration-page__editor-header">
                <button
                  type="button"
                  className="tag-registration-page__back-button"
                  onClick={handleDeselectSong}
                  aria-label="楽曲一覧に戻る"
                >
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
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  戻る
                </button>
              </div>

              <div className="tag-registration-page__song-info">
                <h2 className="tag-registration-page__song-title">
                  {selectedSong.title}
                </h2>
                {selectedSong.artists && selectedSong.artists.length > 0 && (
                  <p className="tag-registration-page__song-artist">
                    {selectedSong.artists.join(', ')}
                  </p>
                )}
              </div>

              <div className="tag-registration-page__tag-editor">
                <label className="tag-registration-page__label">
                  タグを編集
                </label>
                <TagInput
                  existingTags={allTags}
                  selectedTags={selectedSong.tags || []}
                  onChange={handleTagsChange}
                  disabled={isSaving}
                  placeholder="タグを入力または選択..."
                />
                {saveMessage && (
                  <p
                    className={`tag-registration-page__save-message ${saveMessage.includes('失敗') ? 'tag-registration-page__save-message--error' : ''}`}
                  >
                    {saveMessage}
                  </p>
                )}
              </div>

              {/* 現在のタグ表示 */}
              {selectedSong.tags && selectedSong.tags.length > 0 && (
                <div className="tag-registration-page__current-tags">
                  <p className="tag-registration-page__current-tags-label">
                    現在のタグ: {selectedSong.tags.length}個
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 検索バー */}
              <div className="tag-registration-page__search">
                <div className="tag-registration-page__search-input-wrapper">
                  <svg
                    className="tag-registration-page__search-icon"
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
                    className="tag-registration-page__search-input"
                    placeholder={titleOnly ? '楽曲名で検索...' : '検索（タイトル、アーティスト、タグ等）...'}
                    value={query}
                    onChange={handleQueryChange}
                    aria-label="楽曲を検索"
                  />
                  {query && (
                    <button
                      type="button"
                      className="tag-registration-page__search-clear"
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
                <div className="tag-registration-page__search-options">
                  <span className="tag-registration-page__search-count">
                    {filteredSongs.length} / {songs.length} 曲
                  </span>
                  <label className="tag-registration-page__title-only-toggle">
                    <input
                      type="checkbox"
                      checked={titleOnly}
                      onChange={handleTitleOnlyChange}
                    />
                    <span className="tag-registration-page__toggle-slider"></span>
                    <span className="tag-registration-page__toggle-label">曲名のみ検索</span>
                  </label>
                </div>

                {/* 並び替え */}
                <div className="tag-registration-page__controls">
                  <select
                    className="tag-registration-page__sort-select"
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
                  </select>
                  <button
                    type="button"
                    className={`tag-registration-page__view-toggle ${isCompactView ? 'tag-registration-page__view-toggle--active' : ''}`}
                    onClick={handleToggleCompactView}
                    aria-label={isCompactView ? '詳細表示に切り替え' : '簡易表示に切り替え'}
                    title={isCompactView ? '詳細表示' : '簡易表示'}
                  >
                    {isCompactView ? '☰' : 'ALL'}
                  </button>
                </div>
              </div>

              {/* 楽曲リスト */}
              <div className="tag-registration-page__song-list">
                {filteredSongs.length > 0 ? (
                  filteredSongs.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      className={`tag-registration-page__song-item ${isCompactView ? 'tag-registration-page__song-item--compact' : ''}`}
                      onClick={() => handleSongSelect(song.id)}
                    >
                      <div className="tag-registration-page__song-item-info">
                        <span className="tag-registration-page__song-item-title">
                          {song.title}
                        </span>
                        {!isCompactView && (
                          song.tags && song.tags.length > 0 ? (
                            <div className="tag-registration-page__song-item-chips">
                              {song.tags.map((tag) => (
                                <span key={tag} className="tag-registration-page__song-item-chip">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag-registration-page__song-item-no-tags">
                              タグなし
                            </span>
                          )
                        )}
                      </div>
                      <div className="tag-registration-page__song-item-meta">
                        {song.tags && song.tags.length > 0 ? (
                          <span className="tag-registration-page__tag-count">
                            {song.tags.length}タグ
                          </span>
                        ) : null}
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
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="tag-registration-page__empty">
                    <p className="tag-registration-page__empty-message">
                      楽曲が見つかりません
                    </p>
                    {query && (
                      <button
                        type="button"
                        className="tag-registration-page__empty-clear"
                        onClick={handleClearQuery}
                      >
                        検索をクリア
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Navigation currentPath="/tag-registration" onNavigate={handleNavigate} />
    </div>
  )
}

export default TagRegistrationPage
