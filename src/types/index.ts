/**
 * 型定義
 * Music Bubble Explorer V2
 */

// 埋め込みコンテンツ
export interface MusicServiceEmbed {
  embed: string // iframeタグまたはURL
  label?: string // 表示ラベル（任意）
}

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
  /** @deprecated 後方互換性のため残存。新規は musicServiceEmbeds を使用 */
  musicServiceEmbed?: string
  /** 複数の埋め込みコンテンツ */
  musicServiceEmbeds?: MusicServiceEmbed[]
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
export type ArtistFilterValue = '栗林みな実' | 'Minami' | 'wild3' | 'other' | null

// 第2フィルタのカテゴリ（楽曲・作詞・作曲・編曲・タグ）
export type CategoryFilterValue = 'song' | 'lyricist' | 'composer' | 'arranger' | 'tag'

export interface FilterState {
  artist: ArtistFilterValue
  categories: CategoryFilterValue[] // 複数選択可能に変更
  genres: string[] // タグ選択時のみ使用
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

// ============================================
// Live Management Types
// ============================================

/**
 * ライブ種別
 * - tour: ツアー
 * - solo: 単独公演
 * - festival: フェス
 * - event: イベント
 */
export type LiveType = 'tour' | 'solo' | 'festival' | 'event'

/**
 * ライブ種別の表示名マッピング
 */
export const LIVE_TYPE_LABELS: Record<LiveType, string> = {
  tour: 'ツアー',
  solo: '単独公演',
  festival: 'フェス',
  event: 'イベント',
}

/**
 * セトリ項目
 * セトリ内の1曲を表すエンティティ
 */
export interface SetlistItem {
  /** 楽曲ID（既存楽曲の場合） */
  songId?: string
  /** 楽曲名（フリー入力または既存楽曲から取得） */
  songTitle: string
  /** 演奏順序（1から開始） */
  order: number
  /** 日替わり曲フラグ */
  isDailySong: boolean
}

/**
 * ライブデータ
 * 音楽公演イベントを表すデータエンティティ
 */
export interface Live {
  /** ライブID */
  id: string
  /** ライブ種別 */
  liveType: LiveType
  /** 公演名 */
  title: string
  /** 会場名 */
  venueName: string
  /** 日時（ISO 8601形式） */
  dateTime: string
  /** 公演地（ツアーの場合のみ） */
  tourLocation?: string
  /** セトリ */
  setlist: SetlistItem[]
  /** 埋め込みコンテンツ */
  embeds?: MusicServiceEmbed[]
  /** 作成日時 */
  createdAt?: string
  /** 更新日時 */
  updatedAt?: string
}

/**
 * ライブ作成用データ（idなし）
 */
export interface CreateLiveData {
  liveType: LiveType
  title: string
  venueName: string
  dateTime: string
  tourLocation?: string
  setlist: SetlistItem[]
  embeds?: MusicServiceEmbed[]
}

/**
 * ライブ更新用データ（部分更新）
 */
export type UpdateLiveData = Partial<CreateLiveData>

// ============================================
// Tour Grouping Types
// ============================================

/**
 * ツアーグループ
 * 同じツアー名を持つ複数の公演をグループ化したデータ構造
 * クライアント側で生成される仮想的なデータ構造（Firestoreには保存しない）
 */
export interface TourGroup {
  /** グループID（最初の公演IDを使用） */
  id: string
  /** ツアー名 */
  tourName: string
  /** グループ内の公演リスト（日時昇順） */
  performances: Live[]
  /** 公演数 */
  performanceCount: number
  /** 最初の公演日時（代表日時） */
  firstDate: string
  /** 最後の公演日時 */
  lastDate: string
}

/**
 * グループ化されたライブ一覧の項目
 * ツアーグループまたは単独ライブのいずれか
 */
export type GroupedLiveItem =
  | { type: 'tour'; data: TourGroup }
  | { type: 'live'; data: Live }
