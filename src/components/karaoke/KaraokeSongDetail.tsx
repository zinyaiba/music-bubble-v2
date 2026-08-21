import type { KaraokeSong } from '../../types'
import { createKaraokeDetailViewModel } from '../../utils/karaokeDetailViewModel'
import './KaraokeSongDetail.css'

export interface KaraokeSongDetailProps {
  song: KaraokeSong
  onBack: () => void
  onEdit?: () => void
  onDelete: () => void
}

/** カラオケ歌唱曲の全登録項目と詳細操作を表示する。 */
export function KaraokeSongDetail({ song, onBack, onEdit, onDelete }: KaraokeSongDetailProps) {
  const detail = createKaraokeDetailViewModel(song)
  const hasRegisteredEpisodes = song.streamingEpisodes.length > 0

  return (
    <article className="karaoke-song-detail">
      <section
        className="karaoke-song-detail__information-card"
        aria-labelledby="karaoke-song-detail-title"
      >
        <header className="karaoke-song-detail__header">
          <p className="karaoke-song-detail__title-label">曲名</p>
          <h1 id="karaoke-song-detail-title" className="karaoke-song-detail__title">
            {detail.title}
          </h1>
        </header>

        <dl className="karaoke-song-detail__information-list">
          <div className="karaoke-song-detail__information-item">
            <dt className="karaoke-song-detail__information-label">原曲アーティスト名</dt>
            <dd className="karaoke-song-detail__information-value">{detail.originalArtist}</dd>
          </div>
          <div className="karaoke-song-detail__information-item">
            <dt className="karaoke-song-detail__information-label">発売年</dt>
            <dd className="karaoke-song-detail__information-value">{detail.releaseYear}</dd>
          </div>
          <div className="karaoke-song-detail__information-item">
            <dt className="karaoke-song-detail__information-label">配信回</dt>
            <dd className="karaoke-song-detail__information-value">
              <ol
                className={`karaoke-song-detail__episodes${
                  hasRegisteredEpisodes ? '' : ' karaoke-song-detail__episodes--unregistered'
                }`}
              >
                {detail.streamingEpisodes.map((episode, index) => (
                  <li key={`${index}-${episode}`} className="karaoke-song-detail__episode">
                    {episode}
                  </li>
                ))}
              </ol>
            </dd>
          </div>
          <div className="karaoke-song-detail__information-item">
            <dt className="karaoke-song-detail__information-label">備考</dt>
            <dd className="karaoke-song-detail__information-value karaoke-song-detail__notes">
              {detail.notes}
            </dd>
          </div>
        </dl>
      </section>

      <div className="karaoke-song-detail__actions" aria-label="詳細操作">
        <button type="button" className="karaoke-song-detail__back-button" onClick={onBack}>
          <svg
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          カラオケ歌唱一覧へ戻る
        </button>
        {onEdit && (
          <button type="button" className="karaoke-song-detail__edit-button" onClick={onEdit}>
            <svg
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            編集する
          </button>
        )}
        <button
          type="button"
          className="karaoke-song-detail__delete-button"
          onClick={onDelete}
          aria-label="このカラオケ歌唱曲を削除"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          削除
        </button>
      </div>
    </article>
  )
}

export default KaraokeSongDetail
