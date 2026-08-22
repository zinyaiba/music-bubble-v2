import type { CSSProperties, JSX } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TimelineYearMonthGroup } from '../../types'

interface TimelineCurrentMarkerProps {
  groups: TimelineYearMonthGroup[]
  isMobile: boolean
}

interface Point {
  x: number
  y: number
}

interface DatedPoint extends Point {
  day: number
}

function toLocalCalendarDay(value: string | Date): number | null {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

function getPolylineX(points: Point[], targetY: number): number | null {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]
    const end = points[index + 1]
    const minY = Math.min(start.y, end.y)
    const maxY = Math.max(start.y, end.y)
    if (targetY < minY || targetY > maxY) continue
    if (start.y === end.y) return start.x

    const ratio = (targetY - start.y) / (end.y - start.y)
    return start.x + (end.x - start.x) * ratio
  }
  return null
}

/** DOM上のタイムライン線から、現在日に対応する位置を算出して表示する。 */
export function TimelineCurrentMarker({
  groups,
  isMobile,
}: TimelineCurrentMarkerProps): JSX.Element {
  const markerRef = useRef<HTMLDivElement>(null)
  const [today, setToday] = useState(() => new Date())
  const [position, setPosition] = useState<Point | null>(null)

  // 日付が変わった直後に現在位置を再計算する。
  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = window.setTimeout(
      () => setToday(new Date()),
      nextMidnight.getTime() - now.getTime() + 1000
    )
    return () => window.clearTimeout(timer)
  }, [today])

  useLayoutEffect(() => {
    const marker = markerRef.current
    const inner = marker?.parentElement
    if (!inner) return

    let rafId = 0
    const measure = () => {
      const innerRect = inner.getBoundingClientRect()
      const centerX = innerRect.width / 2
      const linePoints: Point[] = []
      const datedPoints: DatedPoint[] = []
      const rows = inner.querySelectorAll<HTMLElement>('.timeline-group__row[data-timeline-date]')

      rows.forEach((row) => {
        const rowRect = row.getBoundingClientRect()
        if (rowRect.width === 0 && rowRect.height === 0) return

        const top = rowRect.top - innerRect.top
        const bottom = rowRect.bottom - innerRect.top
        let x = centerX

        if (isMobile && !row.classList.contains('timeline-group__row--center')) {
          const connector = row.querySelector<HTMLElement>('.timeline-group__connector')
          if (connector) {
            const connectorRect = connector.getBoundingClientRect()
            x = connectorRect.left - innerRect.left + connectorRect.width / 2
          }
        }

        linePoints.push({ x, y: top }, { x, y: bottom })
        const day = toLocalCalendarDay(row.dataset.timelineDate ?? '')
        if (day !== null) datedPoints.push({ day, x, y: top + rowRect.height / 2 })
      })

      const currentDay = toLocalCalendarDay(today)
      if (currentDay === null || datedPoints.length === 0) {
        setPosition(null)
        return
      }

      const sorted = [...datedPoints].sort((a, b) => a.day - b.day)
      if (currentDay < sorted[0].day || currentDay > sorted[sorted.length - 1].day) {
        setPosition(null)
        return
      }

      const sameDay = sorted.filter((point) => point.day === currentDay)
      let y: number
      let fallbackX: number

      if (sameDay.length > 0) {
        y = sameDay.reduce((sum, point) => sum + point.y, 0) / sameDay.length
        fallbackX = sameDay.reduce((sum, point) => sum + point.x, 0) / sameDay.length
      } else {
        const before = [...sorted].reverse().find((point) => point.day < currentDay)
        const after = sorted.find((point) => point.day > currentDay)
        if (!before || !after) {
          setPosition(null)
          return
        }
        const ratio = (currentDay - before.day) / (after.day - before.day)
        y = before.y + (after.y - before.y) * ratio
        fallbackX = before.x + (after.x - before.x) * ratio
      }

      const x = isMobile ? (getPolylineX(linePoints, y) ?? fallbackX) : centerX
      setPosition((previous) => (previous?.x === x && previous.y === y ? previous : { x, y }))
    }

    const scheduleMeasure = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        measure()
      })
    }

    scheduleMeasure()
    const resizeObserver = new ResizeObserver(scheduleMeasure)
    resizeObserver.observe(inner)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [groups, isMobile, today])

  const style: CSSProperties = position
    ? { left: position.x, top: position.y }
    : { left: 0, top: 0, visibility: 'hidden' }

  return (
    <div
      ref={markerRef}
      className="timeline-container__current-marker"
      style={style}
      role="img"
      aria-label="今日の位置"
    />
  )
}
