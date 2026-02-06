/**
 * BubbleCanvas コンポーネント
 * シャボン玉のアニメーションと一時停止/再開機能を提供
 *
 * Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.5
 * - シャボン玉のアニメーション（10個程度、一定時間で消えて新しいものが生成）
 * - 一時停止/再開機能
 * - アニメーション状態の永続化
 * - カテゴリフィルタ対応（複数選択）
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import type {
  Bubble as BubbleType,
  Song,
  CategoryFilterValue,
  BubbleType as BubbleTypeEnum,
} from '../../types'
import { matchesCategoryFilter } from '../../services/filterService'
import { Bubble } from './Bubble'
import './BubbleCanvas.css'

interface BubbleCanvasProps {
  songs: Song[]
  isPaused: boolean
  onBubbleClick: (bubble: BubbleType) => void
  onPauseToggle: () => void
  width: number
  height: number
  className?: string
  categoryFilter?: CategoryFilterValue[]
  maxBubbles?: number
}

// シャボン玉の色定義（パステルカラー）
const BUBBLE_COLORS: Record<BubbleTypeEnum, string> = {
  song: '#FFB6C1', // パステルピンク - 楽曲
  lyricist: '#87CEEB', // パステル水色 - 作詞家
  composer: '#DDA0DD', // パステル紫 - 作曲家
  arranger: '#FFFACD', // パステル黄色 - 編曲家
  tag: '#98FB98', // パステル黄緑 - タグ
}

// アニメーション設定
const ANIMATION_CONFIG = {
  baseSpeed: 0.8,
  speedVariation: 0.4,
  bounceDecay: 0.9,
  minSize: 60,
  maxSize: 100,
  sizeVariation: 20,
  defaultMaxBubbles: 10, // デフォルト最大シャボン玉数
  bubbleLifetimeBase: 6000, // シャボン玉の基本寿命（ミリ秒）
  bubbleLifetimeVariance: 4000, // 寿命のばらつき（ミリ秒）
  fadeOutDuration: 1000, // フェードアウト時間（ミリ秒）
  spawnInterval: 1500, // 新しいシャボン玉生成間隔（ミリ秒）
}

interface BubbleWithLifetime extends BubbleType {
  createdAt: number
  lifetime: number // 個別の寿命（ミリ秒）
  fadeOutStart?: number
}

interface BubbleSource {
  id: string
  type: BubbleTypeEnum
  name: string
  relatedCount: number
}

/**
 * 楽曲データからシャボン玉ソースを生成
 */
const generateBubbleSources = (songs: Song[]): BubbleSource[] => {
  const sources: BubbleSource[] = []

  // 楽曲
  songs.forEach((song) => {
    sources.push({
      id: `song-${song.id}`,
      type: 'song',
      name: song.title,
      relatedCount:
        (song.lyricists?.length || 0) +
        (song.composers?.length || 0) +
        (song.arrangers?.length || 0) +
        (song.tags?.length || 0),
    })
  })

  // 人物とタグを集計
  const lyricists = new Map<string, number>()
  const composers = new Map<string, number>()
  const arrangers = new Map<string, number>()
  const tags = new Map<string, number>()

  songs.forEach((song) => {
    song.lyricists?.forEach((name) => {
      lyricists.set(name, (lyricists.get(name) || 0) + 1)
    })
    song.composers?.forEach((name) => {
      composers.set(name, (composers.get(name) || 0) + 1)
    })
    song.arrangers?.forEach((name) => {
      arrangers.set(name, (arrangers.get(name) || 0) + 1)
    })
    song.tags?.forEach((tag) => {
      tags.set(tag, (tags.get(tag) || 0) + 1)
    })
  })

  lyricists.forEach((count, name) => {
    sources.push({ id: `lyricist-${name}`, type: 'lyricist', name, relatedCount: count })
  })
  composers.forEach((count, name) => {
    sources.push({ id: `composer-${name}`, type: 'composer', name, relatedCount: count })
  })
  arrangers.forEach((count, name) => {
    sources.push({ id: `arranger-${name}`, type: 'arranger', name, relatedCount: count })
  })
  tags.forEach((count, name) => {
    sources.push({ id: `tag-${name}`, type: 'tag', name, relatedCount: count })
  })

  return sources
}

