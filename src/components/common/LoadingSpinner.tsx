/**
 * LoadingSpinner コンポーネント
 * 
 * ローディング状態を表示するスピナー
 * Requirements: 1.5, 11.1
 */

import './LoadingSpinner.css';

export type SpinnerSize = 'small' | 'medium' | 'large';

export interface LoadingSpinnerProps {
  /** スピナーのサイズ */
  size?: SpinnerSize;
  /** ローディングメッセージ */
  message?: string;
  /** フルスクリーン表示 */
  fullScreen?: boolean;
  /** オーバーレイ表示 */
  overlay?: boolean;
}

export function LoadingSpinner({
  size = 'medium',
  message,
  fullScreen = false,
  overlay = false,
}: LoadingSpinnerProps) {
  const spinnerContent = (
    <div className={`loading-spinner-content ${size}`}>
      <div className="spinner" role="status" aria-label="読み込み中">
        <svg
          className="spinner-svg"
          viewBox="0 0 50 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="spinner-track"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
          />
          <circle
            className="spinner-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-fullscreen">
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="loading-spinner-overlay">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="loading-spinner">
      {spinnerContent}
    </div>
  );
}

export default LoadingSpinner;
