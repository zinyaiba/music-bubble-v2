/**
 * TopPage コンポーネント
 * TOPページ - シャボン玉表示とフィルタ機能を統合
 *
 * Requirements:
 * - 1.1: シャボン玉表示
 * - 1.5: ローディング状態の表示
 * - 3.1: アーティストフィルタ表示（インライン）
 * - 4.1: カテゴリフィルタ表示（楽曲・作詞・作曲・編曲・タグ、複数選択可能）
 * - 15.1, 15.2, 15.4: エラーハンドリング
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Bubble as BubbleType } from '../types'
import { cacheService } from '../services/cacheService'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { useFilter, useDataFetch } from '../hooks'
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

  // 楽曲データの取得（エラーハンドリング統合）
  const { songs, isLoading, error, isOffline, retry } = useDataFetch()

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_トップ)
  }, [])

  // アニメーション状態
  const [isPaused, setIsPaused] = useState(() => cacheService.getAnimationPaused())

  // シャボン玉表示数
  const [bubbleCount, setBubbleCount] = useState(() => cacheService.getBubbleCount())

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
      // TOPページ用のリッチヘッダー、フィルタバー、ナビゲーションの高さを考慮
      const headerHeight = 90 // TOPページ用のリッチヘッダー高さ
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

  // 一時停止/再開のトグル
  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      const newValue = !prev
      cacheService.setAnimationPaused(newValue)
      return newValue
    })
  }, [])

  // シャボン玉表示数の変更
  const handleBubbleCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = parseInt(e.target.value, 10)
    setBubbleCount(newCount)
    cacheService.setBubbleCount(newCount)
  }, [])

  // シャボン玉表示数を増減
  const handleBubbleCountIncrement = useCallback(() => {
    setBubbleCount((prev) => {
      const newCount = Math.min(15, prev + 1)
      cacheService.setBubbleCount(newCount)
      return newCount
    })
  }, [])

  const handleBubbleCountDecrement = useCallback(() => {
    setBubbleCount((prev) => {
      const newCount = Math.max(1, prev - 1)
      cacheService.setBubbleCount(newCount)
      return newCount
    })
  }, [])

  // シャボン玉クリック
  const handleBubbleClick = useCallback((bubble: BubbleType) => {
    trackEvent(AnalyticsEvents.バブル_タップ, {
      bubble_type: bubble.type,
      bubble_name: bubble.name,
    })
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
    
    // 栗林みな実の場合は大きめのサイズ
    const bubbleSize = personName === '栗林みな実' ? 110 : 80
    
    const newBubble: BubbleType = {
      id: `${type}-${personName}-${Date.now()}`,
      type,
      name: personName,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: bubbleSize,
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

  // ローディング中
  if (isLoading && songs.length === 0) {
    return (
      <div className="top-page">
        <Header 
          title="栗林みな実 Marron Bubbles ~Next Season~"
          subtitle="栗家族みんなでつくる楽曲情報サイト"
          subtitle2="楽曲の新たな魅力を発見・登録してみましょう"
          isTopPage
        />
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
      <Header 
        title="栗林みな実 Marron Bubbles ~Next Season~"
        subtitle="栗家族みんなでつくる楽曲情報サイト"
        subtitle2="楽曲の新たな魅力を発見・登録してみましょう"
        isTopPage
      />

      <main className="top-page-main">
        {/* エラーメッセージ */}
        {error && (
          <div className="top-page-error">
            <ErrorMessage
              message={error}
              type={isOffline || error.includes('オフライン') ? 'warning' : 'error'}
              onRetry={isOffline || error.includes('オフライン') ? undefined : retry}
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

        {/* シャボン玉表示数スライダー */}
        <div className="top-page-bubble-slider">
          <label htmlFor="bubble-count-slider" className="bubble-slider-label">
            <span className="bubble-slider-icon">🫧</span>
            <span className="bubble-slider-text">表示数</span>
          </label>
          <button
            type="button"
            className="bubble-slider-btn"
            onClick={handleBubbleCountDecrement}
            disabled={bubbleCount <= 1}
            aria-label="シャボン玉を減らす"
          >
            −
          </button>
          <input
            id="bubble-count-slider"
            type="range"
            min="1"
            max="15"
            value={bubbleCount}
            onChange={handleBubbleCountChange}
            className="bubble-slider-input"
            aria-label={`シャボン玉の表示数: ${bubbleCount}個`}
          />
          <button
            type="button"
            className="bubble-slider-btn"
            onClick={handleBubbleCountIncrement}
            disabled={bubbleCount >= 15}
            aria-label="シャボン玉を増やす"
          >
            +
          </button>
          <span className="bubble-slider-value">{bubbleCount}</span>
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
              maxBubbles={bubbleCount}
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
