/**
 * TagListPage コンポーネント
 * タグ一覧ページ
 *
 * Requirements:
 * - 6.1: 全てのユニークなタグを表示すること
 * - 6.2: タグ名でフィルタリングする検索機能を提供すること
 * - 6.3: タグをタップした時、そのタグに関連する全ての楽曲を表示すること
 * - 6.4: 各タグの楽曲数を表示すること
 * - 6.5: タグ情報をテキストとしてコピーするSNS共有機能を提供すること
 * - 6.6: デフォルトでタグをアルファベット順にソートし、楽曲数でのソートオプションも提供すること
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { TagSortOrder } from '../services/tagService'
import { cacheService } from '../services/cacheService'
import { generateTagsFromSongs, getSongsByTagId, getTagNameFromId, tagService } from '../services/tagService'
import { useDataFetch } from '../hooks'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { TagList } from '../components/tag/TagList'
import { TagDetail } from '../components/tag/TagDetail'
import { TagEditDialog } from '../components/tag/TagEditDialog'
import './TagListPage.css'

/**
 * TagListPage コンポーネント
 * タグ一覧ページ - 検索・ソート機能とタグ詳細表示
 */
export function TagListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URLから状態を復元
  const initialQuery = searchParams.get('q') || ''
  const initialSortBy = (searchParams.get('sort') as TagSortOrder) || 'recentlyUpdated'
  const initialCompact = searchParams.get('compact') === 'true'
  const selectedTagId = searchParams.get('tag') || null

  // 楽曲データの取得（エラーハンドリング統合）
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()
  const [showEditDialog, setShowEditDialog] = useState(false)
  
  // localSongsの更新用state（タグ編集時のローカル更新用）
  const [localSongsOverride, setLocalSongsOverride] = useState<typeof songs | null>(null)
  
  // 実際に使用するsongs（オーバーライドがあればそちらを使用、なければfetchしたsongs）
  const effectiveSongs = localSongsOverride ?? songs

  // 楽曲データからタグを生成
  const tags = useMemo(() => {
    return generateTagsFromSongs(effectiveSongs)
  }, [effectiveSongs])

  // 既存のタグ名一覧（編集ダイアログ用）
  const existingTagNames = useMemo(() => {
    return tags.map((tag) => tag.name)
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

  // タグクリック時の処理
  const handleTagClick = useCallback(
    (tagId: string) => {
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
      console.log('🏷️ TagListPage: タグを共有しました')
    }
  }, [])

  // タグ編集ダイアログを開く
  const handleOpenEditDialog = useCallback(() => {
    setShowEditDialog(true)
  }, [])

  // タグ編集ダイアログを閉じる
  const handleCloseEditDialog = useCallback(() => {
    setShowEditDialog(false)
  }, [])

  // タグ名変更
  const handleRenameTag = useCallback(
    async (oldName: string, newName: string) => {
      await tagService.renameTag(oldName, newName, effectiveSongs)
      
      // ローカルの楽曲データを更新
      const updatedSongs = effectiveSongs.map((song) => {
        const currentTags = song.tags || []
        if (!currentTags.includes(oldName)) return song
        
        // 古いタグを削除し、新しいタグを追加（重複を避ける）
        const newTags = currentTags
          .filter((tag) => tag !== oldName)
          .concat(currentTags.includes(newName) ? [] : [newName])
        return { ...song, tags: newTags }
      })
      
      setLocalSongsOverride(updatedSongs)

      // キャッシュも更新
      cacheService.cacheSongs(updatedSongs)

      // タグ詳細から戻る（タグが変更されたため）
      handleBackFromDetail()
    },
    [effectiveSongs, handleBackFromDetail]
  )

  // タグ削除
  const handleDeleteTag = useCallback(
    async (tagName: string) => {
      await tagService.deleteTag(tagName, effectiveSongs)
      
      // ローカルの楽曲データを更新
      const updatedSongs = effectiveSongs.map((song) => {
        const currentTags = song.tags || []
        if (!currentTags.includes(tagName)) return song
        
        const newTags = currentTags.filter((tag) => tag !== tagName)
        return { ...song, tags: newTags }
      })
      
      setLocalSongsOverride(updatedSongs)

      // キャッシュも更新
      cacheService.cacheSongs(updatedSongs)

      // タグ詳細から戻る（タグが削除されたため）
      handleBackFromDetail()
    },
    [effectiveSongs, handleBackFromDetail]
  )

  // 検索状態の変更をURLに反映
  const handleSearchStateChange = useCallback(
    (query: string, sortBy: TagSortOrder, compact: boolean) => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (sortBy !== 'alphabetical') params.set('sort', sortBy)
      if (compact) params.set('compact', 'true')
      // タグ選択状態を保持
      const currentTag = searchParams.get('tag')
      if (currentTag) params.set('tag', currentTag)
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams]
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
      <div className="tag-list-page">
        <Header title="タグ一覧" showBackButton onBack={() => navigate('/')} />
        <main className="tag-list-page__main">
          <LoadingSpinner
            size="large"
            message="データを読み込んでいます..."
            fullScreen
          />
        </main>
        <Navigation currentPath="/tags" onNavigate={handleNavigate} />
      </div>
    )
  }

  // タグ詳細表示
  if (selectedTag) {
    const tagName = getTagNameFromId(selectedTagId!)
    return (
      <div className="tag-list-page">
        <Header
          title={tagName}
          showBackButton
          onBack={handleBackFromDetail}
        />
        <main className="tag-list-page__main tag-list-page__main--detail">
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

        {/* タグ編集ダイアログ */}
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

  // タグ一覧表示
  return (
    <div className="tag-list-page">
      <Header title="タグ一覧" showBackButton onBack={() => navigate('/')} />

      <main className="tag-list-page__main">
        {/* エラーメッセージ */}
        {error && (
          <div className="tag-list-page__error">
            <ErrorMessage
              message={error}
              type={isOffline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={isOffline || error.includes('オフライン') ? undefined : retry}
            />
          </div>
        )}

        {/* タグリスト */}
        <div className="tag-list-page__content">
          <TagList
            tags={tags}
            onTagClick={handleTagClick}
            emptyMessage="タグが登録されていません"
            initialQuery={initialQuery}
            initialSortBy={initialSortBy}
            initialCompact={initialCompact}
            onSearchStateChange={handleSearchStateChange}
          />
        </div>
      </main>

      <Navigation currentPath="/tags" onNavigate={handleNavigate} />
    </div>
  )
}

export default TagListPage
