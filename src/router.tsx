/**
 * ルーター設定
 * Music Bubble Explorer V2
 *
 * Requirements:
 * - 14.1: 全てのページからアクセス可能なメインメニュー
 * - 14.3: ブラウザの戻る/進むナビゲーションをサポート
 * - 14.4: 全てのページでURLルーティングを使用
 * - 9.5: タブパラメータ付きの統合タグページのルートとして「/tags」を使用
 * - 9.1, 9.3: ライブ関連ページのルーティング
 */

import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { TopPage } from './pages/TopPage'
import { SongListPage } from './pages/SongListPage'
import { SongDetailPage } from './pages/SongDetailPage'
import { SongEditPage } from './pages/SongEditPage'
import { LiveListPage } from './pages/LiveListPage'
import { LiveDetailPage } from './pages/LiveDetailPage'
import { LiveEditPage } from './pages/LiveEditPage'
import { TourDetailPage } from './pages/TourDetailPage'
import { TagPage } from './pages/TagPage'
import { InfoPage } from './pages/InfoPage'

/**
 * プレースホルダーページ（後のフェーズで実装）
 */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>このページは後のフェーズで実装されます</p>
      <a
        href="/"
        style={{
          marginTop: '1rem',
          color: 'var(--color-primary)',
          textDecoration: 'underline',
        }}
      >
        TOPページに戻る
      </a>
    </div>
  )
}

/**
 * ルート定義
 */
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Outlet />,
      children: [
        {
          index: true,
          element: <TopPage />,
        },
        {
          path: 'songs',
          element: <SongListPage />,
        },
        {
          path: 'songs/new',
          element: <SongEditPage />,
        },
        {
          path: 'songs/:songId',
          element: <SongDetailPage />,
        },
        {
          path: 'songs/:songId/edit',
          element: <SongEditPage />,
        },
        {
          path: 'lives',
          element: <LiveListPage />,
        },
        {
          path: 'lives/new',
          element: <LiveEditPage />,
        },
        {
          path: 'lives/:liveId',
          element: <LiveDetailPage />,
        },
        {
          path: 'lives/:liveId/edit',
          element: <LiveEditPage />,
        },
        {
          path: 'tours/:tourName',
          element: <TourDetailPage />,
        },
        {
          path: 'tags',
          element: <TagPage />,
        },
        {
          path: 'info',
          element: <InfoPage />,
        },
        {
          path: '*',
          element: <PlaceholderPage title="ページが見つかりません" />,
        },
      ],
    },
  ],
  {
    // GitHub Pages用のベースパス設定
    basename: import.meta.env.BASE_URL,
  }
)

/**
 * AppRouter コンポーネント
 * アプリケーション全体のルーティングを提供
 */
export function AppRouter() {
  return <RouterProvider router={router} />
}

export default AppRouter
