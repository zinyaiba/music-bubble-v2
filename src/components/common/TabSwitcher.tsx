/**
 * TabSwitcher コンポーネント
 * タブの切り替えUIを提供
 *
 * Requirements:
 * - 2.1: タブインターフェースを表示すること
 */

import { useCallback } from 'react'
import './TabSwitcher.css'

export interface TabItem {
  /** タブID */
  id: string
  /** タブラベル */
  label: string
}

export interface TabSwitcherProps {
  /** タブアイテム */
  tabs: TabItem[]
  /** アクティブなタブID */
  activeTab: string
  /** タブ変更時のコールバック */
  onTabChange: (tabId: string) => void
}

/**
 * TabSwitcher コンポーネント
 * タブの切り替えUIを実装
 */
export function TabSwitcher({ tabs, activeTab, onTabChange }: TabSwitcherProps) {
  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId !== activeTab) {
        onTabChange(tabId)
      }
    },
    [activeTab, onTabChange]
  )

  return (
    <div className="tab-switcher" role="tablist" aria-label="タブ切り替え">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          className={`tab-switcher__tab ${activeTab === tab.id ? 'tab-switcher__tab--active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          id={`tab-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
      <div
        className="tab-switcher__indicator"
        style={{
          width: `${100 / tabs.length}%`,
          transform: `translateX(${tabs.findIndex((t) => t.id === activeTab) * 100}%)`,
        }}
      />
    </div>
  )
}

export default TabSwitcher
