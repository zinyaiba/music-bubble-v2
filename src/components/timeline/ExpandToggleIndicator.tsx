import './ExpandToggleIndicator.css'

interface ExpandToggleIndicatorProps {
  isExpanded: boolean
}

/** 展開状態と操作を「＋ 開く / − 閉じる」で明示する共通表示 */
export function ExpandToggleIndicator({ isExpanded }: ExpandToggleIndicatorProps) {
  return (
    <span
      className={`expand-toggle-indicator ${isExpanded ? 'expand-toggle-indicator--expanded' : ''}`}
      aria-hidden="true"
    >
      <svg
        className="expand-toggle-indicator__icon"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M5 12h14" />
        {!isExpanded && <path d="M12 5v14" />}
      </svg>
      <span>{isExpanded ? '閉じる' : '開く'}</span>
    </span>
  )
}
