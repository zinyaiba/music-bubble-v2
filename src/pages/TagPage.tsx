/**
 * TagPage コンポーネント
 * タグ一覧とタグ登録を統合したページ
 *
 * Requirements:
 * - 2.1: タブインターフェースを表示すること
 * - 2.2: 「タグ一覧」タブで既存のタグ一覧機能を表示
 * - 2.3: 「タグ登録」タブで既存のタグ登録機能を表示
 * - 2.4: 選択されたタブの状態をURLに保持
 * - 2.5: デフォルトで「タグ一覧」タブを表示
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Song } from '../types'
import type { TagSortOrder } from '../services/tagService'
import type { SongSortType } from '../utils/songSorting'
import { cacheService } from '../services/cacheService'
import { AnalyticsEvents, trackEvent, trackSearch } from '../services/analyticsService'
import {
  generateTagsFromSongs,
  getSongsByTagId,
  getTagNameFromId,
  tagService,
} from '../services/tagService'
import { searchSongs } from '../services/songSearchService'
import { sortSongs } from '../utils/songSorting'
import { useDataFetch } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { TabSwitcher } from '../components/common/TabSwitcher'
import { TagList } from '../components/tag/TagList'
import { TagDetail } from '../components/tag/TagDetail'
import { TagEditDialog } from '../components/tag/TagEditDialog'
import { TagInput } from '../components/tag/TagInput'
import './TagPage.css'

/** タブの種類 */
type TabType = 'list' | 'registration'

/** タブ定義 */
const TABS = [
  { id: 'list' as const, label: 'タグ一覧' },
  { id: 'registration' as const, label: 'タグ登録' },
]

/**
 * TagPage コンポーネント
 * タグ一覧とタグ登録を統合したページ
 */
