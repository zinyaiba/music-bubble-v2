import type { KaraokeSong } from '../../types'
import './KaraokeSongCard.css'

export interface KaraokeSongCardProps {
  song: KaraokeSong
  onClick: () => void
}

export function KaraokeSongCard({ song, onClick }: KaraokeSongCardProps) {
  const artist = song.originalArtist?.trim() || '未登録'
  const releaseYear = song.releaseYear ? `${song.releaseYear}年` : '未登録'
  const episodes = song.streamingEpisodes.length
    ? song.streamingEpisodes.map((episode) => `第${episode}回`).join(', ')
    : '未登録'
  const accessibleMetadata = `原曲アーティスト ${artist}、発売年 ${releaseYear}、配信回 ${episodes}`

  return (
    <button
      type="button"
      className="karaoke-song-card"
      onClick={onClick}
      aria-label={`${song.title}、${accessibleMetadata}の詳細を開く`}
    >
      <span className="karaoke-song-card__content">
        <span className="karaoke-song-card__title">{song.title}</span>
        <span className="karaoke-song-card__metadata" aria-hidden="true">
          <span className="karaoke-song-card__meta-item karaoke-song-card__meta-item--artist">
            <span className="karaoke-song-card__meta-label">原曲</span>
            <span className="karaoke-song-card__meta-value">{artist}</span>
          </span>
          <span className="karaoke-song-card__meta-item">
            <span className="karaoke-song-card__meta-label">発売</span>
            <span className="karaoke-song-card__meta-value">{releaseYear}</span>
          </span>
          <span className="karaoke-song-card__meta-item karaoke-song-card__meta-item--episodes">
            <span className="karaoke-song-card__meta-label">配信</span>
            <span className="karaoke-song-card__meta-value">{episodes}</span>
          </span>
        </span>
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
