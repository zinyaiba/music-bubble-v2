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
 * 案内セクションの型定義
 */
interface InfoSection {
  id: string
  title: string
  content: string
  icon: string
}

type InfoTab = 'announcements' | 'introduction' | 'howto'

/**
 * はじめにセクションデータ
 */
const introductionSections: InfoSection[] = [
  {
    id: 'introduction-artist',
    title: '栗林みな実さんについて',
    content: `
**公式アカウント**
- [X：@minamiracle6_6](https://x.com/minamiracle6_6)
- [YouTube：栗林みな実 Official Channel](https://www.youtube.com/@MinamiKuribayashi0611)`,
    icon: '🎤',
  },
  {
    id: 'introduction-about',
    title: 'このサイトについて',
    content: `「栗林みな実 Marron Bubbles ~Next Season~」は、栗林みな実さんの楽曲・ライブ情報を栗家族のみなさんと一緒に集め、活動の歴史を振り返りながら新しい魅力を発見するための**非公式のファンサイト**です。

ご本人・所属事務所・レコード会社などの公式関係者が運営するサイトではありません。`,
    icon: '🌰',
  },
  {
    id: 'introduction-song-regulations',
    title: '登録楽曲のレギュレーション',
    content: `本サイトでは、次のいずれかに該当する楽曲を登録対象とします。

- 栗林みな実さんご本人が歌唱している楽曲（Minami名義を含む）
- 栗林みな実さんご本人が作詞・作曲・編曲のいずれかに**関わっている楽曲**

ただし、**カラオケ配信でのみ歌唱した楽曲は登録対象外**とします。`,
    icon: '📋',
  },
  {
    id: 'introduction-content-policy',
    title: '関連コンテンツの掲載方針',
    content: `楽曲・ライブページで登録できる動画・音源の「関連コンテンツ」は、**公式アカウントや公式配信元が公開しているものに限定**します。

非公式アップロード、無断転載、出所を確認できないコンテンツは登録しないでください。掲載内容に問題がある場合は、管理人の判断で修正または削除することがあります。`,
    icon: '✅',
  },
  {
    id: 'introduction-editing',
    title: '情報の登録・編集について',
    content: `本サイトの楽曲・ライブ・タグ情報は、みなさんで登録・編集できます。

- 公式サイトや公式SNSなど、信頼できる情報源を確認して登録してください
- 個人情報や、公開されていない情報は入力しないでください
- 掲載情報に誤りや不足がある場合は、修正へのご協力をお願いします

情報の正確性・完全性は保証していません。最新情報は必ず公式サイトや公式SNSでご確認ください。`,
    icon: '✏️',
  },
  {
    id: 'introduction-contact',
    title: '管理人・お問い合わせ',
    content: `管理人: [@kentaro_uechan](https://x.com/kentaro_uechan)

不具合の報告、掲載内容の訂正・削除依頼、サイトへのご意見は、管理人のXアカウントまでご連絡ください。掲載されている作品名・画像・音源などの権利は、それぞれの権利者に帰属します。`,
    icon: '📮',
  },
  {
    id: 'introduction-contributors',
    title: 'データ提供・ご協力',
    content: `本サイトのライブ情報には、栗家族のみなさんから提供・登録いただいたデータを活用しています。ご協力いただいたみなさんに、心より感謝申し上げます。

**データベース提供元**
- [ましまろさん（@tap_mashimaro）](https://x.com/tap_mashimaro)
- [栗林みな実ライブ歌唱曲データベース](https://x.com/tap_mashimaro/status/2065056705944469636?s=20)

**登録協力**
- [＊Miki＊さん（@miki_68）](https://x.com/miki_68)

匿名で登録できる仕組みのため、ここでは管理人が把握している方のみ掲載しています。掲載を希望される協力者の方は、管理人までご連絡ください。`,
    icon: '🤝',
  },
]

/**
 * 使い方セクションデータ
 */
