/**
 * SetlistDisplay コンポーネント
 * セトリの表示コンポーネント
 *
 * Requirements:
 * - 5.2: セトリ表示は演奏順に楽曲名を表示すること
 * - 5.3: 日替わり曲フラグがtrueの場合、日替わり曲であることを示す視覚的インジケーター（バッジまたはアイコン）を表示すること
 * - 5.5: セトリ内の楽曲に楽曲IDが設定されている場合、ユーザーがその楽曲をタップすると、システムは楽曲詳細ページに遷移すること
 */

import type { SetlistItem, Song } from '../../types'
import './SetlistDisplay.css'

export interface SetlistDisplayProps {
  /** セトリ項目の配列 */
  items: SetlistItem[]
  /** 楽曲データの配列（楽曲名の表示に使用） */
  songs: Song[]
  /** 楽曲クリック時のコールバック（楽曲IDがある場合のみ呼び出し） */
  onSongClick?: (songId: string) => void
}

/**
 * セトリ項目をorder順にソート
 */
function sortByOrder(items: SetlistItem[]): SetlistItem[] {
  return [...items].sort((a, b) => a.order - b.order)
}

/**
 * 楽曲IDから楽曲名を取得
 */
function getSongTitle(songId: string | undefined, songs: Song[], fallbackTitle: string): string {
  if (!songId) return fallbackTitle
  const song = songs.find((s) => s.id === songId)
  return song?.title || fallbackTitle
}

/**
 * SetlistDisplay コンポーネント
 * セトリを演奏順に表示し、日替わり曲にはバッジを表示
 */
export function SetlistDisplay({ items, songs, onSongClick }: SetlistDisplayProps) {
  // 空のセトリの場合
  if (!items || items.length === 0) {
    return (
      <div className="setlist-display setlist-display--empty">
        <p className="setlist-display__empty-message">セトリが登録されていません</p>
      </div>
    )
  }

  // order順にソート
  const sortedItems = sortByOrder(items)

  return (
    <div className="setlist-display">
      <ol className="setlist-display__list">
        {sortedItems.map((item, index) => {
          const displayTitle = getSongTitle(item.songId, songs, item.songTitle)
          const isClickable = !!item.songId && !!onSongClick
          const orderNumber = item.order || index + 1

          return (
            <li key={`${item.order}-${item.songTitle}`} className="setlist-display__item">
              {/* 演奏順番号 */}
              <span className="setlist-display__order">{orderNumber}</span>

              {/* 楽曲名 */}
              {isClickable ? (
                <button
                  type="button"
                  className="setlist-display__song-button"
                  onClick={() => onSongClick(item.songId!)}
                  aria-label={`${displayTitle}の詳細を表示`}
                >
                  <span className="setlist-display__song-title">{displayTitle}</span>
                  <svg
                    className="setlist-display__link-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <span className="setlist-display__song-title">{displayTitle}</span>
              )}

              {/* 日替わり曲バッジ */}
              {item.isDailySong && (
                <span
                  className="setlist-display__daily-badge"
                  title="日替わり曲"
                  aria-label="日替わり曲"
                >
                  日替
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* セトリ曲数 */}
      <div className="setlist-display__footer">
        <span className="setlist-display__count">全{items.length}曲</span>
      </div>
    </div>
  )
}

export default SetlistDisplay
