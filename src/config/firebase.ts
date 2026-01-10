/**
 * Firebase設定
 * 既存のMusic Bubble Explorerと同じFirebaseプロジェクトを共有
 */

import { initializeApp } from 'firebase/app'
import type { FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import type { Auth } from 'firebase/auth'
import { getAnalytics, isSupported } from 'firebase/analytics'
import type { Analytics } from 'firebase/analytics'

// GitHub Pages用の直接設定（既存プロジェクトと同じ）
const githubPagesConfig = {
  apiKey: 'AIzaSyDkJCEmdaqTmaBYVH3xLtg0HaKwRzSuefA',
  authDomain: 'music-bubble-explorer.firebaseapp.com',
  projectId: 'music-bubble-explorer',
  storageBucket: 'music-bubble-explorer.firebasestorage.app',
  messagingSenderId: '1000893317937',
  appId: '1:1000893317937:web:82904e4282466acee0a610',
}

// 環境変数から設定を取得
const getFirebaseConfig = () => {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  // 環境変数が設定されている場合はそれを使用
  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig
  }

  // 環境変数がない場合はGitHub Pages用設定を使用
  return githubPagesConfig
}

const firebaseConfig = getFirebaseConfig()

// Firebase設定が有効かチェック
const isFirebaseConfigured =
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let analytics: Analytics | null = null

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)

    // Firebase Analytics初期化（ブラウザ環境でのみ）
    isSupported().then((supported) => {
      if (supported && app) {
        analytics = getAnalytics(app)
        if (import.meta.env.DEV) {
          console.log('📊 Firebase Analytics初期化完了')
        }
      }
    })

    if (import.meta.env.DEV) {
      console.log('🔥 Firebase初期化完了')
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('🔥 Firebase初期化エラー:', error)
    }
    app = null
    db = null
    auth = null
    analytics = null
  }
} else {
  if (import.meta.env.DEV) {
    console.log('🔥 Firebase設定が見つかりません - ローカルモードで動作')
  }
}

/**
 * Analytics インスタンスを取得
 * 非同期初期化のため、使用時に取得する
 */
export const getAnalyticsInstance = (): Analytics | null => analytics

export { db, auth, analytics }
export default app
