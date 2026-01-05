/**
 * TopPage コンポーネント
 * TOPページ - シャボン玉表示とフィルタ機能を統合
 *
 * Requirements:
 * - 1.1: シャボン玉表示
 * - 1.5: ローディング状態の表示
 * - 3.1: アーティストフィルタ表示（インライン）
 * - 4.1: カテゴリフィルタ表示（楽曲・作詞・作曲・編曲・タグ、複数選択可能）
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Song, Bubble as BubbleType } from '../types'
import { firebaseService } from '../services/firebaseService'
import { cacheService } from '../services/cacheService'
import { useFilter } from '../hooks/useFilter'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { BubbleCanvas } from '../components/bubble/BubbleCanvas'
import { BubbleDetail } from '../components/bubble/BubbleDetail'
import { InlineFilterBar } from '../components/filter/InlineFilterBar'
import './TopPage.css'

export function TopPage() {
  const navigate = useNavigate()

  // 楽曲データの状態
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アニメーション状態
  const [isPaused, setIsPaused] = useState(() => cacheService.getAnimationPaused())

  // 選択中のシャボン玉
  const [selectedBubble, setSelectedBubble] = useState<BubbleType | null>(null)

  // キャンバスサイズ
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // フィルタフック
  const {
    filterState,
    filteredSongs,
    setArtistFilter,
    toggleCategory,
  } = useFilter(songs)

  // キャンバスサイズを計算
  useEffect(() => {
    const updateCanvasSize = () => {
      // ヘッダー、フィルタバー、ナビゲーションの高さを考慮
      const headerHeight = 56
      const filterBarHeight = 100 // インラインフィルタバーの高さ
      const navigationHeight = 64
      const padding = 16

      const width = window.innerWidth
      const height = window.innerHeight - headerHeight - filterBarHeight - navigationHeight - padding

      setCanvasSize({ width, height: Math.max(height, 300) })
    }

    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [])

  // 楽曲データを取得
  useEffect(() => {
    const loadSongs = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // まずキャッシュから取得を試みる
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(cachedSongs)
          setIsLoading(false)
        }

        // Firebaseから最新データを取得
        const fetchedSongs = await firebaseService.getAllSongs()
        setSongs(fetchedSongs)
        cacheService.cacheSongs(fetchedSongs)
        setIsLoading(false)
      } catch (err) {
        console.error('楽曲データの取得に失敗しました:', err)

        // キャッシュがあればそれを使用
        const cachedSongs = cacheService.getCachedSongs()
        if (cachedSongs && cachedSongs.length > 0) {
          setSongs(cachedSongs)
          setError('オフラインモード: キャッシュデータを表示しています')
        } else {
          setError('楽曲データの取得に失敗しました。再試行してください。')
        }
        setIsLoading(false)
      }
    }

    loadSongs()
  }, [])

  // 一時停止/再開のトグル
  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      const newValue = !prev
      cacheService.setAnimationPaused(newValue)
      return newValue
    })
  }, [])

  // シャボン玉クリック
  const handleBubbleClick = useCallback((bubble: BubbleType) => {
    setSelectedBubble(bubble)
  }, [])

  // 詳細モーダルを閉じる
  const handleCloseDetail = useCallback(() => {
    setSelectedBubble(null)
  }, [])

  // 楽曲詳細ページへ遷移
  const handleSongClick = useCallback(
    (songId: string) => {
      navigate(`/songs/${songId}`)
    },
    [navigate]
  )

  // タグクリック時に新しいBubbleを表示
  const handleTagClick = useCallback((tagName: string) => {
    // タグに関連する楽曲数を計算
    const relatedCount = songs.filter(s => s.tags?.includes(tagName)).length
    
    const newBubble: BubbleType = {
      id: `tag-${tagName}-${Date.now()}`,
      type: 'tag',
      name: tagName,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 80,
      color: '#98FB98',
      opacity: 1,
      relatedCount,
    }
    setSelectedBubble(newBubble)
  }, [songs])

  // 人物クリック時に新しいBubbleを表示
  const handlePersonClick = useCallback((personName: string, type: 'lyricist' | 'composer' | 'arranger') => {
    // 人物に関連する楽曲数を計算
    const relatedCount = songs.filter(s => {
      if (type === 'lyricist') return s.lyricists?.includes(personName)
      if (type === 'composer') return s.composers?.includes(personName)
      if (type === 'arranger') return s.arrangers?.includes(personName)
      return false
    }).length

    const colorMap = {
      lyricist: '#87CEEB',
      composer: '#DDA0DD',
      arranger: '#FFFACD',
    }
    
    const newBubble: BubbleType = {
      id: `${type}-${personName}-${Date.now()}`,
      type,
      name: personName,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 80,
      color: colorMap[type],
      opacity: 1,
      relatedCount,
    }
    setSelectedBubble(newBubble)
  }, [songs])

  // 楽曲バブルクリック時に新しいBubbleを表示（関連情報を辿る用）
  const handleSongBubbleClick = useCallback((songTitle: string) => {
    const song = songs.find(s => s.title === songTitle)
    if (!song) return

    const relatedCount = (song.lyricists?.length || 0) + 
      (song.composers?.length || 0) + 
      (song.arrangers?.length || 0) +
      (song.tags?.length || 0)
    
    const newBubble: BubbleType = {
      id: `song-${song.id}-${Date.now()}`,
      type: 'song',
      name: songTitle,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 80,
      color: '#FFB6C1',
      opacity: 1,
      relatedCount,
    }
    setSelectedBubble(newBubble)
  }, [songs])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  // リトライ
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  // ローディング中
  if (isLoading && songs.length === 0) {
    return (
      <div className="top-page">
        <Header title="🫧 Music Bubble Explorer" />
        <main className="top-page-main">
          <LoadingSpinner
            size="large"
            message="楽曲データを読み込んでいます..."
            fullScreen
          />
        </main>
        <Navigation currentPath="/" onNavigate={handleNavigate} />
      </div>
    )
  }

  return (
    <div className="top-page">
      <Header title="🫧 Music Bubble Explorer" />

      <main className="top-page-main">
        {/* エラーメッセージ */}
        {error && (
          <div className="top-page-error">
            <ErrorMessage
              message={error}
              type={error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={error.includes('オフライン') ? undefined : handleRetry}
            />
          </div>
        )}

        {/* インラインフィルタバー */}
        <div className="top-page-filter-bar">
          <InlineFilterBar
            artistFilter={filterState.artist}
            onArtistFilterChange={setArtistFilter}
            selectedCategories={filterState.categories}
            onCategoryToggle={toggleCategory}
          />
        </div>

        {/* シャボン玉キャンバス */}
        <div className="top-page-canvas">
          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <BubbleCanvas
              songs={filteredSongs}
              isPaused={isPaused}
              onBubbleClick={handleBubbleClick}
              onPauseToggle={handlePauseToggle}
              width={canvasSize.width}
              height={canvasSize.height}
              categoryFilter={filterState.categories}
            />
          )}
        </div>

        {/* シャボン玉詳細モーダル */}
        <BubbleDetail
          bubble={selectedBubble}
          songs={filteredSongs}
          onSongClick={handleSongClick}
          onClose={handleCloseDetail}
          onTagClick={handleTagClick}
          onPersonClick={handlePersonClick}
          onSongBubbleClick={handleSongBubbleClick}
        />
      </main>

      <Navigation currentPath="/" onNavigate={handleNavigate} />
    </div>
  )
}

export default TopPage