/**
 * ランダムなシャボン玉を生成
 */
const createBubble = (
  source: BubbleSource,
  width: number,
  height: number,
  instanceId: number
): BubbleWithLifetime => {
  // スマホ判定（幅768px以下）
  const isMobile = width <= 768
  const margin = isMobile ? 50 : 80

  // 栗林みな実の場合は特別に大きいサイズ
  const isKuribayashi = source.name === '栗林みな実'

  // 文字数に応じてサイズを調整（スマホは小さめ）
  // スマホ: 最小55px、1文字あたり+8px、最大95px
  // PC: 最小80px、1文字あたり+12px、最大140px
  // 栗林みな実: スマホ110px、PC140px（固定）
  let size: number
  if (isKuribayashi) {
    size = isMobile ? 110 : 140
  } else {
    const minSize = isMobile ? 55 : 80
    const charMultiplier = isMobile ? 8 : 12
    const maxSize = isMobile ? 95 : 140
    const baseOffset = isMobile ? 35 : 50
    const randomVariation = isMobile ? 10 : 20

    const baseSize = Math.max(minSize, baseOffset + source.name.length * charMultiplier)
    size = Math.min(maxSize, baseSize + Math.random() * randomVariation)
  }

  // 寿命にばらつきを持たせる
  const lifetime =
    ANIMATION_CONFIG.bubbleLifetimeBase + Math.random() * ANIMATION_CONFIG.bubbleLifetimeVariance

  return {
    id: `${source.id}-${instanceId}-${Date.now()}`,
    type: source.type,
    name: source.name,
    x: margin + Math.random() * (width - margin * 2),
    y: margin + Math.random() * (height - margin * 2),
    vx: (Math.random() - 0.5) * ANIMATION_CONFIG.baseSpeed * 2,
    vy: (Math.random() - 0.5) * ANIMATION_CONFIG.baseSpeed * 2,
    size,
    color: BUBBLE_COLORS[source.type],
    opacity: 0.9,
    relatedCount: source.relatedCount,
    createdAt: Date.now(),
    lifetime,
  }
}

/**
 * 配列をシャッフル（Fisher-Yates）
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * BubbleCanvas コンポーネント
 */
