/**
 * BubbleDetail コンポーネント
 * シャボン玉詳細表示（モーダル）と楽曲詳細ページへのリンク
 *
 * Requirements: 1.2, 1.3
 * - シャボン玉詳細表示（モーダル）
 * - 楽曲詳細ページへのリンク
 */

import React, { useCallback, useMemo, useEffect } from 'react'
import type { Bubble as BubbleType, Song } from '../../types'
import './BubbleDetail.css'

interface BubbleDetailProps {
  bubble: BubbleType | null
  songs: Song[]
  onSongClick: (songId: string) => void
  onClose: () => void
  onTagClick?: (tagName: string) => void
  onPersonClick?: (personName: string, type: 'lyricist' | 'composer' | 'arranger') => void
  onSongBubbleClick?: (songTitle: string) => void
}

interface RelatedItem {
  id: string
  name: string
  type: 'song' | 'person' | 'tag'
  role?: 'lyricist' | 'composer' | 'arranger' | 'tag'
  song?: Song
}

/**
 * 役割のラベルを取得
 */
const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'lyricist':
      return '作詞'
    case 'composer':
      return '作曲'
    case 'arranger':
      return '編曲'
    case 'tag':
      return 'タグ'
    default:
      return role
  }
}

/**
 * タイプに応じたアイコンを取得
 */
const getTypeIcon = (type: string): string => {
  switch (type) {
    case 'song':
      return '🎵'
    case 'lyricist':
      return '✍️'
    case 'composer':
      return '🎼'
    case 'arranger':
      return '🎧'
    case 'tag':
      return '🏷️'
    default:
      return '💫'
  }
}

/**
 * BubbleDetail コンポーネント
 * シャボン玉の詳細情報をモーダルで表示
 */
