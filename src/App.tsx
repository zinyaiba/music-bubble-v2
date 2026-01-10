/**
 * Music Bubble Explorer V2
 * メインアプリケーションコンポーネント
 *
 * Requirements:
 * - 14.1: 全てのページからアクセス可能なメインメニュー
 * - 14.3: ブラウザの戻る/進むナビゲーションをサポート
 * - 14.4: 全てのページでURLルーティングを使用
 * - 15.4: オフラインモード対応
 */

import { AppRouter } from './router'
import { OfflineIndicator } from './components/common'

function App() {
  return (
    <>
      <OfflineIndicator position="top" />
      <AppRouter />
    </>
  )
}

export default App
