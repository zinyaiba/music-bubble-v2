/**
 * SongTimelineItem コンポーネント
 *
 * 個別楽曲をタイムラインアイテムとして表示する。
 * - 楽曲名、リリース情報、埋め込みコンテンツを表示
 * - クリック可能（onClick コールバックを受け取る）
 *
 * Requirements: 1.4, 5.1, 10.1
 */

import { useState } from 'react'
import type { JSX } from 'react'
import type { Song, MusicServiceEmbed } from '../../types'
import { MarqueeText } from '../common/MarqueeText'
import { LazyEmbed } from '../common/LazyEmbed'
import { formatReleaseDate } from '../../utils/timelineDate'
import { resolveCardStyle } from '../../utils/timelineCardStyle'
import './SongTimelineItem.css'

export interface SongTimelineItemProps {
  /** 楽曲データ */
  song: Song
  /** クリック時のコールバック */
  onClick?: (songId: string) => void
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
 * SongTimelineItem コンポーネント
 * 個別楽曲をタイムラインアイテムとして表示
 */
export function SongTimelineItem({ song, onClick }: SongTimelineItemProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const releaseDisplay = formatReleaseDate(song.releaseYear, song.releaseDate)
  const embeds = getEmbeds(song)
  const visibleEmbeds = isExpanded ? embeds : embeds.slice(0, 1)
  const hasEmbeds = embeds.length > 0
  const hasAdditionalEmbeds = embeds.length > 1

  // Music_Card（個別曲）の視覚設定を解決（Pink_Palette / right / 曲バッジ）
  const cardStyle = resolveCardStyle({ kind: 'song' })

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
      className={`song-timeline-item ${cardStyle.categoryClass}`}
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={song.title}
    >
      {/* ヘッダー: 種別バッジ（曲）+ タイトル（シングル・アルバムなしの楽曲のためアーティスト名は非表示） */}
      <header className="song-timeline-item__header">
        {/* Type_Badge: 色以外の判別手段としてテキストラベルを必ず表示 */}
        <span className="song-timeline-item__type-badge">
          {cardStyle.badge.icon && (
            <span className="song-timeline-item__type-badge-icon" aria-hidden="true">
              {cardStyle.badge.icon}
            </span>
          )}
          {cardStyle.badge.label}
        </span>
        <h3 className="song-timeline-item__title">
          <MarqueeText text={song.title} />
        </h3>
      </header>

      {/* リリース情報 */}
      {(releaseDisplay || song.singleName || song.albumName) && (
        <div className="song-timeline-item__release">
          {releaseDisplay && (
            <span className="song-timeline-item__release-date">{releaseDisplay}</span>
          )}
          {song.singleName && (
            <span className="song-timeline-item__release-tag">シングル: {song.singleName}</span>
          )}
          {song.albumName && (
            <span className="song-timeline-item__release-tag">アルバム: {song.albumName}</span>
          )}
        </div>
      )}

      {/* 埋め込みコンテンツ */}
      {hasEmbeds && (
        <div className="song-timeline-item__embeds" onClick={(e) => e.stopPropagation()}>
          {visibleEmbeds.map((item, index) => (
            <div key={index} className="song-timeline-item__embed-item">
              {/* サムネイル先行・タップで iframe 生成（メモリ節約） */}
              <LazyEmbed
                embed={item.embed}
                title={`${song.title} - ${getEmbedServiceName(item.embed, item.label)}`}
                label={item.label}
              />
            </div>
          ))}
          {hasAdditionalEmbeds && (
            <button
              type="button"
              className="song-timeline-item__content-toggle"
              onClick={(event) => {
                event.stopPropagation()
                setIsExpanded((prev) => !prev)
              }}
              onKeyDown={(event) => event.stopPropagation()}
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? '関連コンテンツを1件に戻す'
                : `関連コンテンツをすべて表示（${embeds.length}件）`}
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export default SongTimelineItem
