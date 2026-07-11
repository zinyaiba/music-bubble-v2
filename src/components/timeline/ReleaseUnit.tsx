/**
 * ReleaseUnit コンポーネント
 *
 * リリース単位（シングル/アルバム）をタイムラインアイテムとして表示する。
 * - ヘッダー: リリース名、収録曲数（クリックで展開/折りたたみ）
 * - 展開時: 収録楽曲リスト（クリックで詳細へ遷移）と、
 *   リリース内の全楽曲の埋め込みコンテンツ（musicServiceEmbeds）を表示
 *
 * Requirements:
 * - 4.4: リリース名と含まれる楽曲のリストを表示
 * - 5.3: リリース内の任意の楽曲からの埋め込みコンテンツを表示（全楽曲分を含む）
 * - 10.3: クリックでリリース内の個別楽曲を表示するために展開
 */

import { useState } from 'react'
import type { JSX } from 'react'
import type { ReleaseUnitTimelineItem, MusicServiceEmbed, Song } from '../../types'
import { MarqueeText } from '../common/MarqueeText'
import { LazyEmbed } from '../common/LazyEmbed'
import { resolveCardStyle } from '../../utils/timelineCardStyle'
import './ReleaseUnit.css'

export interface ReleaseUnitProps {
  /** リリース単位データ */
  releaseUnit: ReleaseUnitTimelineItem
  /** 展開/折りたたみコールバック */
  onToggle?: () => void
  /** 楽曲クリック時のコールバック */
  onSongClick?: (songId: string) => void
}

/** 埋め込みアイテムと、それが属する楽曲情報をまとめた表示用の型 */
interface AggregatedEmbed {
  /** 一意のキー生成用 */
  key: string
  /** 楽曲タイトル（埋め込みの見出し補助） */
  songTitle: string
  /** 埋め込みデータ */
  embed: MusicServiceEmbed
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
 * 1曲分の有効な埋め込みコンテンツを取得（後方互換性対応）
 */
function getSongEmbeds(song: Song): MusicServiceEmbed[] {
  // 新形式があればそれを使用
  if (song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
    return song.musicServiceEmbeds.filter((item) => item.embed && item.embed.trim() !== '')
  }
  // 旧形式からの変換
  if (song.musicServiceEmbed && song.musicServiceEmbed.trim()) {
    return [{ embed: song.musicServiceEmbed }]
  }
  return []
}

/**
 * リリース単位内の全楽曲から埋め込みコンテンツを集約する。
 * Requirement 5.3: 表示される埋め込みコンテンツは全楽曲の musicServiceEmbeds を含む。
 */
function aggregateEmbeds(songs: Song[]): AggregatedEmbed[] {
  const aggregated: AggregatedEmbed[] = []
  songs.forEach((song, songIndex) => {
    const embeds = getSongEmbeds(song)
    embeds.forEach((embed, embedIndex) => {
      aggregated.push({
        key: `${song.id ?? songIndex}-${embedIndex}`,
        songTitle: song.title,
        embed,
      })
    })
  })
  return aggregated
}

/**
 * ReleaseUnit コンポーネント
 */
export function ReleaseUnit({
  releaseUnit,
  onToggle,
  onSongClick,
}: ReleaseUnitProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(releaseUnit.isExpanded ?? false)

  const songCount = releaseUnit.songs.length

  // Music_Card（リリース単位）の視覚設定を解決する。
  // single/album はいずれも同一 Pink_Palette 色相を用い、区別はテキスト + アイコンで行う。
  const cardStyle = resolveCardStyle({
    kind: 'release-unit',
    releaseType: releaseUnit.releaseType,
  })
  const releaseTypeLabel = cardStyle.badge.label
  const aggregatedEmbeds = aggregateEmbeds(releaseUnit.songs)
  const hasEmbeds = aggregatedEmbeds.length > 0

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
    onToggle?.()
  }

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  const handleSongClick = (songId: string) => {
    onSongClick?.(songId)
  }

  const handleSongKeyDown = (
    event: React.KeyboardEvent<HTMLLIElement>,
    songId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSongClick(songId)
    }
  }

  return (
    <article className={`release-unit ${cardStyle.categoryClass}`} role="article">
      {/* ヘッダー（クリックで展開/折りたたみ） */}
      <div
        className="release-unit__header"
        onClick={handleToggle}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${releaseUnit.releaseName}（${releaseTypeLabel}、収録曲数${songCount}曲）`}
      >
        <div className="release-unit__header-info">
          {/* Type_Badge: single/album をアイコン + テキストで区別（色以外の判別手段） */}
          <span className="release-unit__type-badge">
            {cardStyle.badge.icon && (
              <span className="release-unit__type-badge-icon" aria-hidden="true">
                {cardStyle.badge.icon}
              </span>
            )}
            {cardStyle.badge.label}
          </span>
          <h3 className="release-unit__name">
            <MarqueeText text={releaseUnit.releaseName} />
          </h3>
          <span className="release-unit__count">収録曲数: {songCount}曲</span>
        </div>
        <span
          className={`release-unit__toggle-icon ${
            isExpanded ? 'release-unit__toggle-icon--expanded' : ''
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>

      {/* 埋め込みコンテンツ（全楽曲分を集約）: 開かずとも常時表示して華やかに */}
      {hasEmbeds && (
        <div className="release-unit__embeds release-unit__embeds--always">
          <div className="release-unit__embed-list">
            {aggregatedEmbeds.map((item) => (
              <div key={item.key} className="release-unit__embed-item">
                <span className="release-unit__embed-label">
                  {item.songTitle} - {getEmbedServiceName(item.embed.embed, item.embed.label)}
                </span>
                {/* サムネイル先行・タップで iframe 生成（メモリ節約） */}
                <LazyEmbed
                  embed={item.embed.embed}
                  title={`${item.songTitle} - ${getEmbedServiceName(
                    item.embed.embed,
                    item.embed.label
                  )}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 展開コンテンツ: 収録楽曲リスト */}
      {isExpanded && (
        <div className="release-unit__content">
          <div className="release-unit__songs">
            <h4 className="release-unit__section-title">収録楽曲</h4>
            <ul className="release-unit__song-list">
              {releaseUnit.songs.map((song, index) => (
                <li
                  key={song.id ?? index}
                  className="release-unit__song-item"
                  onClick={() => handleSongClick(song.id)}
                  onKeyDown={(event) => handleSongKeyDown(event, song.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={song.title}
                >
                  {/* タイトルは1行表示（はみ出し時は横スクロール）。アーティスト名は非表示 */}
                  <span className="release-unit__song-title">
                    <MarqueeText text={song.title} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  )
}

export default ReleaseUnit
