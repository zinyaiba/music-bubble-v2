/**
 * LazyEmbed コンポーネント
 *
 * 音楽サービスの埋め込み（Spotify / YouTube 等）を「サムネイル先行・iframe 遅延生成」で表示する。
 *
 * 目的（パフォーマンス／メモリ対策）:
 * - タイムラインなど多数の埋め込みを一覧表示する画面で、最初から本物の iframe を
 *   大量に生成するとモバイルブラウザがメモリを使い果たしてクラッシュする。
 * - そこで、初期表示は軽量なサムネイル画像（YouTube は img.youtube.com、
 *   Spotify 等はサービスアイコンのプレースホルダー）に留め、
 *   ユーザーが再生（タップ）したときに初めて iframe を生成する。
 * - これは楽曲ページの「サムネイル表示モード」と同じ考え方（embedUtils を共用）。
 */

import { useState } from 'react'
import type { JSX } from 'react'
import { getThumbnailFromEmbed, getEmbedServiceType } from '../../utils/embedUtils'
import './LazyEmbed.css'

export interface LazyEmbedProps {
  /** 埋め込み内容（iframe タグ文字列、または iframe の src URL） */
  embed: string
  /** サムネイルやアクセシビリティ用のタイトル */
  title: string
  /** サービス名などの補助ラベル（任意） */
  label?: string
}

/** 埋め込み内容が iframe タグか（<iframe ...> 形式か）を判定 */
function isIframeTag(content: string | undefined): boolean {
  if (!content) return false
  return content.trim().toLowerCase().startsWith('<iframe')
}

/**
 * LazyEmbed コンポーネント
 * サムネイルを先に表示し、タップで iframe を生成する。
 */
export function LazyEmbed({ embed, title, label }: LazyEmbedProps): JSX.Element {
  const [activated, setActivated] = useState(false)

  const serviceType = getEmbedServiceType(embed)
  const thumbnailUrl = getThumbnailFromEmbed(embed)

  // 再生後（activated）は本物の iframe を生成する
  if (activated) {
    if (isIframeTag(embed)) {
      return (
        <div
          className="lazy-embed lazy-embed--active"
          dangerouslySetInnerHTML={{ __html: embed }}
        />
      )
    }
    return (
      <div className="lazy-embed lazy-embed--active">
        <iframe
          src={embed}
          className="lazy-embed__iframe"
          title={title}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      </div>
    )
  }

  // 初期表示: 軽量なサムネイル（img もしくはサービスアイコンのプレースホルダー）
  const handleActivate = () => setActivated(true)

  return (
    <button
      type="button"
      className="lazy-embed lazy-embed__preview"
      onClick={handleActivate}
      aria-label={`${title} を再生`}
    >
      {thumbnailUrl ? (
        <img
          className="lazy-embed__thumb"
          src={thumbnailUrl}
          alt={title}
          loading="lazy"
        />
      ) : (
        <span className={`lazy-embed__placeholder lazy-embed__placeholder--${serviceType}`}>
          {serviceType === 'spotify' ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          ) : serviceType === 'youtube' ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          )}
        </span>
      )}

      {/* 再生オーバーレイ（タップで iframe 生成） */}
      <span className="lazy-embed__play" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      {label && <span className="lazy-embed__label">{label}</span>}
    </button>
  )
}

export default LazyEmbed
