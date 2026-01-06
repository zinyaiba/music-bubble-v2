/**
 * SongCard コンポーネント
 * 楽曲情報のコンパクト表示
 *
 * Requirements:
 * - 7.6: 楽曲情報をコンパクトで見やすい形式で表示
 */

import type { Song } from '../../types'
import './SongCard.css'

export interface SongCardProps {
  /** 楽曲データ */
  song: Song
  /** クリック時のコールバック */
  onClick: () => void
  /** コンパクト表示モード（曲名のみ） */
  compact?: boolean
}

/**
 * 配列を表示用文字列に変換
 */
function formatArray(arr: string[] | undefined, fallback = '-'): string {
  if (!arr || arr.length === 0) return fallback
  return arr.join(', ')
}

/**
 * 発売日を整形して表示
 */
function formatReleaseDate(releaseYear?: number, releaseDate?: string): string | null {
  // MMDD形式の場合（4桁の数字）
  if (releaseDate && /^\d{4}$/.test(releaseDate)) {
    const month = parseInt(releaseDate.substring(0, 2), 10)
    const day = parseInt(releaseDate.substring(2, 4), 10)
    if (releaseYear) {
      return `${releaseYear}/${month}/${day}`
    }
    return `${month}/${day}`
  }
  // 年のみの場合
  if (releaseYear) {
    return `${releaseYear}年`
  }
  return null
}

/**
 * SongCard コンポーネント
 * 楽曲情報をカード形式でコンパクトに表示
 */
export function SongCard({ song, onClick, compact = false }: SongCardProps) {
  const artists = formatArray(song.artists)
  const releaseDisplay = formatReleaseDate(song.releaseYear, song.releaseDate)

  return (
    <article
      className={`song-card ${compact ? 'song-card--compact' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`${song.title} - ${artists}`}
    >
      <div className="song-card__content">
        <h3 className="song-card__title">{song.title}</h3>
        
        {!compact && (
          <>
            <p className="song-card__artist">{artists}</p>
            
            {/* クレジット情報（編曲者を追加） */}
            <div className="song-card__credits">
              {song.lyricists && song.lyricists.length > 0 && (
                <span className="song-card__credit">
                  <span className="song-card__credit-label">作詞:</span>
                  {formatArray(song.lyricists)}
                </span>
              )}
              {song.composers && song.composers.length > 0 && (
                <span className="song-card__credit">
                  <span className="song-card__credit-label">作曲:</span>
                  {formatArray(song.composers)}
                </span>
              )}
              {song.arrangers && song.arrangers.length > 0 && (
                <span className="song-card__credit">
                  <span className="song-card__credit-label">編曲:</span>
                  {formatArray(song.arrangers)}
                </span>
              )}
            </div>

            {/* 発売日 */}
            {releaseDisplay && (
              <div className="song-card__release">
                <span className="song-card__release-label">発売:</span>
                {releaseDisplay}
              </div>
            )}
          </>
        )}
      </div>

      <div className="song-card__arrow">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </article>
  )
}

export default SongCard
