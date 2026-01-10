/**
 * Navigation コンポーネント
 * 
 * 全ページからアクセス可能なボトムナビゲーション
 * Requirements: 11.4, 14.1, 14.2
 */

import { useCallback, useState, useEffect } from 'react';
import { getUnreadAnnouncementCount, READ_ANNOUNCEMENTS_KEY } from '../../data/announcements';
import './Navigation.css';

export interface NavItem {
  /** パス */
  path: string;
  /** ラベル */
  label: string;
  /** アイコン */
  icon: React.ReactNode;
  /** バッジ（未読数など） */
  badge?: number;
}

export interface NavigationProps {
  /** 現在のパス */
  currentPath: string;
  /** ナビゲーションアイテム */
  items?: NavItem[];
  /** ナビゲーションクリック時のコールバック */
  onNavigate?: (path: string) => void;
}

// デフォルトのナビゲーションアイテム
const defaultNavItems: NavItem[] = [
  {
    path: '/',
    label: 'TOP',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    path: '/songs',
    label: '楽曲',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    path: '/tags',
    label: 'タグ一覧',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    path: '/tag-registration',
    label: 'タグ登録',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    path: '/info',
    label: 'お知らせ',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
];

export function Navigation({
  currentPath,
  items = defaultNavItems,
  onNavigate,
}: NavigationProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  // 未読数を取得・更新
  useEffect(() => {
    const updateUnreadCount = () => {
      setUnreadCount(getUnreadAnnouncementCount());
    };

    updateUnreadCount();

    // ストレージの変更を監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === READ_ANNOUNCEMENTS_KEY) {
        updateUnreadCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に更新（同一タブ内での変更を検知）
    const interval = setInterval(updateUnreadCount, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleClick = useCallback(
    (path: string) => {
      if (onNavigate) {
        onNavigate(path);
      }
    },
    [onNavigate]
  );

  // 現在のパスがアクティブかどうかを判定
  const isActive = (path: string): boolean => {
    if (path === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(path);
  };

  // アイテムにバッジを追加
  const itemsWithBadge = items.map(item => {
    if (item.path === '/info' && unreadCount > 0) {
      return { ...item, badge: unreadCount };
    }
    return item;
  });

  return (
    <nav className="navigation" role="navigation" aria-label="メインナビゲーション">
      <ul className="navigation-list">
        {itemsWithBadge.map((item) => (
          <li key={item.path} className="navigation-item">
            <button
              type="button"
              className={`navigation-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => handleClick(item.path)}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <span className="navigation-icon">
                {item.icon}
                {item.badge && item.badge > 0 && (
                  <span className="navigation-badge" aria-label={`${item.badge}件の未読`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span className="navigation-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navigation;
