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
    id: 'ann-2026-02-07',
    title: '待望の「ライブ」ページが登場！',
    content: `ライブ情報を登録できるようになりました！

栗林みな実さんが出演したライブ・イベント・セトリの情報を登録できるようになりました。
ぜひたくさん登録してこれまでの歴史を巡ってみましょう！

**主な機能:**
- 「単独公演・ツアー・フェス・イベント」の種別でライブ情報の登録・閲覧
- ツアーは公演地毎の追加が可能で、グルーピングされて参照が可能
- セトリは登録済の楽曲から選択・フリー入力で登録
- セトリ順の変更・日替わり曲の登録も可
- 各公演毎にコンテンツ登録・閲覧も可
- ツアー公演地を追加する際、別の公演のセトリをコピーも可能

ライブページの検索・並び替え・フィルタリングについては、
後日実装予定となりますので、実装までお待ちください！

ライブページの追加に伴い、タグ一覧・タグ登録はページを統合しました。
タグ画面上部のタブにて切り替えて参照ください。
`,
    date: '2026-02-07',
    type: 'feature',
  },
  {
    id: 'ann-2026-01-22',
    title: 'フィルタの追加',
    content: `以下のアップデートを行いました。

**主な改善点:**
- 楽曲フィルタで月・日・曜日を追加しました

何か規則性があるかも!?ぜひ探索してみましょう`,
    date: '2026-01-22',
    type: 'update',
  },
  {
    id: 'ann-2026-01-19',
    title: '一部楽曲の不具合解消',
    content: `以下のアップデートを行いました。

**主な改善点:**
- 楽曲TRUSTの詳細ページが開けない問題を解消`,
    date: '2026-01-19',
    type: 'update',
  },
  {
    id: 'ann-2026-01-17-2',
    title: '一覧にフィルタ機能を追加',
    content: `以下の機能を追加しました。

**主な改善点:**
- 楽曲・タグ一覧・タグ登録にフィルタ機能を追加
- 楽曲の発売年、コンテンツの有無、アーティスト名でフィルタが可能に
- フィルタに応じて発売年毎の曲数を見ることも可能になりました！`,
    date: '2026-01-17',
    type: 'feature',
  },
  {
    id: 'ann-2026-01-17',
    title: '埋め込みコンテンツを複数登録可能に',
    content: `以下のアップデートを行いました。

**主な改善点:**
- 埋め込みコンテンツを複数登録することが可能になりました
- 楽曲詳細ページにも複数表示されるようになります`,
    date: '2026-01-17',
    type: 'update',
  },
  {
    id: 'ann-2026-01-14',
    title: '使用感の向上を行いました',
    content: `以下のアップデートを行いました。

**主な改善点:**
- タグ登録画面でタグが登録しづらい問題を改善
- 検索入力欄をタップした際、ズームしないように改善`,
    date: '2026-01-14',
    type: 'update',
  },
  {
    id: 'ann-2026-01-12-2',
    title: 'ワイルド三人娘のフィルタを追加',
    content: `以下の機能を追加しました。

**主な改善点:**
- シャボン玉フィルタに「ワイルド三人娘」を追加
- 曲の並び順に「ワイルド三人娘を優先」を追加`,
    date: '2026-01-12',
    type: 'feature',
  },
  {
    id: 'ann-2026-01-12',
    title: 'アップデート情報',
    content: `以下のアップデートを行いました。

**主な改善点:**
- タグ登録一覧画面でスクロールがしづらい問題を改善
- レイアウトの微調整
- シャボン玉の数を変更可能に`,
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
  return announcements.map((ann) => ann.id)
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
  return announcements.filter((ann) => !readIds.includes(ann.id)).length
}
