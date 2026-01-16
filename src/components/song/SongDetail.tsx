/**
 * SongDetail コンポーネント
 * 楽曲詳細表示、埋め込みコンテンツ、外部リンク
 *
 * Requirements:
 * - 8.1: 全ての楽曲メタデータを表示
 * - 8.2: 埋め込みコンテンツ（Spotify、YouTube等）をiframeで表示
 * - 8.3: 音楽サービスへの外部リンクを表示
 * - 8.4: 楽曲に関連する全てのタグを表示
 * - 8.6: 欠落または無効な埋め込みコンテンツを適切に処理
 */

import type { Song, MusicServiceEmbed } from '../../types'
import './SongDetail.css'

export interface SongDetailProps {
  /** 楽曲データ */
  song: Song
  /** 編集ボタンクリック時のコールバック */
  onEdit?: () => void
  /** 削除ボタンクリック時のコールバック */
  onDelete?: () => void
  /** 楽曲一覧へ戻るボタンクリック時のコールバック */
  onBack: () => void
  /** ひとつ前に戻るボタンクリック時のコールバック */
  onGoBack?: () => void
}

/**
 * 配列を表示用文字列に変換
 */
function formatArray(arr: string[] | undefined, fallback = '-'): string {
  if (!arr || arr.length === 0) return fallback
  return arr.join(', ')
}

/**
 * 埋め込みコンテンツからサービス名を判定
 */
function getEmbedServiceName(embedContent: string, label?: string): string {
  if (label) return label
  if (embedContent.includes('spotify')) return 'Spotify'
  if (embedContent.includes('youtube') || embedContent.includes('youtu.be')) return 'YouTube'
  if (embedContent.includes('apple')) return 'Apple Music'
  if (embedContent.includes('soundcloud')) return 'SoundCloud'
  return '音楽サービス'
}

/**
 * 埋め込みコンテンツ配列を取得（後方互換性対応）
 */
