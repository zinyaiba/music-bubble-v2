/**
 * Header コンポーネント
 * 
 * 全ページで一貫したヘッダーを提供
 * Requirements: 11.1, 11.4
 */

import { useCallback } from 'react';
import './Header.css';

export interface HeaderProps {
  /** ページタイトル */
  title: string;
  /** 戻るボタンを表示するか */
  showBackButton?: boolean;
  /** 戻るボタンクリック時のコールバック */
  onBack?: () => void;
  /** 右側に表示するアクション要素 */
  rightAction?: React.ReactNode;
}

export function Header({
  title,
  showBackButton = false,
  onBack,
  rightAction,
}: HeaderProps) {
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  }, [onBack]);

  return (
    <header className="header">
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

        <h1 className="header-title">{title}</h1>

        <div className="header-right">
          {rightAction}
        </div>
      </div>
    </header>
  );
}

export default Header;
