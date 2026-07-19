/**
 * TimelineContainer コンポーネント
 *
 * タイムライン全体のコンテナ。
 * - スクロール可能な縦方向の領域を提供する
 * - 年月グループ（TimelineYearMonthGroup）の配列を受け取り、
 *   受け取った順序を保ったまま各グループを TimelineGroup でレンダリングする
 * - 楽曲／ライブクリックのコールバックを各 TimelineGroup へ伝播する
 * - モバイルでは、全グループを横断する1本のジグザグ線（SVG）を描画する。
 *   これにより年月グループをまたいでも線が連続する。ツアー・単独公演（中央）の
 *   行では線を中央（カード背面）に通す。
 *
 * Requirements:
 * - 1.1: 中央軸を持つスクロール可能な縦方向のタイムラインを表示する
 * - 7.4: 年月グループは時系列順（呼び出し側で決定済みの順序）を保持する
 * - 9.4: レスポンシブ対応（モバイルでも利用可能なレイアウト）
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TimelineYearMonthGroup } from '../../types'
import { TimelineGroup } from './TimelineGroup'
import './TimelineContainer.css'

export interface TimelineContainerProps {
  /** 年月グループの配列（時系列順。順序は呼び出し側で決定済み） */
  groups: TimelineYearMonthGroup[]
  /** 楽曲クリック時のコールバック（各 TimelineGroup へ伝播） */
  onSongClick?: (songId: string) => void
  /** ライブクリック時のコールバック（各 TimelineGroup へ伝播） */
  onLiveClick?: (liveId: string) => void
  /** スクロール位置に対応する年が変わった時のコールバック */
  onActiveYearChange?: (year: string) => void
}

/** モバイル判定用ブレークポイント（TimelineGroup.css と一致させる） */
const MOBILE_QUERY = '(max-width: 767px)'

/**
 * TimelineContainer コンポーネント
 * 年月グループ全体を縦に並べたスクロール可能なタイムラインを表示する。
 */
export function TimelineContainer({
  groups,
  onSongClick,
  onLiveClick,
  onActiveYearChange,
}: TimelineContainerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const activeYearRef = useRef<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [zigzagPoints, setZigzagPoints] = useState('')
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })

  // モバイル判定（メディアクエリ変化を監視）
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  /**
   * 全グループの行を DOM 順（＝縦方向順）に走査し、
   * ジグザグ線のポリライン座標を算出する。
   * - 左右アイテム: ドットのある側（ガター）の x で行の上端→下端を結ぶ
   * - 中央アイテム（ツアー・単独公演）: 中央の x で行の上端→下端を結ぶ（背面を通す）
   */
  const measureZigzag = useCallback(() => {
    const inner = innerRef.current
    if (!inner) return

    const innerRect = inner.getBoundingClientRect()
    const centerX = innerRect.width / 2
    const points: string[] = []

    const rows = inner.querySelectorAll<HTMLElement>('.timeline-group__row')
    rows.forEach((row) => {
      const rowRect = row.getBoundingClientRect()
      if (rowRect.width === 0 && rowRect.height === 0) return

      const top = rowRect.top - innerRect.top
      const bottom = rowRect.bottom - innerRect.top

      let x: number
      if (row.classList.contains('timeline-group__row--center')) {
        // ツアー・単独公演は中央（背面）に線を通す
        x = centerX
      } else {
        // 左右アイテムはドット列（ガター）の中心 x を使う
        const connector = row.querySelector<HTMLElement>('.timeline-group__connector')
        if (!connector) return
        const cRect = connector.getBoundingClientRect()
        x = cRect.left - innerRect.left + cRect.width / 2
      }

      points.push(`${x.toFixed(1)},${top.toFixed(1)}`)
      points.push(`${x.toFixed(1)},${bottom.toFixed(1)}`)
    })

    // 座標・サイズが前回と同じなら state を更新しない（再レンダー抑制）。
    // これにより ResizeObserver 連鎖による無駄な再計算・再描画を防ぐ。
    const nextPoints = points.join(' ')
    setZigzagPoints((prev) => (prev === nextPoints ? prev : nextPoints))
    setSvgSize((prev) =>
      prev.width === innerRect.width && prev.height === innerRect.height
        ? prev
        : { width: innerRect.width, height: innerRect.height }
    )
  }, [])

  // スクロール領域の上部25%にある年を、現在表示中の年として通知する
  useEffect(() => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner || !onActiveYearChange) return

    let rafId = 0
    const updateActiveYear = () => {
      const yearAnchors = Array.from(
        inner.querySelectorAll<HTMLElement>('[id^="timeline-year-"]')
      )
      if (yearAnchors.length === 0) return

      const isAtBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 1
      let activeAnchor = yearAnchors[0]

      if (isAtBottom) {
        activeAnchor = yearAnchors[yearAnchors.length - 1]
      } else {
        const containerRect = container.getBoundingClientRect()
        const referenceY = containerRect.top + Math.min(containerRect.height * 0.25, 160)

        for (const anchor of yearAnchors) {
          if (anchor.getBoundingClientRect().top > referenceY) break
          activeAnchor = anchor
        }
      }

      const activeYear = activeAnchor.id.replace('timeline-year-', '')
      if (activeYear !== activeYearRef.current) {
        activeYearRef.current = activeYear
        onActiveYearChange(activeYear)
      }
    }

    const scheduleUpdate = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updateActiveYear()
      })
    }

    scheduleUpdate()
    container.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(inner)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      container.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver.disconnect()
    }
  }, [groups, onActiveYearChange])

  useLayoutEffect(() => {
    if (!isMobile) return

    const inner = innerRef.current
    if (!inner) return

    // requestAnimationFrame でスロットルし、短時間に連続するサイズ変化
    // （iframe 読み込み・カード展開・画面回転など）を1フレーム1回の測定に集約する。
    // これにより ResizeObserver の連鎖的な発火による負荷スパイクを防ぐ。
    let rafId = 0
    const scheduleMeasure = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        measureZigzag()
      })
    }

    scheduleMeasure()

    // 内容サイズ変化（カード展開・折りたたみ・画面回転など）を監視して再測定
    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(inner)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [isMobile, measureZigzag, groups])

  // グループが空の場合は何も表示しない
  if (groups.length === 0) {
    return (
      <div className="timeline-container timeline-container--empty">
        <p className="timeline-container__empty-message">表示できるタイムラインがありません</p>
      </div>
    )
  }

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-container__inner" ref={innerRef}>
        {/* モバイル用ジグザグ線: 全グループを横断して連続的に結ぶ（カード背面） */}
        {isMobile && zigzagPoints && (
          <svg
            className="timeline-container__zigzag"
            width={svgSize.width}
            height={svgSize.height}
            viewBox={`0 0 ${svgSize.width} ${svgSize.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={zigzagPoints}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* 受け取った順序をそのまま維持してレンダリング */}
        {groups.map((group, index) => {
          const year = group.yearMonth.slice(0, 4)
          const previousYear = groups[index - 1]?.yearMonth.slice(0, 4)
          const yearAnchorId = year !== previousYear ? `timeline-year-${year}` : undefined

          return (
            <TimelineGroup
              key={group.yearMonth}
              group={group}
              anchorId={yearAnchorId}
              onSongClick={onSongClick}
              onLiveClick={onLiveClick}
            />
          )
        })}
      </div>
    </div>
  )
}

export default TimelineContainer
