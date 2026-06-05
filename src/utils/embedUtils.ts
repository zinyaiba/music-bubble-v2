/**
 * 埋め込みコンテンツのユーティリティ関数
 */

/**
 * YouTube埋め込みからビデオIDを抽出
 */
export function extractYouTubeVideoId(embedHtml: string): string | null {
  // iframe srcからvideoIdを抽出
  const iframeSrcMatch = embedHtml.match(/src=["']([^"']+)["']/)
  if (!iframeSrcMatch) return null

  const src = iframeSrcMatch[1]
  
  // youtube.com/embed/{videoId} 形式
  const embedMatch = src.match(/youtube\.com\/embed\/([^?&]+)/)
  if (embedMatch) return embedMatch[1]

  // youtu.be/{videoId} 形式
  const shortMatch = src.match(/youtu\.be\/([^?&]+)/)
  if (shortMatch) return shortMatch[1]

  // youtube.com/watch?v={videoId} 形式
  const watchMatch = src.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (watchMatch) return watchMatch[1]

  return null
}

/**
 * Spotify埋め込みからトラックIDを抽出
 */
export function extractSpotifyTrackId(embedHtml: string): string | null {
  // iframe srcからtrackIdを抽出
  const iframeSrcMatch = embedHtml.match(/src=["']([^"']+)["']/)
  if (!iframeSrcMatch) return null

  const src = iframeSrcMatch[1]
  
  // spotify.com/embed/track/{trackId} 形式
  const trackMatch = src.match(/spotify\.com\/embed\/track\/([^?&]+)/)
  if (trackMatch) return trackMatch[1]

  return null
}

/**
 * YouTube動画IDからサムネイルURLを生成
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  }
  
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

/**
 * Spotify トラックIDからカバーアート画像URLを生成
 * 注: SpotifyのカバーアートはAPIアクセスが必要なため、プレースホルダーアイコンを返す
 */
export function getSpotifyThumbnailPlaceholder(): string | null {
  // Spotifyのカバーアートを直接取得する方法がないため、nullを返す
  // プレースホルダー表示に委ねる
  return null
}

/**
 * 埋め込みHTMLからサムネイルURLを取得
 * YouTube、Spotifyに対応
 */
export function getThumbnailFromEmbed(embedHtml: string): string | null {
  // YouTubeの場合
  const youtubeId = extractYouTubeVideoId(embedHtml)
  if (youtubeId) {
    return getYouTubeThumbnailUrl(youtubeId, 'medium')
  }
  
  // Spotifyの場合（プレースホルダーを使用）
  const spotifyId = extractSpotifyTrackId(embedHtml)
  if (spotifyId) {
    return getSpotifyThumbnailPlaceholder()
  }
  
  return null
}

/**
 * 埋め込みのサービス種別を判定
 */
export function getEmbedServiceType(embedHtml: string): 'youtube' | 'spotify' | 'unknown' {
  if (extractYouTubeVideoId(embedHtml)) return 'youtube'
  if (extractSpotifyTrackId(embedHtml)) return 'spotify'
  return 'unknown'
}