export function TagPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URLからタブ状態を復元（デフォルトは'list'）
  const activeTab = (searchParams.get('tab') as TabType) || 'list'

  // タグ一覧用のURL状態
  const initialListQuery = searchParams.get('q') || ''
  const initialListSortBy = (searchParams.get('sort') as TagSortOrder) || 'recentlyUpdated'
  const initialListCompact = searchParams.get('compact') === 'true'
  const selectedTagId = searchParams.get('tag') || null

  // タグ登録用のURL状態
  const initialRegQuery = searchParams.get('regQ') || ''
  const initialRegTitleOnly = searchParams.get('titleOnly') === 'true'
  const initialRegSortBy = (searchParams.get('regSort') as SongSortType) || 'newest'
  const initialRegCompact = searchParams.get('regCompact') === 'true'
  const selectedSongId = searchParams.get('song') || null

  // 楽曲データの取得
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()
  const [localSongsOverride, setLocalSongsOverride] = useState<Song[] | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // タグ登録用の状態
  const [regQuery, setRegQuery] = useState(initialRegQuery)
  const [regTitleOnly, setRegTitleOnly] = useState(initialRegTitleOnly)
  const [regSortBy, setRegSortBy] = useState<SongSortType>(initialRegSortBy)
  const [isRegCompactView, setIsRegCompactView] = useState(initialRegCompact)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // 実際に使用するsongs
  const effectiveSongs = localSongsOverride ?? songs

  // ページ閲覧トラッキング
  useEffect(() => {
    if (activeTab === 'list') {
      trackEvent(AnalyticsEvents.ページ閲覧_タグ一覧)
    } else {
      trackEvent(AnalyticsEvents.ページ閲覧_タグ登録)
    }
  }, [activeTab])

  // 楽曲データからタグを生成
  const tags = useMemo(() => {
    return generateTagsFromSongs(effectiveSongs)
  }, [effectiveSongs])

  // 既存のタグ名一覧
  const existingTagNames = useMemo(() => {
    return tags.map((tag) => tag.name)
  }, [tags])

  // 全タグ一覧（サジェスト用）
  const allTags = useMemo(() => {
    return tags.map((tag) => tag.name).sort((a, b) => a.localeCompare(b, 'ja'))
  }, [tags])

  // 選択されたタグの情報
  const selectedTag = useMemo(() => {
    if (!selectedTagId) return null
    return tags.find((tag) => tag.id === selectedTagId) || null
  }, [tags, selectedTagId])

  // 選択されたタグに関連する楽曲
  const relatedSongs = useMemo(() => {
    if (!selectedTagId) return []
    return getSongsByTagId(effectiveSongs, selectedTagId)
  }, [effectiveSongs, selectedTagId])

  // タグ登録用の検索結果
  const filteredSongs = useMemo(() => {
    const filtered = searchSongs(effectiveSongs, regQuery, { titleOnly: regTitleOnly })
    return sortSongs(filtered, regSortBy)
  }, [effectiveSongs, regQuery, regTitleOnly, regSortBy])

  // 選択された楽曲
  const selectedSong = useMemo(() => {
    if (!selectedSongId) return null
    return effectiveSongs.find((song) => song.id === selectedSongId) || null
  }, [effectiveSongs, selectedSongId])

  // タブ変更時の処理
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams()
      params.set('tab', tabId)
      setSearchParams(params, { replace: true })
    },
    [setSearchParams]
  )

  // タグクリック時の処理
  const handleTagClick = useCallback(
    (tagId: string) => {
      trackEvent(AnalyticsEvents.タグ_詳細表示, { tag_id: tagId })
      const params = new URLSearchParams(searchParams)
      params.set('tag', tagId)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // タグ詳細から戻る
  const handleBackFromDetail = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('tag')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // 楽曲クリック時の処理
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // 共有時の処理
  const handleShare = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('🏷️ TagPage: タグを共有しました')
    }
  }, [])

  // タグ編集ダイアログを開く
  const handleOpenEditDialog = useCallback(() => {
    trackEvent(AnalyticsEvents.タグ_編集開始, { tag_id: selectedTagId || '' })
    setShowEditDialog(true)
  }, [selectedTagId])

  // タグ編集ダイアログを閉じる
  const handleCloseEditDialog = useCallback(() => {
    setShowEditDialog(false)
  }, [])

  // タグ名変更
  const handleRenameTag = useCallback(
    async (oldName: string, newName: string) => {
      await tagService.renameTag(oldName, newName, effectiveSongs)
      trackEvent(AnalyticsEvents.タグ_編集完了, { old_name: oldName, new_name: newName })

      const updatedSongs = effectiveSongs.map((song) => {
        const currentTags = song.tags || []
        if (!currentTags.includes(oldName)) return song

        const newTags = currentTags
          .filter((tag) => tag !== oldName)
          .concat(currentTags.includes(newName) ? [] : [newName])
        return { ...song, tags: newTags }
      })

      setLocalSongsOverride(updatedSongs)
      cacheService.cacheSongs(updatedSongs)
      handleBackFromDetail()
    },
    [effectiveSongs, handleBackFromDetail]
  )

  // タグ削除
  const handleDeleteTag = useCallback(
    async (tagName: string) => {
      await tagService.deleteTag(tagName, effectiveSongs)
      trackEvent(AnalyticsEvents.タグ_削除, { tag_name: tagName })

      const updatedSongs = effectiveSongs.map((song) => {
        const currentTags = song.tags || []
        if (!currentTags.includes(tagName)) return song

        const newTags = currentTags.filter((tag) => tag !== tagName)
        return { ...song, tags: newTags }
      })

      setLocalSongsOverride(updatedSongs)
      cacheService.cacheSongs(updatedSongs)
      handleBackFromDetail()
    },
    [effectiveSongs, handleBackFromDetail]
  )

  // タグ一覧の検索状態変更
  const handleListSearchStateChange = useCallback(
    (query: string, sortBy: TagSortOrder, compact: boolean) => {
      const params = new URLSearchParams()
      params.set('tab', 'list')
      if (query) params.set('q', query)
      if (sortBy !== 'alphabetical') params.set('sort', sortBy)
      if (compact) params.set('compact', 'true')
      const currentTag = searchParams.get('tag')
      if (currentTag) params.set('tag', currentTag)
      setSearchParams(params, { replace: true })

      if (query) {
        trackSearch('タグ', query)
      }
    },
    [searchParams, setSearchParams]
  )

  // タグ登録用の検索クエリ変更
  const handleRegQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setRegQuery(newQuery)
      const params = new URLSearchParams(searchParams)
      if (newQuery) {
        params.set('regQ', newQuery)
      } else {
        params.delete('regQ')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 検索クリア
  const handleClearRegQuery = useCallback(() => {
    setRegQuery('')
    const params = new URLSearchParams(searchParams)
    params.delete('regQ')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // タイトルのみ検索の切り替え
  const handleRegTitleOnlyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitleOnly = e.target.checked
      setRegTitleOnly(newTitleOnly)
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
  const handleRegSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSortBy = e.target.value as SongSortType
      setRegSortBy(newSortBy)
      const params = new URLSearchParams(searchParams)
      if (newSortBy !== 'newest') {
        params.set('regSort', newSortBy)
      } else {
        params.delete('regSort')
      }
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // 表示モードの切り替え
  const handleToggleRegCompactView = useCallback(() => {
    setIsRegCompactView((prev) => {
      const newCompact = !prev
      const params = new URLSearchParams(searchParams)
      if (newCompact) {
        params.set('regCompact', 'true')
      } else {
        params.delete('regCompact')
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

        const updatedSongs = effectiveSongs.map((song) =>
          song.id === selectedSong.id ? { ...song, tags: newTags } : song
        )
        setLocalSongsOverride(updatedSongs)
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
    [selectedSong, effectiveSongs]
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
      <div className="tag-page">
        <Header title="タグ" showBackButton onBack={() => navigate('/songs')} />
        <main className="tag-page__main">
          <LoadingSpinner size="large" message="データを読み込んでいます..." fullScreen />
        </main>
        <Navigation currentPath="/tags" onNavigate={handleNavigate} />
      </div>
    )
  }

  // タグ詳細表示（タグ一覧タブで選択時）
  if (activeTab === 'list' && selectedTag) {
    const tagName = getTagNameFromId(selectedTagId!)
    return (
      <div className="tag-page">
        <Header title={tagName} showBackButton onBack={handleBackFromDetail} />
        <main className="tag-page__main tag-page__main--detail">
          <TagDetail
            tag={selectedTag}
            songs={relatedSongs}
            onSongClick={handleSongClick}
            onShare={handleShare}
            onBack={handleBackFromDetail}
            onEdit={handleOpenEditDialog}
          />
        </main>
        <Navigation currentPath="/tags" onNavigate={handleNavigate} />

        {showEditDialog && (
          <TagEditDialog
            tag={selectedTag}
            existingTagNames={existingTagNames.filter((name) => name !== selectedTag.name)}
            onClose={handleCloseEditDialog}
            onRename={handleRenameTag}
            onDelete={handleDeleteTag}
          />
        )}
      </div>
    )
  }

  // 楽曲選択時のタグ編集UI（タグ登録タブで選択時）
  if (activeTab === 'registration' && selectedSong) {
    return (
      <div className="tag-page">
        <Header title="タグ登録" showBackButton onBack={handleDeselectSong} />
        <main className="tag-page__main">
          <div className="tag-page__editor">
            <div className="tag-page__editor-header">
              <button
                type="button"
                className="tag-page__back-button"
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

            <div className="tag-page__song-info">
              <h2 className="tag-page__song-title">{selectedSong.title}</h2>
              {selectedSong.artists && selectedSong.artists.length > 0 && (
                <p className="tag-page__song-artist">{selectedSong.artists.join(', ')}</p>
              )}
            </div>

            <div className="tag-page__tag-editor">
              <TagInput
                existingTags={allTags}
                selectedTags={selectedSong.tags || []}
                onChange={handleTagsChange}
                disabled={isSaving}
                placeholder="タグを入力または選択..."
              />
              {saveMessage && (
                <p
                  className={`tag-page__save-message ${saveMessage.includes('失敗') ? 'tag-page__save-message--error' : ''}`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          </div>
        </main>
        <Navigation currentPath="/tags" onNavigate={handleNavigate} />
      </div>
    )
  }

  // メインのタブ表示
  return (
    <div className="tag-page">
      <Header title="タグ" showBackButton onBack={() => navigate('/songs')} />

      <main className="tag-page__main">
        {/* タブ切り替え */}
        <TabSwitcher tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

        {/* エラーメッセージ */}
        {error && (
          <div className="tag-page__error">
            <ErrorMessage
              message={error}
              type={isOffline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={isOffline || error.includes('オフライン') ? undefined : retry}
            />
          </div>
        )}

        {/* タブコンテンツ */}
        <div
          className="tag-page__content"
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'list' ? (
            /* タグ一覧タブ */
            <TagList
              tags={tags}
              songs={effectiveSongs}
              onTagClick={handleTagClick}
              emptyMessage="タグが登録されていません"
              initialQuery={initialListQuery}
              initialSortBy={initialListSortBy}
              initialCompact={initialListCompact}
              onSearchStateChange={handleListSearchStateChange}
            />
          ) : (
            /* タグ登録タブ */
            <div className="tag-page__registration">
              {/* 検索バー */}
              <div className="tag-page__search">
                <div className="tag-page__search-row">
                  <div className="tag-page__search-input-wrapper">
                    <svg
                      className="tag-page__search-icon"
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
                      className="tag-page__search-input"
                      placeholder={regTitleOnly ? '曲名で検索...' : '検索...'}
                      value={regQuery}
                      onChange={handleRegQueryChange}
                      aria-label="楽曲を検索"
                    />
                    {regQuery && (
                      <button
                        type="button"
                        className="tag-page__search-clear"
                        onClick={handleClearRegQuery}
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
                  <div className="tag-page__search-meta">
                    <span className="tag-page__search-count">
                      {filteredSongs.length}/{songs.length}曲
                    </span>
                    <label className="tag-page__title-only-toggle">
                      <input
                        type="checkbox"
                        checked={regTitleOnly}
                        onChange={handleRegTitleOnlyChange}
                      />
                      <span className="tag-page__toggle-slider"></span>
                      <span className="tag-page__toggle-label">曲名のみ</span>
                    </label>
                  </div>
                </div>

                <div className="tag-page__controls">
                  <div className="tag-page__control-group">
                    <svg
                      className="tag-page__control-icon"
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
                      className="tag-page__sort-select"
                      value={regSortBy}
                      onChange={handleRegSortChange}
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
                  <button
                    type="button"
                    className={`tag-page__view-toggle ${isRegCompactView ? 'tag-page__view-toggle--active' : ''}`}
                    onClick={handleToggleRegCompactView}
                    aria-label={isRegCompactView ? '詳細表示に切り替え' : '簡易表示に切り替え'}
                    title={isRegCompactView ? '詳細表示' : '簡易表示'}
                  >
                    {isRegCompactView ? '☰' : 'ALL'}
                  </button>
                </div>
              </div>

              {/* 楽曲リスト */}
              <div className="tag-page__song-list">
                {filteredSongs.length > 0 ? (
                  filteredSongs.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      className={`tag-page__song-item ${isRegCompactView ? 'tag-page__song-item--compact' : ''}`}
                      onClick={() => handleSongSelect(song.id)}
                    >
                      <div className="tag-page__song-item-info">
                        <span className="tag-page__song-item-title">{song.title}</span>
                        {!isRegCompactView &&
                          (song.tags && song.tags.length > 0 ? (
                            <div className="tag-page__song-item-chips">
                              {song.tags.map((tag) => (
                                <span key={tag} className="tag-page__song-item-chip">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="tag-page__song-item-no-tags">タグなし</span>
                          ))}
                      </div>
                      <div className="tag-page__song-item-meta">
                        {song.tags && song.tags.length > 0 ? (
                          <span className="tag-page__tag-count">{song.tags.length}タグ</span>
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
                  <div className="tag-page__empty">
                    <p className="tag-page__empty-message">楽曲が見つかりません</p>
                    {regQuery && (
                      <button
                        type="button"
                        className="tag-page__empty-clear"
                        onClick={handleClearRegQuery}
                      >
                        検索をクリア
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Navigation currentPath="/tags" onNavigate={handleNavigate} />
    </div>
  )
}

export default TagPage
