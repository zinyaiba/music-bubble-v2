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
}: TimelineContainerProps): JSX.Element {
  const innerRef = useRef<HTMLDivElement>(null)
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

    setSvgSize({ width: innerRect.width, height: innerRect.height })
    setZigzagPoints(points.join(' '))
  }, [])

  useLayoutEffect(() => {
    if (!isMobile) {
      setZigzagPoints('')
      return
    }

    measureZigzag()

    const inner = innerRef.current
    if (!inner) return

    // 内容サイズ変化（カード展開・折りたたみ・画面回転など）を監視して再測定
    const resizeObserver = new ResizeObserver(() => measureZigzag())
    resizeObserver.observe(inner)
    window.addEventListener('resize', measureZigzag)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', measureZigzag)
    }
  }, [isMobile, measureZigzag, groups])

  // グループが空の場合は何も表示しない
  if (groups.length === 0) {
    return (
      <div className="timeline-container timeline-container--empty">
        <p className="timeline-container__empty-message">
          表示できるタイムラインがありません
        </p>
      </div>
    )
  }

  return (
    <div className="timeline-container">
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
        {groups.map((group) => (
          <TimelineGroup
            key={group.yearMonth}
            group={group}
            onSongClick={onSongClick}
            onLiveClick={onLiveClick}
          />
        ))}
      </div>
    </div>
  )
}

export default TimelineContainer
