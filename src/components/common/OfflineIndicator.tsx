/**
 * OfflineIndicator コンポーネント
 * オフライン状態を表示するインジケーター
 *
 * Requirements: 15.4
 */

import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import './OfflineIndicator.css'

export interface OfflineIndicatorProps {
  /** 表示位置 */
  position?: 'top' | 'bottom'
  /** 常に表示するかどうか（falseの場合はオフライン時のみ表示） */
  alwaysShow?: boolean
}

export function OfflineIndicator({ position = 'top', alwaysShow = false }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus()

  // オンラインで常時表示でない場合は何も表示しない
  if (isOnline && !alwaysShow) {
    return null
  }

  return (
    <div
      className={`offline-indicator offline-indicator--${position} ${isOnline ? 'offline-indicator--online' : 'offline-indicator--offline'}`}
      role="status"
      aria-live="polite"
    >
      <div className="offline-indicator__content">
        {isOnline ? (
          <>
            <svg
              className="offline-indicator__icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.55a11 11 0 0114.08 0" />
              <path d="M1.42 9a16 16 0 0121.16 0" />
              <path d="M8.53 16.11a6 6 0 016.95 0" />
              <circle cx="12" cy="20" r="1" />
            </svg>
            <span className="offline-indicator__text">オンライン</span>
          </>
        ) : (
          <>
            <svg
              className="offline-indicator__icon"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0119 12.55" />
              <path d="M5 12.55a10.94 10.94 0 015.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0122.58 9" />
              <path d="M1.42 9a15.91 15.91 0 014.7-2.88" />
              <path d="M8.53 16.11a6 6 0 016.95 0" />
              <circle cx="12" cy="20" r="1" />
            </svg>
            <span className="offline-indicator__text">オフライン</span>
          </>
        )}
      </div>
    </div>
  )
}

export default OfflineIndicator
