/**
 * InfoPage コンポーネント
 * お知らせ・使い方ページ
 *
 * Requirements:
 * - 9.1: 使い方の説明を表示すること
 * - 9.2: 管理者からのお知らせとアップデート情報を表示すること
 * - 9.3: お知らせを新しい順に表示すること
 * - 9.4: お知らせコンテンツのマークダウン形式をサポートすること
 * - 9.5: お知らせの既読状態をローカルストレージに保存すること
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnalyticsEvents, trackEvent } from '../services/analyticsService'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import {
  announcements,
  getReadAnnouncementIds,
  READ_ANNOUNCEMENTS_KEY,
} from '../data/announcements'
import type { Announcement } from '../data/announcements'
import './InfoPage.css'

/**
 * 使い方セクションの型定義
 */
interface HowToSection {
  id: string
  title: string
  content: string
  icon: string
}

/**
 * 使い方セクションデータ
 */
const howToSections: HowToSection[] = [
  {
    id: 'how-to-bubble',
    title: 'シャボン玉で楽曲を探索',
    content: `TOPページでは、楽曲・アーティスト・タグがシャボン玉として表示されます。

- シャボン玉をタップすると詳細情報が表示されます
- 楽曲のシャボン玉からは詳細ページに移動できます
- 一時停止ボタンでアニメーションを止められます`,
    icon: '🫧',
  },
  {
    id: 'how-to-filter',
    title: 'フィルタで絞り込み',
    content: `TOPページのフィルタ機能で、表示する楽曲を絞り込めます。

- **アーティストフィルタ**: 栗林みな実、Minami、その他から選択
- **ジャンルフィルタ**: 選択したアーティストの楽曲のジャンルで絞り込み`,
    icon: '🔍',
  },
  {
    id: 'how-to-songs',
    title: '楽曲を管理',
    content: `楽曲ページでは、登録されている全ての楽曲を閲覧・検索できます。

- 検索バーでタイトル、アーティスト名などで検索
- 楽曲をタップすると詳細ページへ
- 詳細ページでは埋め込みプレイヤーや外部リンクを表示`,
    icon: '🎵',
  },
  {
    id: 'how-to-tags',
    title: 'タグで整理',
    content: `タグ機能で楽曲を自由に分類できます。

- **タグ一覧**: 登録されているタグと楽曲数を確認
- **タグ登録**: 楽曲にタグを追加・削除
- **SNS共有**: タグ情報をX（Twitter）で共有`,
    icon: '🏷️',
  },
]

/**
 * 既読お知らせIDを保存
 */
function saveReadAnnouncementIds(ids: string[]): void {
  try {
    localStorage.setItem(READ_ANNOUNCEMENTS_KEY, JSON.stringify(ids))
  } catch (e) {
    console.error('既読状態の保存に失敗しました:', e)
  }
}

/**
 * 簡易マークダウンパーサー
 * Requirements: 9.4 - マークダウン形式をサポート
 */
function parseMarkdown(text: string): string {
  return (
    text
      // 太字 **text**
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // 斜体 *text*
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // リンク [text](url)
      .replace(
        /\[(.+?)\]\((.+?)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      )
      // 改行
      .replace(/\n/g, '<br />')
  )
}

/**
 * 日付をフォーマット
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * お知らせタイプのラベルを取得
 */
function getAnnouncementTypeLabel(type: Announcement['type']): string {
  switch (type) {
    case 'update':
      return 'アップデート'
    case 'feature':
      return '新機能'
    case 'notice':
      return 'お知らせ'
    default:
      return 'お知らせ'
  }
}

/**
 * InfoPage コンポーネント
 */
export function InfoPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'howto' | 'announcements'>('howto')

  // 既読状態を初期化時に取得
  const [readIds, setReadIds] = useState<string[]>(() => getReadAnnouncementIds())

  // ページ閲覧トラッキング
  useEffect(() => {
    trackEvent(AnalyticsEvents.ページ閲覧_お知らせ)
  }, [])

  // お知らせを新しい順にソート (Requirements: 9.3)
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [])

  // 未読のお知らせ数
  const unreadCount = useMemo(() => {
    return sortedAnnouncements.filter((ann) => !readIds.includes(ann.id)).length
  }, [sortedAnnouncements, readIds])

  // お知らせを既読にする (Requirements: 9.5)
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev
      const newIds = [...prev, id]
      saveReadAnnouncementIds(newIds)
      return newIds
    })
  }, [])

  // 全てのお知らせを既読にする
  const markAllAsRead = useCallback(() => {
    const allIds = sortedAnnouncements.map((ann) => ann.id)
    setReadIds(allIds)
    saveReadAnnouncementIds(allIds)
  }, [sortedAnnouncements])

  // ナビゲーション
  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path)
    },
    [navigate]
  )

  return (
    <div className="info-page">
      <Header title="お知らせ・使い方" showBackButton onBack={() => navigate('/')} />

      <main className="info-page__main">
        {/* タブ切り替え */}
        <div className="info-page__tabs">
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'howto' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('howto')}
          >
            使い方
          </button>
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'announcements' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            お知らせ
            {unreadCount > 0 && <span className="info-page__badge">{unreadCount}</span>}
          </button>
        </div>

        {/* 使い方タブ (Requirements: 9.1) */}
        {activeTab === 'howto' && (
          <div className="info-page__content">
            <div className="info-page__howto-list">
              {howToSections.map((section) => (
                <article key={section.id} className="info-page__howto-item">
                  <div className="info-page__howto-icon">{section.icon}</div>
                  <div className="info-page__howto-content">
                    <h2 className="info-page__howto-title">{section.title}</h2>
                    <div
                      className="info-page__howto-text"
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(section.content),
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* お知らせタブ (Requirements: 9.2, 9.3) */}
        {activeTab === 'announcements' && (
          <div className="info-page__content">
            {/* 全て既読ボタン */}
            {unreadCount > 0 && (
              <div className="info-page__actions">
                <button type="button" className="info-page__mark-all-read" onClick={markAllAsRead}>
                  すべて既読にする
                </button>
              </div>
            )}

            <div className="info-page__announcement-list">
              {sortedAnnouncements.map((announcement) => {
                const isRead = readIds.includes(announcement.id)
                return (
                  <article
                    key={announcement.id}
                    className={`info-page__announcement-item ${
                      isRead ? 'info-page__announcement-item--read' : ''
                    }`}
                    onClick={() => markAsRead(announcement.id)}
                  >
                    <div className="info-page__announcement-header">
                      <span
                        className={`info-page__announcement-type info-page__announcement-type--${announcement.type}`}
                      >
                        {getAnnouncementTypeLabel(announcement.type)}
                      </span>
                      <time className="info-page__announcement-date">
                        {formatDate(announcement.date)}
                      </time>
                      {!isRead && <span className="info-page__unread-dot" aria-label="未読" />}
                    </div>
                    <h2 className="info-page__announcement-title">{announcement.title}</h2>
                    <div
                      className="info-page__announcement-content"
                      dangerouslySetInnerHTML={{
                        __html: parseMarkdown(announcement.content),
                      }}
                    />
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <Navigation currentPath="/info" onNavigate={handleNavigate} />
    </div>
  )
}

export default InfoPage
