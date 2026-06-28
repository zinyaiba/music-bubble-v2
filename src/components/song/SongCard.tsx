/**
 * SongCard コンポーネント
 * 楽曲情報のコンパクト表示
 *
 * Requirements:
 * - 7.6: 楽曲情報をコンパクトで見やすい形式で表示
 */

import type { Song } from '../../types'
import { getThumbnailFromEmbed, getEmbedServiceType } from '../../utils/embedUtils'
import './SongCard.css'

/** 表示モードの種類 */
export type SongDisplayMode =
  | 'compact'
  | 'artist'
  | 'lyricist'
  | 'composer'
  | 'arranger'
  | 'release'
  | 'thumbnail'
  | 'all'

export interface SongCardProps {
  /** 楽曲データ */
  song: Song
  /** クリック時のコールバック */
  onClick: () => void
  /** 表示モード */
  displayMode?: SongDisplayMode
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
export function SongCard({ song, onClick, displayMode = 'all' }: SongCardProps) {
  const artists = formatArray(song.artists)
  const releaseDisplay = formatReleaseDate(song.releaseYear, song.releaseDate)
  const isCompact = displayMode === 'compact'
  const isThumbnail = displayMode === 'thumbnail'
  
  // 旧形式と新形式の両方をチェック
  const hasEmbed =
    (!!song.musicServiceEmbed && song.musicServiceEmbed.trim().length > 0) ||
    (!!song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0)

  // サムネイルモード用の画像URL取得
  let thumbnailUrl: string | null = null
  let embedCount = 0
  let embedService: 'youtube' | 'spotify' | 'unknown' = 'unknown'
  let embedLabel: string | null = null
  
  if (isThumbnail) {
    // 新形式の埋め込みから最初の1件を取得
    if (song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
      embedCount = song.musicServiceEmbeds.length
      const firstEmbed = song.musicServiceEmbeds[0]
      if (firstEmbed.embed) {
        thumbnailUrl = getThumbnailFromEmbed(firstEmbed.embed)
        embedService = getEmbedServiceType(firstEmbed.embed)
        embedLabel = firstEmbed.label || null
      }
    }
    // 旧形式の埋め込み
    else if (song.musicServiceEmbed) {
      embedCount = 1
      thumbnailUrl = getThumbnailFromEmbed(song.musicServiceEmbed)
      embedService = getEmbedServiceType(song.musicServiceEmbed)
      // 旧形式の場合、サービスタイプから推測
      if (embedService === 'youtube') {
        embedLabel = 'YouTube'
      } else if (embedService === 'spotify') {
        embedLabel = 'Spotify'
      }
    }
  }

  // サムネイルモードの場合、コンテンツがない楽曲は表示しない
  if (isThumbnail && !hasEmbed) {
    return null
  }

  // サムネイルモードの表示
  if (isThumbnail) {
    return (
      <article
        className="song-card song-card--thumbnail"
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
        <div className="song-card__thumbnail-image">
          {thumbnailUrl ? (
            <>
              <img src={thumbnailUrl} alt={song.title} loading="lazy" />
              {embedCount > 1 && (
                <div className="song-card__thumbnail-badge">+{embedCount - 1}</div>
              )}
            </>
          ) : (
            <div className={`song-card__thumbnail-placeholder song-card__thumbnail-placeholder--${embedService}`}>
              {embedService === 'spotify' ? (
                // Spotify アイコン
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              ) : embedService === 'youtube' ? (
                // YouTube アイコン
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              ) : (
                // デフォルトの音楽アイコン
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              )}
              {embedCount > 1 && (
                <div className="song-card__thumbnail-badge">+{embedCount - 1}</div>
              )}
            </div>
          )}
        </div>
        <div className="song-card__thumbnail-info">
          <h3 className="song-card__title">{song.title}</h3>
          <p className="song-card__artist">{embedLabel || artists}</p>
        </div>
      </article>
    )
  }

  return (
    <article
      className={`song-card ${isCompact ? 'song-card--compact' : ''}`}
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

        {!isCompact && (
          <>
            {/* アーティスト名 */}
            {(displayMode === 'artist' || displayMode === 'all') && (
              <p className="song-card__artist">
                {artists}
                {song.originalArtists && song.originalArtists.length > 0 && (
                  <span className="song-card__original-artist">
                    <span className="song-card__original-artist-label">原曲</span>
                    {formatArray(song.originalArtists)}
                  </span>
                )}
              </p>
            )}

            {/* クレジット情報 */}
            {(displayMode === 'lyricist' ||
              displayMode === 'composer' ||
              displayMode === 'arranger' ||
              displayMode === 'all') && (
              <div className="song-card__credits">
                {(displayMode === 'lyricist' || displayMode === 'all') &&
                  song.lyricists &&
                  song.lyricists.length > 0 && (
                    <span className="song-card__credit">
                      <span className="song-card__credit-label song-card__credit-label--lyricist">
                        作詞
                      </span>
                      {formatArray(song.lyricists)}
                    </span>
                  )}
                {(displayMode === 'composer' || displayMode === 'all') &&
                  song.composers &&
                  song.composers.length > 0 && (
                    <span className="song-card__credit">
                      <span className="song-card__credit-label song-card__credit-label--composer">
                        作曲
                      </span>
                      {formatArray(song.composers)}
                    </span>
                  )}
                {(displayMode === 'arranger' || displayMode === 'all') &&
                  song.arrangers &&
                  song.arrangers.length > 0 && (
                    <span className="song-card__credit">
                      <span className="song-card__credit-label song-card__credit-label--arranger">
                        編曲
                      </span>
                      {formatArray(song.arrangers)}
                    </span>
                  )}
              </div>
            )}

            {/* 発売日 */}
            {(displayMode === 'release' || displayMode === 'all') && releaseDisplay && (
              <div className="song-card__release">
                <span className="song-card__release-label">発売</span>
                {releaseDisplay}
              </div>
            )}
          </>
        )}
      </div>

      <div className={`song-card__arrow ${hasEmbed ? 'song-card__arrow--has-embed' : ''}`}>
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