export const BubbleDetail: React.FC<BubbleDetailProps> = React.memo(
  ({ bubble, songs, onSongClick, onClose, onTagClick, onPersonClick, onSongBubbleClick }) => {
    // 現在のバブルが楽曲の場合、そのSongオブジェクトを取得
    const currentSong = useMemo(() => {
      if (!bubble || bubble.type !== 'song') return null
      return songs.find((s) => s.title === bubble.name) || null
    }, [bubble, songs])
    // 関連データを計算
    const relatedItems = useMemo((): RelatedItem[] => {
      if (!bubble) return []

      const items: RelatedItem[] = []

      if (bubble.type === 'song') {
        // 楽曲の場合: 関連する人物とタグを表示
        const song = songs.find((s) => s.title === bubble.name)
        if (song) {
          // 作詞家
          song.lyricists?.forEach((name) => {
            items.push({
              id: `lyricist-${name}`,
              name,
              type: 'person',
              role: 'lyricist',
            })
          })
          // 作曲家
          song.composers?.forEach((name) => {
            items.push({
              id: `composer-${name}`,
              name,
              type: 'person',
              role: 'composer',
            })
          })
          // 編曲家
          song.arrangers?.forEach((name) => {
            items.push({
              id: `arranger-${name}`,
              name,
              type: 'person',
              role: 'arranger',
            })
          })
          // タグ
          song.tags?.forEach((tag) => {
            items.push({
              id: `tag-${tag}`,
              name: tag,
              type: 'tag',
              role: 'tag',
            })
          })
        }
      } else if (bubble.type === 'tag') {
        // タグの場合: 関連する楽曲を表示
        songs.forEach((song) => {
          if (song.tags?.includes(bubble.name)) {
            items.push({
              id: song.id,
              name: song.title,
              type: 'song',
              song,
            })
          }
        })
      } else {
        // 人物の場合: 関連する楽曲を表示
        songs.forEach((song) => {
          const roles: Array<'lyricist' | 'composer' | 'arranger'> = []

          if (song.lyricists?.includes(bubble.name)) roles.push('lyricist')
          if (song.composers?.includes(bubble.name)) roles.push('composer')
          if (song.arrangers?.includes(bubble.name)) roles.push('arranger')

          roles.forEach((role) => {
            items.push({
              id: `${song.id}-${role}`,
              name: song.title,
              type: 'song',
              role,
              song,
            })
          })
        })
      }

      return items
    }, [bubble, songs])

    // アイテムクリックハンドラー
    const handleItemClick = useCallback(
      (item: RelatedItem) => {
        if (item.type === 'song' && item.song && onSongBubbleClick) {
          // 楽曲をタップしたら、その楽曲の関連情報を表示
          onSongBubbleClick(item.song.title)
        } else if (item.type === 'tag' && onTagClick) {
          onTagClick(item.name)
        } else if (item.type === 'person' && onPersonClick && item.role) {
          onPersonClick(item.name, item.role as 'lyricist' | 'composer' | 'arranger')
        }
      },
      [onSongBubbleClick, onTagClick, onPersonClick]
    )

    // 楽曲詳細ページへ遷移
    const handleGoToSongDetail = useCallback(
      (songId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        onSongClick(songId)
      },
      [onSongClick]
    )

    // キーボードでの閉じる操作
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onClose()
        }
      },
      [onClose]
    )

    // モーダルが開いている時にbodyのスクロールを無効化
    useEffect(() => {
      if (bubble) {
        document.body.style.overflow = 'hidden'
      }
      return () => {
        document.body.style.overflow = ''
      }
    }, [bubble])

    // バブルがない場合は何も表示しない
    if (!bubble) return null

    const title = bubble.type === 'tag' ? `#${bubble.name}` : bubble.name
    const icon = getTypeIcon(bubble.type)

    return (
      <div
        className="bubble-detail-overlay"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bubble-detail-title"
      >
        <div className="bubble-detail-modal" onClick={(e) => e.stopPropagation()} role="document">
          {/* ヘッダー */}
          <header className="bubble-detail-header">
            <h2 id="bubble-detail-title" className="bubble-detail-title">
              <span className="bubble-detail-icon" aria-hidden="true">
                {icon}
              </span>
              {title}
            </h2>
            <div className="bubble-detail-header-actions">
              {/* 楽曲の場合は詳細ページへの遷移ボタンを表示 */}
              {bubble.type === 'song' && currentSong && (
                <button
                  className={`bubble-detail-go-to-detail ${currentSong.musicServiceEmbed ? 'has-embed' : ''}`}
                  onClick={(e) => handleGoToSongDetail(currentSong.id, e)}
                  aria-label={
                    currentSong.musicServiceEmbed
                      ? '楽曲詳細ページへ（試聴あり）'
                      : '楽曲詳細ページへ'
                  }
                  type="button"
                  title={
                    currentSong.musicServiceEmbed
                      ? '楽曲詳細ページへ（試聴あり）'
                      : '楽曲詳細ページへ'
                  }
                >
                  {currentSong.musicServiceEmbed ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  )}
                </button>
              )}
              <button
                className="bubble-detail-close"
                onClick={onClose}
                aria-label="閉じる"
                type="button"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          {/* 説明文 */}
          <p className="bubble-detail-description">タップすると関連情報を次々に辿れるよ！</p>

          {/* コンテンツ */}
          <div className="bubble-detail-content">
            {bubble.type === 'song' ? (
              <section className="bubble-detail-section">
                <h3 className="bubble-detail-section-title">関連する人物・タグ</h3>
                {relatedItems.length > 0 ? (
                  <ul className="bubble-detail-list" role="list">
                    {relatedItems.map((item) => (
                      <li key={item.id} className="bubble-detail-item">
                        <button
                          className="bubble-detail-item-button"
                          onClick={() => handleItemClick(item)}
                          type="button"
                        >
                          <span className={`bubble-detail-role role-${item.role}`}>
                            {getRoleLabel(item.role || '')}
                          </span>
                          <span className="bubble-detail-item-name">{item.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="bubble-detail-empty">関連する人物やタグが見つかりません</p>
                )}
              </section>
            ) : bubble.type === 'tag' ? (
              <section className="bubble-detail-section">
                <h3 className="bubble-detail-section-title">
                  このタグが付けられた楽曲
                  <span className="bubble-detail-count">({relatedItems.length}曲)</span>
                </h3>
                {relatedItems.length > 0 ? (
                  <ul className="bubble-detail-list" role="list">
                    {relatedItems.map((item) => (
                      <li key={item.id} className="bubble-detail-item">
                        <button
                          className="bubble-detail-item-button bubble-detail-song-item"
                          onClick={() => handleItemClick(item)}
                          type="button"
                        >
                          <div className="bubble-detail-song-info">
                            <span className="bubble-detail-item-name">{item.name}</span>
                            {item.song && (
                              <div className="bubble-detail-song-credits">
                                {item.song.lyricists?.length > 0 && (
                                  <span className="bubble-detail-credit">
                                    作詞: {item.song.lyricists.join(', ')}
                                  </span>
                                )}
                                {item.song.composers?.length > 0 && (
                                  <span className="bubble-detail-credit">
                                    作曲: {item.song.composers.join(', ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {item.song && (
                            <button
                              className={`bubble-detail-go-to-song ${item.song.musicServiceEmbed ? 'has-embed' : ''}`}
                              onClick={(e) => handleGoToSongDetail(item.song!.id, e)}
                              aria-label={
                                item.song.musicServiceEmbed
                                  ? '楽曲詳細ページへ（試聴あり）'
                                  : '楽曲詳細ページへ'
                              }
                              type="button"
                              title={
                                item.song.musicServiceEmbed
                                  ? '楽曲詳細ページへ（試聴あり）'
                                  : '楽曲詳細ページへ'
                              }
                            >
                              {item.song.musicServiceEmbed ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                                </svg>
                              ) : (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              )}
                            </button>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="bubble-detail-empty">このタグが付けられた楽曲が見つかりません</p>
                )}
              </section>
            ) : (
              <section className="bubble-detail-section">
                <h3 className="bubble-detail-section-title">
                  関連する楽曲
                  <span className="bubble-detail-count">({relatedItems.length}曲)</span>
                </h3>
                {relatedItems.length > 0 ? (
                  <ul className="bubble-detail-list" role="list">
                    {relatedItems.map((item) => (
                      <li key={item.id} className="bubble-detail-item">
                        <button
                          className="bubble-detail-item-button"
                          onClick={() => handleItemClick(item)}
                          type="button"
                        >
                          <span className={`bubble-detail-role role-${item.role}`}>
                            {getRoleLabel(item.role || '')}
                          </span>
                          <span className="bubble-detail-item-name">{item.name}</span>
                          {item.song && (
                            <button
                              className={`bubble-detail-go-to-song ${item.song.musicServiceEmbed ? 'has-embed' : ''}`}
                              onClick={(e) => handleGoToSongDetail(item.song!.id, e)}
                              aria-label={
                                item.song.musicServiceEmbed
                                  ? '楽曲詳細ページへ（試聴あり）'
                                  : '楽曲詳細ページへ'
                              }
                              type="button"
                              title={
                                item.song.musicServiceEmbed
                                  ? '楽曲詳細ページへ（試聴あり）'
                                  : '楽曲詳細ページへ'
                              }
                            >
                              {item.song.musicServiceEmbed ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                                </svg>
                              ) : (
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                  <polyline points="15 3 21 3 21 9" />
                                  <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                              )}
                            </button>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="bubble-detail-empty">関連する楽曲が見つかりません</p>
                )}
              </section>
            )}
          </div>

          {/* フッター */}
          <footer className="bubble-detail-footer">
            <button className="bubble-detail-close-button" onClick={onClose} type="button">
              閉じる
            </button>
          </footer>
        </div>
      </div>
    )
  }
)

BubbleDetail.displayName = 'BubbleDetail'

export default BubbleDetail
