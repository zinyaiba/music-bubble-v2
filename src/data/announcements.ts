/**
 * お知らせデータ
 * 
 * InfoPageとNavigationで共通で使用するお知らせデータ
 */

export interface Announcement {
  id: string
  title: string
  content: string
  date: string
  type: 'update' | 'notice' | 'feature'
}

/**
 * お知らせデータ（静的データ）
 * 実際の運用ではFirebaseから取得することも可能
 */
export const announcements: Announcement[] = [
  {
    id: 'ann-2026-01-12',
    title: 'アップデート情報',
    content: `以下のアップデートを行いました。

**主な改善点:**
- タグ登録一覧画面でスクロールがしづらい問題を改善
- レイアウトの微調整`,
    date: '2026-01-12',
    type: 'update',
  },
  {
    id: 'ann-2026-01-11-3',
    title: 'アーティスト名是正ご協力のお願い',
    content: `新機能の追加に伴い、アーティスト名を登録いただけると助かります！

アーティスト名を途中で追加したことに伴い、アーティスト名が未登録の楽曲が多いため、
ぜひ登録・編集いただけると助かります。栗林みな実・Minamiも区別できるようになりましたので、
実際の名義に合わせてご登録いただけたらと思っています。
是非データを充実させていきましょう！`,
    date: '2026-01-11',
    type: 'notice',
  },
  {
    id: 'ann-2026-01-11-2',
    title: '新機能のお知らせ',
    content: `マロバブNextSeasonで追加された新機能をご紹介！

**新機能:**
- 楽曲一覧で「発売日のみ・作曲者のみ」といった表示方法を追加
- 曲の並び順に「栗林みな実を優先」「Minamiを優先」を追加
- タグのSNS共有が、Xアカウントで直接ポストできるようになりました
- メニューに「お知らせ」を追加。今後はこちらでも皆さんに通知させていただきますね！

皆さんからのリクエストもお待ちしています！`,
    date: '2026-01-11',
    type: 'feature',
  },
  {
    id: 'ann-2026-01-11',
    title: 'マロバブ ~Next Season~ リリース',
    content: `マロバブを全面的にリニューアルしてより使いやすくしました！

**主な改善点:**
- レイアウトを一新・統一
- サイト全体の重たい動作を改善
- ブラウザ・端末による挙動の違いを軽減

今後もアップデートを続けていきますので、よろしくお願いしますぅ！`,
    date: '2026-01-11',
    type: 'update',
  },
  {
    id: 'ann-2026-01-01',
    title: '新年のご挨拶',
    content: `明けましておめでとうございます！

2026年もマロバブをよろしくお願いします！`,
    date: '2026-01-01',
    type: 'notice',
  },
]

/**
 * お知らせIDリストを取得
 */
export function getAnnouncementIds(): string[] {
  return announcements.map(ann => ann.id)
}

/**
 * ローカルストレージのキー
 */
export const READ_ANNOUNCEMENTS_KEY = 'music-bubble-v2-read-announcements'

/**
 * 既読お知らせIDを取得
 */
export function getReadAnnouncementIds(): string[] {
  try {
    const stored = localStorage.getItem(READ_ANNOUNCEMENTS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('既読状態の取得に失敗しました:', e)
  }
  return []
}

/**
 * 未読のお知らせ数を取得
 */
export function getUnreadAnnouncementCount(): number {
  const readIds = getReadAnnouncementIds()
  return announcements.filter(ann => !readIds.includes(ann.id)).length
}