const howToSections: InfoSection[] = [
  {
    id: 'how-to-bubble',
    title: 'TOP：シャボン玉から魅力を発見',
    content: `TOPページでは、楽曲・作詞家・作曲家・編曲家・タグがシャボン玉として表示されます。

- **アーティスト**: 栗林みな実、Minami、ワイルド三人娘、その他から絞り込み
- **カテゴリ**: 楽曲・作詞・作曲・編曲・タグを複数選択して表示
- **表示数**: スライダーや＋／−ボタンで1〜15個に変更
- シャボン玉をタップして詳細や関連楽曲を確認
- 一時停止ボタンでアニメーションを停止・再開`,
    icon: '🫧',
  },
  {
    id: 'how-to-songs',
    title: '楽曲：検索・閲覧・登録',
    content: `楽曲ページでは、登録されている楽曲を一覧で確認できます。

- タイトル、アーティスト、作詞、作曲、編曲、タグなどで検索
- 並び順、表示形式、関連コンテンツの有無、日付で絞り込み
- 楽曲をタップして、クレジット・リリース情報・公式の関連コンテンツなどを確認
- 右下の＋ボタンから新しい楽曲を登録
- 右下のタグ型ボタンからタグページを開く
- 詳細ページの編集ボタンから情報を更新`,
    icon: '🎵',
  },
  {
    id: 'how-to-karaoke',
    title: 'カラオケ：歌唱曲を探す・登録する',
    content: `カラオケページでは、主にFC（ファンクラブ）内で行われているカラオケ配信の歌唱曲情報を掲載しています。

- 楽曲ページ右下のマイクボタンから、カラオケ歌唱一覧を開く
- 一覧から歌唱曲の情報や配信回を確認
- カラオケ歌唱曲の新規登録・編集・削除が可能`,
    icon: '🎙️',
  },
  {
    id: 'how-to-related-content',
    title: '関連コンテンツ：公式動画などを登録',
    content: `楽曲・ライブの登録／編集画面では、YouTubeなどの公式コンテンツを関連情報として登録できます。

- PC版YouTubeで登録したい動画を開く
- **共有**ボタンから**埋め込む**を選び、表示されたiframeコードをコピー
- 楽曲またはライブの登録／編集画面にある「関連コンテンツ」欄へ貼り付けて保存
- 詳しい取得手順は[YouTubeヘルプ「動画と再生リストを埋め込む」](https://support.google.com/youtube/answer/171780?hl=ja)を参照

登録する動画は、**公式チャンネルや公式配信元が公開しているものに限定**してください。非公式アップロードや無断転載のコンテンツは登録しないでください。`,
    icon: '🎬',
  },
  {
    id: 'how-to-lives',
    title: 'ライブ：公演・セットリストを探す',
    content: `ライブページでは、単独公演・ツアー・フェスなどの情報を確認できます。ツアーは公演ごとにまとまって表示されます。

- キーワード検索、並び順、公演種別、開催年月、開催地などで絞り込み
- 詳細ページで開催日・会場・セットリスト・公式の関連コンテンツを確認
- セットリストの楽曲から楽曲詳細へ移動
- 右下の＋ボタンからライブを登録し、詳細ページから編集`,
    icon: '🎤',
  },
  {
    id: 'how-to-timeline',
    title: 'タイムライン：楽曲とライブの歴史をたどる',
    content: `タイムラインページでは、楽曲のリリースとライブ活動を同じ時系列上で振り返ることができます。

- メインメニューの「タイムライン」から表示
- 「新しい順」「古い順」を切り替えて時系列を変更
- 年別ショートカットから見たい年代へすばやく移動
- 楽曲・ライブのカードをタップして詳細を確認
- シングル／アルバムやツアーのカードを展開して、収録楽曲や各公演を確認`,
    icon: '🗓️',
  },
  {
    id: 'how-to-tags',
    title: '楽曲内のタグ：楽曲をつなげて楽しむ',
    content: `タグページは、楽曲ページ右下の**タグマークのボタン**から開けます。「タグ一覧」と「タグ登録」の2つのタブに分かれています。

- **タグ一覧**: タグを検索・並び替えし、関連楽曲を確認
- **タグ登録**: 楽曲を選んでタグを追加・削除
- タグ詳細からタグ名の変更・削除、Xへの共有が可能
- タグページの戻るボタンから楽曲一覧へ戻る

作品やテーマ、思い出など、楽曲の新しい楽しみ方が伝わるタグを登録してみてください。`,
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
 * 関連紹介カードの型定義
 */
interface RelatedIntroduction {
  id: string
  title: string
  manager: string
  url: string
  description: string
}

/**
 * 関連紹介データ
 *
 * 管理人がカードを追加する場合は、以下の配列にデータを追記してください。
 */
const relatedIntroductions: RelatedIntroduction[] = [
  // {
  //   id: 'sample-fan-site',
  //   title: '栗林みな実さん応援ファンサイト（サンプル）',
  //   manager: '栗家族Aさん',
  //   url: 'https://example.com/fan-site',
  //   description:
  //     '栗林みな実さんの活動情報や楽曲の感想を紹介しているファンサイトです。こちらは表示確認用のサンプルデータです。',
  // },
  // {
  //   id: 'sample-live-database',
  //   title: 'ライブ情報データベース（サンプル）',
  //   manager: '栗家族Bさん',
  //   url: 'https://example.com/live-database',
  //   description:
  //     'これまでのライブやイベント情報をまとめたデータベースです。こちらはカードレイアウト確認用のサンプルデータです。',
  // },
]

/**
 * InfoPage コンポーネント
 */
export function InfoPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<InfoTab | 'related'>('announcements')

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
      <Header
        title="お知らせ・はじめに・使い方・関連紹介"
        showBackButton
        onBack={() => navigate('/')}
      />

      <main className="info-page__main">
        {/* タブ切り替え */}
        <div className="info-page__tabs">
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'announcements' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            お知らせ
            {unreadCount > 0 && <span className="info-page__badge">{unreadCount}</span>}
          </button>
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'introduction' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('introduction')}
          >
            はじめに
          </button>
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'howto' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('howto')}
          >
            使い方
          </button>
          <button
            type="button"
            className={`info-page__tab ${activeTab === 'related' ? 'info-page__tab--active' : ''}`}
            onClick={() => setActiveTab('related')}
          >
            関連紹介
          </button>
        </div>

        {/* 関連紹介タブ */}
        {activeTab === 'related' && (
          <div className="info-page__content">
            {relatedIntroductions.length > 0 ? (
              <div className="info-page__related-list">
                {relatedIntroductions.map((item) => (
                  <article key={item.id} className="info-page__related-item">
                    <h2 className="info-page__related-title">{item.title}</h2>
                    <dl className="info-page__related-details">
                      <div className="info-page__related-detail">
                        <dt>管理者</dt>
                        <dd>{item.manager}</dd>
                      </div>
                      <div className="info-page__related-detail">
                        <dt>URL</dt>
                        <dd>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.url}
                            <span aria-hidden="true"> ↗</span>
                          </a>
                        </dd>
                      </div>
                    </dl>
                    <p className="info-page__related-description">{item.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="info-page__related-empty">関連紹介は現在準備中です。</p>
            )}
          </div>
        )}

        {/* はじめにタブ */}
        {activeTab === 'introduction' && (
          <div className="info-page__content">
            <div className="info-page__howto-list">
              {introductionSections.map((section) => (
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