export const BubbleCanvas: React.FC<BubbleCanvasProps> = React.memo(
  ({
    songs,
    isPaused,
    onBubbleClick,
    onPauseToggle,
    width,
    height,
    className = '',
    categoryFilter = [],
    maxBubbles = ANIMATION_CONFIG.defaultMaxBubbles,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const spawnTimerRef = useRef<number | null>(null)
    const instanceCounterRef = useRef(0)
    const [bubbles, setBubbles] = useState<BubbleWithLifetime[]>([])
    const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null)

    // シャボン玉ソースを生成
    const bubbleSources = useMemo(() => {
      return generateBubbleSources(songs)
    }, [songs])

    // カテゴリフィルタを適用したソース
    const filteredSources = useMemo(() => {
      if (categoryFilter.length === 0) {
        return bubbleSources
      }
      return bubbleSources.filter((source) => matchesCategoryFilter(source.type, categoryFilter))
    }, [bubbleSources, categoryFilter])

    // 新しいシャボン玉を追加（カテゴリ分布を考慮）
    const spawnBubble = useCallback(() => {
      if (filteredSources.length === 0 || width <= 0 || height <= 0) return

      setBubbles((prev) => {
        // 最大数に達している場合は追加しない
        const activeBubbles = prev.filter((b) => !b.fadeOutStart)
        if (activeBubbles.length >= maxBubbles) {
          return prev
        }

        // 現在のカテゴリ分布を計算
        const categoryCount = new Map<BubbleTypeEnum, number>()
        activeBubbles.forEach((b) => {
          categoryCount.set(b.type, (categoryCount.get(b.type) || 0) + 1)
        })

        // 選択されているカテゴリを取得
        const availableCategories = [...new Set(filteredSources.map((s) => s.type))]

        // 最も少ないカテゴリを優先的に選択
        let targetCategory: BubbleTypeEnum | null = null
        let minCount = Infinity

        for (const cat of availableCategories) {
          const count = categoryCount.get(cat) || 0
          if (count < minCount) {
            minCount = count
            targetCategory = cat
          }
        }

        // 対象カテゴリのソースからランダムに選択
        const targetSources = targetCategory
          ? filteredSources.filter((s) => s.type === targetCategory)
          : filteredSources

        const source = targetSources[Math.floor(Math.random() * targetSources.length)]
        const newBubble = createBubble(source, width, height, instanceCounterRef.current++)

        return [...prev, newBubble]
      })
    }, [filteredSources, width, height, maxBubbles])

    // 初期シャボン玉を生成する関数
    const generateInitialBubbles = useCallback(() => {
      if (filteredSources.length === 0 || width <= 0 || height <= 0) {
        return []
      }

      // カテゴリごとにソースをグループ化
      const sourcesByCategory = new Map<BubbleTypeEnum, BubbleSource[]>()
      filteredSources.forEach((source) => {
        const list = sourcesByCategory.get(source.type) || []
        list.push(source)
        sourcesByCategory.set(source.type, list)
      })

      // 各カテゴリからシャッフルしてソースを選択
      const categories = [...sourcesByCategory.keys()]
      const newBubbles: BubbleWithLifetime[] = []
      const count = Math.min(maxBubbles, filteredSources.length)

      // カテゴリをラウンドロビンで選択し、各カテゴリ内はランダム
      let categoryIndex = 0
      const usedSourceIds = new Set<string>()

      for (let i = 0; i < count; i++) {
        const category = categories[categoryIndex % categories.length]
        const categorySources = sourcesByCategory.get(category) || []

        // このカテゴリからまだ使っていないソースを探す
        const availableSources = categorySources.filter((s) => !usedSourceIds.has(s.id))

        if (availableSources.length > 0) {
          // ランダムに選択
          const source = availableSources[Math.floor(Math.random() * availableSources.length)]
          usedSourceIds.add(source.id)
          newBubbles.push(createBubble(source, width, height, instanceCounterRef.current++))
        } else if (categorySources.length > 0) {
          // 使い切った場合は再利用
          const source = categorySources[Math.floor(Math.random() * categorySources.length)]
          newBubbles.push(createBubble(source, width, height, instanceCounterRef.current++))
        }

        categoryIndex++
      }

      // 最終的にシャッフルして表示順をランダムに
      return shuffleArray(newBubbles)
    }, [filteredSources, width, height, maxBubbles])

    // 初期シャボン玉を設定（filteredSourcesやサイズが変わった時）
    useEffect(() => {
      setBubbles(generateInitialBubbles())
    }, [generateInitialBubbles])

    // シャボン玉の位置と寿命を更新
    const updateBubbles = useCallback(() => {
      const now = Date.now()

      setBubbles((prevBubbles) => {
        return (
          prevBubbles
            .map((bubble) => {
              const { size, createdAt, lifetime } = bubble
              let { x, y, vx, vy, opacity, fadeOutStart } = bubble
              const radius = size / 2

              // 寿命チェック（個別の寿命を使用）
              const age = now - createdAt
              if (!fadeOutStart && age > lifetime) {
                fadeOutStart = now
              }

              // フェードアウト中の透明度計算
              if (fadeOutStart) {
                const fadeProgress = (now - fadeOutStart) / ANIMATION_CONFIG.fadeOutDuration
                opacity = Math.max(0, 0.9 * (1 - fadeProgress))
              }

              // 位置を更新
              x += vx
              y += vy

              // 壁との衝突判定
              if (x - radius < 0) {
                x = radius
                vx = Math.abs(vx) * ANIMATION_CONFIG.bounceDecay
              } else if (x + radius > width) {
                x = width - radius
                vx = -Math.abs(vx) * ANIMATION_CONFIG.bounceDecay
              }

              if (y - radius < 0) {
                y = radius
                vy = Math.abs(vy) * ANIMATION_CONFIG.bounceDecay
              } else if (y + radius > height) {
                y = height - radius
                vy = -Math.abs(vy) * ANIMATION_CONFIG.bounceDecay
              }

              // 速度が小さくなりすぎたらランダムに加速
              const speed = Math.sqrt(vx * vx + vy * vy)
              if (speed < 0.2) {
                vx = (Math.random() - 0.5) * ANIMATION_CONFIG.baseSpeed * 2
                vy = (Math.random() - 0.5) * ANIMATION_CONFIG.baseSpeed * 2
              }

              return { ...bubble, x, y, vx, vy, opacity, fadeOutStart }
            })
            // 完全に消えたシャボン玉を削除
            .filter((bubble) => bubble.opacity > 0.01)
        )
      })
    }, [width, height])

    // アニメーションループ
    useEffect(() => {
      if (isPaused) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        return
      }

      const animate = () => {
        updateBubbles()
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }, [isPaused, updateBubbles])

    // 定期的に新しいシャボン玉を生成
    useEffect(() => {
      if (isPaused) {
        if (spawnTimerRef.current) {
          clearInterval(spawnTimerRef.current)
          spawnTimerRef.current = null
        }
        return
      }

      spawnTimerRef.current = window.setInterval(() => {
        spawnBubble()
      }, ANIMATION_CONFIG.spawnInterval)

      return () => {
        if (spawnTimerRef.current) {
          clearInterval(spawnTimerRef.current)
        }
      }
    }, [isPaused, spawnBubble])

    // シャボン玉クリックハンドラー
    const handleBubbleClick = useCallback(
      (bubble: BubbleType) => {
        setSelectedBubbleId(bubble.id)
        onBubbleClick(bubble)
      },
      [onBubbleClick]
    )

    // キーボードナビゲーション
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (bubbles.length === 0) return

        const currentIndex = selectedBubbleId
          ? bubbles.findIndex((b) => b.id === selectedBubbleId)
          : -1

        let newIndex = currentIndex

        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault()
            newIndex = currentIndex < bubbles.length - 1 ? currentIndex + 1 : 0
            break
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault()
            newIndex = currentIndex > 0 ? currentIndex - 1 : bubbles.length - 1
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (currentIndex >= 0) {
              handleBubbleClick(bubbles[currentIndex])
            }
            return
          case 'Escape':
            e.preventDefault()
            setSelectedBubbleId(null)
            return
          case 'p':
          case 'P':
            e.preventDefault()
            onPauseToggle()
            return
          default:
            return
        }

        if (newIndex >= 0 && newIndex < bubbles.length) {
          setSelectedBubbleId(bubbles[newIndex].id)
        }
      },
      [bubbles, selectedBubbleId, handleBubbleClick, onPauseToggle]
    )

    return (
      <div
        ref={containerRef}
        className={`bubble-canvas ${className} ${isPaused ? 'paused' : ''}`}
        style={{ width: `${width}px`, height: `${height}px` }}
        role="application"
        aria-label={`音楽シャボン玉キャンバス。${bubbles.length}個のシャボン玉が表示されています。`}
        aria-describedby="bubble-canvas-instructions"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* 背景グラデーション */}
        <div className="bubble-canvas-background" aria-hidden="true" />

        {/* シャボン玉を描画 */}
        {bubbles.map((bubble) => (
          <Bubble
            key={bubble.id}
            bubble={bubble}
            onClick={() => handleBubbleClick(bubble)}
            isSelected={bubble.id === selectedBubbleId}
            isPaused={isPaused}
          />
        ))}

        {/* 一時停止/再開ボタン */}
        <button
          className="bubble-canvas-pause-button"
          onClick={onPauseToggle}
          aria-label={isPaused ? 'アニメーションを再開' : 'アニメーションを一時停止'}
          aria-pressed={isPaused}
          title={isPaused ? '再開 (P)' : '一時停止 (P)'}
        >
          {isPaused ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>

        {/* 一時停止オーバーレイ */}
        {isPaused && (
          <div className="bubble-canvas-paused-overlay" aria-hidden="true">
            <span className="paused-text">一時停止中</span>
          </div>
        )}

        {/* アクセシビリティ: 操作説明 */}
        <div id="bubble-canvas-instructions" className="sr-only">
          矢印キーでシャボン玉を選択、EnterまたはSpaceキーで詳細表示、
          Pキーで一時停止/再開、Escapeキーで選択解除。
        </div>

        {/* アクセシビリティ: 動的な通知用 */}
        <div
          id="bubble-canvas-announcements"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </div>
    )
  }
)

BubbleCanvas.displayName = 'BubbleCanvas'

export default BubbleCanvas
