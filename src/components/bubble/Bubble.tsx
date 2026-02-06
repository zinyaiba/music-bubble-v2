/**
 * Bubble コンポーネント
 * シャボン玉の描画とクリックイベントを処理
 *
 * Requirements: 1.1, 1.2
 * - シャボン玉の描画
 * - クリックイベント
 */

import React, { useCallback, useMemo } from 'react'
import type { Bubble as BubbleType } from '../../types'
import './Bubble.css'

interface BubbleProps {
  bubble: BubbleType
  onClick: () => void
  isSelected?: boolean
  isPaused?: boolean
}

/**
 * 栗林みな実かどうかを判定
 */
const isKuribayashiMinami = (name: string): boolean => {
  return name === '栗林みな実'
}

/**
 * シャボン玉コンポーネント
 * ガラスモーフィズム効果を適用したシャボン玉を描画
 * 栗林みな実の場合は栗の形で表示
 */
export const Bubble: React.FC<BubbleProps> = React.memo(
  ({ bubble, onClick, isSelected = false, isPaused = false }) => {
    const { x, y, size, color, opacity, name, type } = bubble

    // 栗林みな実かどうか
    const isChestnutShape = useMemo(() => isKuribayashiMinami(name), [name])

    // 表示名を計算（タグの場合は#プレフィックスを追加）
    const displayName = useMemo(() => {
      return type === 'tag' ? `#${name}` : name
    }, [type, name])

    // フォントサイズを計算（文字数に応じて調整）
    const fontSize = useMemo(() => {
      const textLength = type === 'tag' ? name.length + 1 : name.length // タグは#を含む

      // 文字数に応じてフォントサイズを調整
      // 短い文字（5文字以下）: 大きめ
      // 中程度（6-10文字）: 標準
      // 長い文字（11文字以上）: 小さめ
      let baseFontSize = size * 0.22

      if (textLength > 15) {
        baseFontSize = size * 0.14 // 非常に長い文字
      } else if (textLength > 10) {
        baseFontSize = size * 0.16 // 長い文字
      } else if (textLength > 7) {
        baseFontSize = size * 0.18 // 中程度
      } else if (textLength > 5) {
        baseFontSize = size * 0.2 // やや短い
      }

      return Math.max(9, Math.min(16, baseFontSize))
    }, [size, name, type])

    // クリックハンドラー
    const handleClick = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      },
      [onClick]
    )

    // キーボードハンドラー
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      },
      [onClick]
    )

    // タイプに応じたアイコンを取得
    const typeIcon = useMemo(() => {
      switch (type) {
        case 'song':
          return '🎵'
        case 'lyricist':
          return '✍️'
        case 'composer':
          return '🎼'
        case 'arranger':
          return '🎧'
        case 'tag':
          return '🏷️'
        default:
          return '💫'
      }
    }, [type])

    // スタイルを計算
    const bubbleStyle = useMemo(
      () =>
        ({
          left: `${x}px`,
          top: `${y}px`,
          width: `${size}px`,
          height: `${size}px`,
          opacity: opacity,
          '--bubble-color': color,
          '--bubble-size': `${size}px`,
          fontSize: `${fontSize}px`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }) as React.CSSProperties,
      [x, y, size, opacity, color, fontSize, isPaused]
    )

    return (
      <div
        className={`bubble bubble-type-${type} ${isSelected ? 'bubble-selected' : ''} ${isChestnutShape ? 'bubble-chestnut' : ''}`}
        style={bubbleStyle}
        onClick={handleClick}
        onTouchEnd={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${typeIcon} ${displayName}。関連データ${bubble.relatedCount}件`}
        aria-pressed={isSelected}
        data-bubble-id={bubble.id}
        data-bubble-type={type}
      >
        {/* ガラスモーフィズム効果のレイヤー */}
        <div className="bubble-glass-layer" />

        {/* ハイライト効果 */}
        <div className="bubble-highlight" />

        {/* コンテンツ */}
        <div className="bubble-content">
          <span className="bubble-name">{displayName}</span>
        </div>

        {/* 栗の座（底の部分、栗林みな実の場合のみ） */}
        {isChestnutShape && <div className="bubble-chestnut-base" aria-hidden="true" />}

        {/* 選択時のインジケーター */}
        {isSelected && <div className="bubble-selection-indicator" aria-hidden="true" />}
      </div>
    )
  }
)

Bubble.displayName = 'Bubble'

export default Bubble
