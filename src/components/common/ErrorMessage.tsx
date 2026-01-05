/**
 * ErrorMessage コンポーネント
 * 
 * エラーメッセージを表示し、リトライオプションを提供
 * Requirements: 15.1, 15.2
 */

import './ErrorMessage.css';

export type ErrorType = 'error' | 'warning' | 'info';

export interface ErrorMessageProps {
  /** エラーメッセージ */
  message: string;
  /** エラータイプ */
  type?: ErrorType;
  /** リトライボタンのコールバック */
  onRetry?: () => void;
  /** リトライボタンのラベル */
  retryLabel?: string;
  /** 詳細メッセージ（折りたたみ表示） */
  details?: string;
  /** フルスクリーン表示 */
  fullScreen?: boolean;
}

export function ErrorMessage({
  message,
  type = 'error',
  onRetry,
  retryLabel = '再試行',
  details,
  fullScreen = false,
}: ErrorMessageProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      case 'error':
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
    }
  };

  const content = (
    <div className={`error-message-content ${type}`} role="alert">
      <div className="error-icon">{getIcon()}</div>
      <div className="error-body">
        <p className="error-text">{message}</p>
        {details && (
          <details className="error-details">
            <summary>詳細を表示</summary>
            <pre className="error-details-text">{details}</pre>
          </details>
        )}
      </div>
      {onRetry && (
        <button
          type="button"
          className="error-retry-button"
          onClick={onRetry}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
          </svg>
          {retryLabel}
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="error-message-fullscreen">
        {content}
      </div>
    );
  }

  return (
    <div className="error-message">
      {content}
    </div>
  );
}

export default ErrorMessage;
