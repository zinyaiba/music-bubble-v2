/**
 * 型定義
 * Music Bubble Explorer V2
 */

// 楽曲データ（既存Firebase構造を継承）
export interface Song {
  id: string
  title: string
  artists?: string[]
  lyricists: string[]
  composers: string[]
  arrangers: string[]
  tags?: string[]
  notes?: string
  releaseYear?: number // 発売年（4桁の数値）
  releaseDate?: string // 発売日（月日、MMDD形式、例: 0315）
  singleName?: string
  albumName?: string
  musicServiceEmbed?: string
  detailPageUrls?: DetailPageUrl[]
  createdAt?: string
  updatedAt?: string
}

export interface DetailPageUrl {
  url: string
  label?: string
}

// タグデータ（クライアント側で生成）
export interface Tag {
  id: string
  name: string
  songIds: string[]
  songCount: number
  /** タグに関連する楽曲の最終更新日時（ISO 8601形式） */
  lastUpdatedAt?: string
}

// シャボン玉データ
export type BubbleType = 'song' | 'lyricist' | 'composer' | 'arranger' | 'tag'

export interface Bubble {
  id: string
  type: BubbleType
  name: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  relatedCount: number
}

// フィルタ状態
export type ArtistFilterValue = '栗林みな実' | 'Minami' | 'other' | null

// 第2フィルタのカテゴリ（楽曲・作詞・作曲・編曲・タグ）
export type CategoryFilterValue = 'song' | 'lyricist' | 'composer' | 'arranger' | 'tag'

export interface FilterState {
  artist: ArtistFilterValue
  categories: CategoryFilterValue[]  // 複数選択可能に変更
  genres: string[]  // タグ選択時のみ使用
}

// エラー種別
export interface NetworkError {
  type: 'network'
  message: string
  retryable: true
}

export interface DataError {
  type: 'data'
  message: string
  retryable: boolean
}

export interface ValidationError {
  type: 'validation'
  field: string
  message: string
}

export type AppError = NetworkError | DataError | ValidationError
