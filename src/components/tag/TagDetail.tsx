/**
 * TagDetail コンポーネント
 * タグ詳細表示、関連楽曲一覧、SNS共有機能
 *
 * Requirements:
 * - 6.3: タグをタップした時、そのタグに関連する全ての楽曲を表示すること
 * - 6.4: 各タグの楽曲数を表示すること
 * - 6.5: タグ情報をテキストとしてコピーするSNS共有機能を提供すること
 */

import { useState, useCallback, useMemo } from 'react'
import type { Tag, Song } from '../../types'
import { SongCard } from '../song/SongCard'
import './TagDetail.css'

/**
 * ポスト内容を生成
 * フォーマット:
 * 私のおすすめタグこちら
 * 🏷️タグ名🫧
 * ＃マロバブ　#栗林みな実
 * タグ詳細ページへのURL
 */
function generatePostContent(tagName: string, _songs: Song[], tagId: string): string {
  // ベースURL（GitHub Pages）
  const origin = window.location.origin
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const tagUrl = `${origin}${basePath}/tags?tag=${encodeURIComponent(tagId)}`
  
  // ポスト内容を組み立て
  const line1 = '私のおすすめタグこちら'
  const line2 = `🏷️${tagName}🫧`
  const line3 = '#マロバブ #栗林みな実'
  
  return `${line1}\n${line2}\n\n${line3}\n${tagUrl}`
}

export interface TagDetailProps {
  /** タグデータ */
  tag: Tag
  /** 関連楽曲データ */
  songs: Song[]
  /** 楽曲クリック時のコールバック */
  onSongClick: (songId: string) => void
  /** 共有ボタンクリック時のコールバック */
  onShare: () => void
  /** 戻るボタンクリック時のコールバック */
  onBack: () => void
  /** 編集ボタンクリック時のコールバック */
  onEdit?: () => void
}

/**
 * TagDetail コンポーネント
 * タグの詳細情報と関連楽曲を表示
 */
export function TagDetail({
  tag,
  songs,
  onSongClick,
  onShare,
  onBack,
  onEdit,
}: TagDetailProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  // ポスト内容を生成
  const postContent = useMemo(() => {
    return generatePostContent(tag.name, songs, tag.id)
  }, [tag.name, tag.id, songs])

  // クリップボードにコピー
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(postContent)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました:', err)
      // フォールバック: テキストエリアを使用
      const textArea = document.createElement('textarea')
      textArea.value = postContent
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch {
        console.error('フォールバックコピーにも失敗しました')
      }
      document.body.removeChild(textArea)
    }
  }, [postContent])

  // X（Twitter）で共有
  const handleShareToX = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postContent)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onShare()
  }, [postContent, onShare])

  return (
    <div className="tag-detail">
      {/* ヘッダー */}
      <div className="tag-detail__header">
        <button
          type="button"
          className="tag-detail__back-button"
          onClick={onBack}
          aria-label="戻る"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="tag-detail__title-area">
          <div className="tag-detail__icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>
          <div className="tag-detail__title-info">
            <h1 className="tag-detail__title">{tag.name}</h1>
            <p className="tag-detail__count">{tag.songCount}曲</p>
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            className="tag-detail__edit-button"
            onClick={onEdit}
            aria-label="タグを編集"
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
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        )}
      </div>

      {/* 共有ボタン */}
      <div className="tag-detail__share-section">
        <button
          type="button"
          className="tag-detail__share-button tag-detail__share-button--copy"
          onClick={handleCopyToClipboard}
          aria-label="クリップボードにコピー"
        >
          {copySuccess ? (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              コピーしました
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              ポスト内容をコピー
            </>
          )}
        </button>
        <button
          type="button"
          className="tag-detail__share-button tag-detail__share-button--x"
          onClick={handleShareToX}
          aria-label="Xで共有"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Xで共有
        </button>
      </div>

      {/* 関連楽曲一覧 */}
      <div className="tag-detail__songs">
        <h2 className="tag-detail__songs-title">関連楽曲</h2>
        <div className="tag-detail__songs-list">
          {songs.length > 0 ? (
            songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onClick={() => onSongClick(song.id)}
                compact
              />
            ))
          ) : (
            <p className="tag-detail__songs-empty">
              このタグに関連する楽曲はありません
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TagDetail