function getEmbeds(song: Song): MusicServiceEmbed[] {
  // 新形式があればそれを使用
  if (song.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
    return song.musicServiceEmbeds
  }
  // 旧形式からの変換
  if (song.musicServiceEmbed && song.musicServiceEmbed.trim()) {
    return [{ embed: song.musicServiceEmbed }]
  }
  return []
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
  if (url.includes('aniuta')) return 'ANiUTa'
  if (url.includes('mora')) return 'mora'
  if (url.includes('recochoku')) return 'レコチョク'
  if (url.includes('oricon')) return 'ORICON'
  if (url.includes('utaten')) return 'UtaTen'
  if (url.includes('uta-net')) return 'Uta-Net'
  if (url.includes('joysound')) return 'JOYSOUND'
  if (url.includes('dam')) return 'DAM'
  return 'リンク'
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
  // YYYY-MM-DD形式の場合（旧形式対応）
  if (releaseDate) {
    const match = releaseDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match
      return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`
    }
    // その他の形式はそのまま表示
    return releaseDate
  }
  // 年のみの場合
  if (releaseYear) {
    return `${releaseYear}年`
  }
  return null
}

/**
 * SongDetail コンポーネント
 * 楽曲の詳細情報を表示
 */
export function SongDetail({ song, onEdit, onDelete, onBack, onGoBack }: SongDetailProps) {
  const embeds = getEmbeds(song)
  const hasEmbeds = embeds.length > 0
  const hasLinks = song.detailPageUrls && song.detailPageUrls.length > 0
  const hasTags = song.tags && song.tags.length > 0
  const releaseDisplayDate = formatReleaseDate(song.releaseYear, song.releaseDate)

  return (
    <article className="song-detail">
      {/* ヘッダー情報 */}
      <header className="song-detail__header">
        <h1 className="song-detail__title">{song.title}</h1>
        <p className="song-detail__artist">{formatArray(song.artists)}</p>
      </header>

      {/* 埋め込みコンテンツ */}
      {hasEmbeds && (
        <section className="song-detail__embed-section">
          <h2 className="song-detail__section-title">埋め込みコンテンツ</h2>
          <div className="song-detail__embeds">
            {embeds.map((item, index) => (
              <div key={index} className="song-detail__embed-item">
                <h3 className="song-detail__embed-label">
                  {getEmbedServiceName(item.embed, item.label)}
                </h3>
                {isIframeTag(item.embed) ? (
                  // iframeタグをそのまま表示
                  <div
                    className="song-detail__embed-container"
                    dangerouslySetInnerHTML={{ __html: item.embed }}
                  />
                ) : (
                  // URLの場合はiframeで表示
                  <div className="song-detail__embed-container">
                    <iframe
                      src={item.embed}
                      className="song-detail__embed"
                      title={`${song.title} - ${getEmbedServiceName(item.embed, item.label)}`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* クレジット情報 */}
      <section className="song-detail__credits-section">
        <h2 className="song-detail__section-title">クレジット</h2>
        <dl className="song-detail__credits">
          <div className="song-detail__credit-item">
            <dt className="song-detail__credit-label">作詞</dt>
            <dd className="song-detail__credit-value">
              {formatArray(song.lyricists)}
            </dd>
          </div>
          <div className="song-detail__credit-item">
            <dt className="song-detail__credit-label">作曲</dt>
            <dd className="song-detail__credit-value">
              {formatArray(song.composers)}
            </dd>
          </div>
          <div className="song-detail__credit-item">
            <dt className="song-detail__credit-label">編曲</dt>
            <dd className="song-detail__credit-value">
              {formatArray(song.arrangers)}
            </dd>
          </div>
        </dl>
      </section>

      {/* リリース情報 */}
      {(releaseDisplayDate || song.singleName || song.albumName) && (
        <section className="song-detail__release-section">
          <h2 className="song-detail__section-title">リリース情報</h2>
          <dl className="song-detail__release-info">
            {releaseDisplayDate && (
              <div className="song-detail__release-item">
                <dt className="song-detail__release-label">発売日</dt>
                <dd className="song-detail__release-value">
                  {releaseDisplayDate}
                </dd>
              </div>
            )}
            {song.singleName && (
              <div className="song-detail__release-item">
                <dt className="song-detail__release-label">シングル</dt>
                <dd className="song-detail__release-value">{song.singleName}</dd>
              </div>
            )}
            {song.albumName && (
              <div className="song-detail__release-item">
                <dt className="song-detail__release-label">アルバム</dt>
                <dd className="song-detail__release-value">{song.albumName}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* タグ */}
      {hasTags && (
        <section className="song-detail__tags-section">
          <h2 className="song-detail__section-title">タグ</h2>
          <div className="song-detail__tags">
            {song.tags!.map((tag) => (
              <span key={tag} className="song-detail__tag">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 外部リンク */}
      {hasLinks && (
        <section className="song-detail__links-section">
          <h2 className="song-detail__section-title">外部リンク</h2>
          <ul className="song-detail__links">
            {song.detailPageUrls!.map((link, index) => (
              <li key={index} className="song-detail__link-item">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="song-detail__link"
                >
                  <span className="song-detail__link-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </span>
                  <span className="song-detail__link-label">
                    {getLinkLabel(link.url, link.label)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* メモ */}
      {song.notes && (
        <section className="song-detail__notes-section">
          <h2 className="song-detail__section-title">メモ</h2>
          <p className="song-detail__notes">{song.notes}</p>
        </section>
      )}

      {/* アクションボタン */}
      <div className="song-detail__actions">
        <button
          type="button"
          className="song-detail__back-button"
          onClick={onBack}
        >
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
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          楽曲一覧へ戻る
        </button>
        {onGoBack && (
          <button
            type="button"
            className="song-detail__goback-button"
            onClick={onGoBack}
          >
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
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            ひとつ前に戻る
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            className="song-detail__edit-button"
            onClick={onEdit}
          >
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
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            編集
          </button>
        )}
      </div>

      {/* 削除ボタン */}
      {onDelete && (
        <div className="song-detail__danger-zone">
          <button
            type="button"
            className="song-detail__delete-button"
            onClick={onDelete}
          >
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
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            この楽曲を削除
          </button>
        </div>
      )}
    </article>
  )
}

export default SongDetail
