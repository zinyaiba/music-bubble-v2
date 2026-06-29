/**
 * MarqueeText コンポーネント
 *
 * テキストがコンテナ幅をはみ出す場合のみ、自動で横スクロール（マーキー）させる。
 * はみ出さない場合は通常テキストとして表示する。
 *
 * 主にライブ一覧でタイトルが長い場合に、スマホなど狭い画面でも
 * 全文を確認できるようにするために使用する。
 *
 * - prefers-reduced-motion を尊重し、アニメーションを抑制する場合はスクロールしない
 * - ResizeObserver でコンテナ/コンテンツのサイズ変化を監視して再判定する
 */

import { useEffect, useRef, useState } from 'react'
import './MarqueeText.css'

export interface MarqueeTextProps {
  /** 表示するテキスト */
  text: string
  /** 付与する追加クラス名（フォントサイズ等の見た目を継承させる用途） */
  className?: string
  /** スクロール速度（px/秒）。大きいほど速い。デフォルト 40 */
  speed?: number
  /** 折り返し用テキスト同士の間隔(px)。デフォルト 48 */
  gap?: number
}

/**
 * MarqueeText コンポーネント
 * テキストがはみ出す場合のみ自動スクロールする
 */
export function MarqueeText({ text, className, speed = 40, gap = 48 }: MarqueeTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) {
      return
    }

    // アニメーション抑制設定を尊重
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const measure = () => {
      const contentWidth = content.scrollWidth
      const containerWidth = container.clientWidth
      const overflow = contentWidth > containerWidth + 1 // 1px の誤差を許容

      if (overflow && !prefersReducedMotion) {
        setIsOverflowing(true)
        // テキスト1周分(コンテンツ幅 + 間隔)を speed(px/秒) で移動する時間
        const distance = contentWidth + gap
        setDuration(distance / speed)
      } else {
        setIsOverflowing(false)
      }
    }

    measure()

    // コンテナ/コンテンツのサイズ変化を監視
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(container)
    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
    }
  }, [text, speed, gap])

  return (
    <span
      ref={containerRef}
      className={`marquee-text ${isOverflowing ? 'marquee-text--scrolling' : ''} ${
        className ?? ''
      }`}
      title={text}
    >
      <span
        ref={contentRef}
        className="marquee-text__content"
        style={
          isOverflowing
            ? ({
                animationDuration: `${duration}s`,
                '--marquee-gap': `${gap}px`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
        {/* スクロール時は途切れないように複製を表示 */}
        {isOverflowing && (
          <span className="marquee-text__clone" aria-hidden="true">
            {text}
          </span>
        )}
      </span>
    </span>
  )
}

export default MarqueeText
