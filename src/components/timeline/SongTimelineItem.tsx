/**
 * SongTimelineItem コンポーネント
 *
 * 個別楽曲をタイムラインアイテムとして表示する。
 * - 楽曲名、リリース情報、埋め込みコンテンツを表示
 * - クリック可能（onClick コールバックを受け取る）
 *
 * Requirements: 1.4, 5.1, 10.1
 */

import type { JSX } from 'react'
import type { Song, MusicServiceEmbed } from '../../types'
import './SongTimelineItem.css'

export interface SongTimelineItemProps {
  /** 楽曲データ */
  song: Song
  /** クリック時のコールバック */
  onClick?: (songId: string) => void
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
 * DBには releaseYear (数値) と releaseDate (MMDD形式の文字列) で保存されている
 */
function formatReleaseDate(releaseYear?: number, releaseDate?: string): string | null {
  // MMDD形式の場合（4桁の数字）
  if (releaseDate && /^\d{4}$/.test(releaseDate)) {
    const month = parseInt(releaseDate.substring(0, 2), 10)
    const day = parseInt(releaseDate.substring(2, 4), 10)
    if (releaseYear) {
      return `${releaseYear}年${month}月${day}日`
    }
    return `${month}月${day}日`
  }
  // 年のみの場合
  if (releaseYear) {
    return `${releaseYear}年`
  }
  return null
}

/**
 * 埋め込みコンテンツ配列を取得（後方互換性対応）
 * - 新形式 musicServiceEmbeds を優先
 * - 旧形式 musicServiceEmbed からの変換にも対応
 * - embed が空のものは除外
 */
function getEmbeds(song: Song): MusicServiceEmbed[] {
  if (song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
    return song.musicServiceEmbeds.filter((item) => item.embed && item.embed.trim() !== '')
  }
  if (song.musicServiceEmbed && song.musicServiceEmbed.trim()) {
    return [{ embed: song.musicServiceEmbed }]
  }
  return []
}

/**
 * 埋め込みコンテンツからサービス名を判定
 */
function getEmbedServiceName(embedContent: string | undefined, label?: string): string {
  if (label) return label
  if (!embedContent) return '音楽サービス'
  if (embedContent.includes('spotify')) return 'Spotify'
  if (embedContent.includes('youtube') || embedContent.includes('youtu.be')) return 'YouTube'
  if (embedContent.includes('apple')) return 'Apple Music'
  if (embedContent.includes('soundcloud')) return 'SoundCloud'
  return '音楽サービス'
}

/**
 * 埋め込みコンテンツがiframeタグかどうかチェック
 */
function isIframeTag(content: string | undefined): boolean {
  if (!content) return false
  return content.trim().toLowerCase().startsWith('<iframe')
}

/**
 * 外部リンクのラベルを取得
 */
function getLinkLabel(url: string, label?: string): string {
  if (label) return label
  if (url.includes('spotify')) return 'Spotify'
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube'
  if (url.includes('apple')) return 'Apple Music'
  if (url.includes('amazon')) return 'Amazon Music'
  return 'リンク'
}

/**
 * SongTimelineItem コンポーネント
 * 個別楽曲をタイムラインアイテムとして表示
 */
export function SongTimelineItem({ song, onClick }: SongTimelineItemProps): JSX.Element {
  const artists = formatArray(song.artists)
  const releaseDisplay = formatReleaseDate(song.releaseYear, song.releaseDate)
  const embeds = getEmbeds(song)
  const hasEmbeds = embeds.length > 0
  const hasLinks = !!song.detailPageUrls && song.detailPageUrls.length > 0

  const handleClick = () => {
    onClick?.(song.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(song.id)
    }
  }

  return (
    <article
      className="song-timeline-item"
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${song.title} - ${artists}`}
    >
      {/* ヘッダー: タイトルとアーティスト */}
      <header className="song-timeline-item__header">
        <h3 className="song-timeline-item__title">{song.title}</h3>
        {song.artists && song.artists.length > 0 && (
          <p className="song-timeline-item__artist">{artists}</p>
        )}
      </header>

      {/* リリース情報 */}
      {(releaseDisplay || song.singleName || song.albumName) && (
        <div className="song-timeline-item__release">
          {releaseDisplay && (
            <span className="song-timeline-item__release-date">{releaseDisplay}</span>
          )}
          {song.singleName && (
            <span className="song-timeline-item__release-tag">
              シングル: {song.singleName}
            </span>
          )}
          {song.albumName && (
            <span className="song-timeline-item__release-tag">
              アルバム: {song.albumName}
            </span>
          )}
        </div>
      )}

      {/* 埋め込みコンテンツ */}
      {hasEmbeds && (
        <div
          className="song-timeline-item__embeds"
          onClick={(e) => e.stopPropagation()}
        >
          {embeds.map((item, index) => (
            <div key={index} className="song-timeline-item__embed-item">
              {isIframeTag(item.embed) ? (
                <div
                  className="song-timeline-item__embed-container"
                  dangerouslySetInnerHTML={{ __html: item.embed }}
                />
              ) : (
                <div className="song-timeline-item__embed-container">
                  <iframe
                    src={item.embed}
                    className="song-timeline-item__embed"
                    title={`${song.title} - ${getEmbedServiceName(item.embed, item.label)}`}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 外部リンク */}
      {hasLinks && (
        <ul className="song-timeline-item__links" onClick={(e) => e.stopPropagation()}>
          {song.detailPageUrls!.map((link, index) => (
            <li key={index} className="song-timeline-item__link-item">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="song-timeline-item__link"
              >
                {getLinkLabel(link.url, link.label)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default SongTimelineItem
