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
