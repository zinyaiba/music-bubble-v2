/**
 * Header コンポーネント
 *
 * 全ページで一貫したヘッダーを提供
 * Requirements: 11.1, 11.4
 */

import { useCallback } from 'react'
import './Header.css'

export interface HeaderProps {
  /** ページタイトル */
  title: string
  /** サブタイトル（説明文1行目） */
  subtitle?: string
  /** サブタイトル2（説明文2行目） */
  subtitle2?: string
  /** 戻るボタンを表示するか */
  showBackButton?: boolean
  /** 戻るボタンクリック時のコールバック */
  onBack?: () => void
  /** 右側に表示するアクション要素 */
  rightAction?: React.ReactNode
  /** TOPページ用のリッチタイトル表示 */
  isTopPage?: boolean
}

export function Header({
  title,
  subtitle,
  subtitle2,
  showBackButton = false,
  onBack,
  rightAction,
  isTopPage = false,
}: HeaderProps) {
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }, [onBack])

  return (
    <header className={`header ${isTopPage ? 'header-top-page' : ''}`}>
      <div className="header-content">
        <div className="header-left">
          {showBackButton && (
            <button
              type="button"
              className="header-back-button"
              onClick={handleBack}
              aria-label="戻る"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {isTopPage ? (
          <div className="header-title-section">
            <div className="header-logo">
              <span className="header-logo-icon">🫧</span>
              <div className="header-logo-text">
                <h1 className="header-title header-title-rich">
                  <span className="header-title-name">栗林みな実</span>
                  <span className="header-title-app">Marron Bubbles</span>
                  <span className="header-title-season">~Next Season~</span>
                </h1>
                {subtitle && <p className="header-subtitle">{subtitle}</p>}
                {subtitle2 && <p className="header-subtitle2">{subtitle2}</p>}
              </div>
            </div>
          </div>
        ) : (
          <h1 className="header-title">{title}</h1>
        )}

        <div className="header-right">{rightAction}</div>
      </div>
    </header>
  )
}

export default Header
