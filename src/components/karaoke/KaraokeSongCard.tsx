import type { KaraokeDisplayMode, KaraokeSong } from '../../types'
import { MarqueeText } from '../common'
import './KaraokeSongCard.css'

export interface KaraokeSongCardProps {
  song: KaraokeSong
  onClick: () => void
  displayMode?: KaraokeDisplayMode
}

export function KaraokeSongCard({ song, onClick, displayMode = 'all' }: KaraokeSongCardProps) {
  const artist = song.originalArtist?.trim() || '未登録'
  const releaseYear = song.releaseYear ? `${song.releaseYear}年` : '未登録'
  const episodes = song.streamingEpisodes.length
    ? song.streamingEpisodes.map((episode) => `第${episode}回`).join(', ')
    : '未登録'
  const accessibleMetadata = `原曲アーティスト ${artist}、発売年 ${releaseYear}、配信回 ${episodes}`
  const isCompact = displayMode === 'compact'

  return (
    <button
      type="button"
      className={`karaoke-song-card${isCompact ? ' karaoke-song-card--compact' : ''}`}
      onClick={onClick}
      aria-label={`${song.title}、${accessibleMetadata}の詳細を開く`}
    >
      <span className="karaoke-song-card__content">
        <MarqueeText text={song.title} className="karaoke-song-card__title" />
        {!isCompact && (
          <span className="karaoke-song-card__metadata" aria-hidden="true">
            <span className="karaoke-song-card__metadata-row karaoke-song-card__metadata-row--artist">
              <span className="karaoke-song-card__meta-label karaoke-song-card__meta-label--artist">
                原曲
              </span>
              <MarqueeText text={artist} className="karaoke-song-card__meta-value" />
            </span>
            <span className="karaoke-song-card__metadata-row">
              <span className="karaoke-song-card__meta-item">
                <span className="karaoke-song-card__meta-label karaoke-song-card__meta-label--release">
                  発売
                </span>
                <MarqueeText text={releaseYear} className="karaoke-song-card__meta-value" />
              </span>
              <span className="karaoke-song-card__meta-item karaoke-song-card__meta-item--episodes">
                <span className="karaoke-song-card__meta-label karaoke-song-card__meta-label--episodes">
                  配信
                </span>
                <MarqueeText text={episodes} className="karaoke-song-card__meta-value" />
              </span>
            </span>
          </span>
        )}
      </span>
      <svg
        className="karaoke-song-card__arrow"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

export default KaraokeSongCard
