/**
 * Firebase Analytics サービス
 * サイトの使用状況をトラッキング
 *
 * イベント名は日本語で分かりやすく設定
 */

import { logEvent } from 'firebase/analytics'
import { getAnalyticsInstance } from '../config/firebase'

/**
 * イベント名の定義（日本語）
 */
export const AnalyticsEvents = {
  // ページ閲覧
  ページ閲覧_トップ: 'ページ閲覧_トップ',
  ページ閲覧_曲一覧: 'ページ閲覧_曲一覧',
  ページ閲覧_曲詳細: 'ページ閲覧_曲詳細',
  ページ閲覧_曲編集: 'ページ閲覧_曲編集',
  ページ閲覧_タグ一覧: 'ページ閲覧_タグ一覧',
  ページ閲覧_タグ登録: 'ページ閲覧_タグ登録',
  ページ閲覧_お知らせ: 'ページ閲覧_お知らせ',

  // 曲関連アクション
  曲_検索実行: '曲_検索実行',
  曲_フィルター適用: '曲_フィルター適用',
  曲_ソート変更: '曲_ソート変更',
  曲_詳細表示: '曲_詳細表示',
  曲_編集開始: '曲_編集開始',
  曲_保存完了: '曲_保存完了',
  曲_新規作成: '曲_新規作成',
  曲_Spotify再生: '曲_Spotify再生',

  // タグ関連アクション
  タグ_検索実行: 'タグ_検索実行',
  タグ_詳細表示: 'タグ_詳細表示',
  タグ_登録開始: 'タグ_登録開始',
  タグ_登録完了: 'タグ_登録完了',
  タグ_編集開始: 'タグ_編集開始',
  タグ_編集完了: 'タグ_編集完了',
  タグ_削除: 'タグ_削除',

  // バブル関連
  バブル_タップ: 'バブル_タップ',
  バブル_ドラッグ: 'バブル_ドラッグ',

  // ナビゲーション
  ナビ_メニュー開閉: 'ナビ_メニュー開閉',
  ナビ_ページ遷移: 'ナビ_ページ遷移',

  // エラー・その他
  エラー発生: 'エラー発生',
  オフライン検出: 'オフライン検出',
  オンライン復帰: 'オンライン復帰',
} as const

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents]

/**
 * カスタムイベントをログに記録
 */
export function trackEvent(
  eventName: AnalyticsEventName | string,
  params?: Record<string, string | number | boolean>
): void {
  const analytics = getAnalyticsInstance()

  if (!analytics) {
    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics Mock] ${eventName}`, params || '')
    }
    return
  }

  try {
    logEvent(analytics, eventName, params)

    if (import.meta.env.DEV) {
      console.log(`📊 [Analytics] ${eventName}`, params || '')
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('📊 Analytics イベント送信エラー:', error)
    }
  }
}

/**
 * ページ閲覧をトラッキング
 */
export function trackPageView(
  pageName: string,
  additionalParams?: Record<string, string | number>
): void {
  trackEvent(`ページ閲覧_${pageName}` as AnalyticsEventName, {
    page_title: pageName,
    ...additionalParams,
  })
}

/**
 * 検索アクションをトラッキング
 */
export function trackSearch(searchType: '曲' | 'タグ', searchTerm: string): void {
  trackEvent(searchType === '曲' ? AnalyticsEvents.曲_検索実行 : AnalyticsEvents.タグ_検索実行, {
    search_term: searchTerm,
  })
}

/**
 * エラーをトラッキング
 */
export function trackError(errorType: string, errorMessage: string, context?: string): void {
  trackEvent(AnalyticsEvents.エラー発生, {
    error_type: errorType,
    error_message: errorMessage.slice(0, 100), // 長すぎるメッセージは切り詰め
    ...(context && { context }),
  })
}

/**
 * オフライン/オンライン状態をトラッキング
 */
export function trackConnectivityChange(isOnline: boolean): void {
  trackEvent(isOnline ? AnalyticsEvents.オンライン復帰 : AnalyticsEvents.オフライン検出)
}
