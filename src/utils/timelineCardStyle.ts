/**
 * タイムラインカード視覚設定モジュール
 * Music Bubble Explorer V2
 *
 * タイムラインカードのカテゴリ判定と視覚設定を一元化する純粋関数・型・定数群。
 * DOM / React に依存しない。各コンポーネントはここで解決した設定に従って
 * クラス名・バッジ・アクセントバーを描画する。
 *
 * 本ファイルは型定義・定数（EMPHASIS_RANK / DOMAIN_PALETTE）と、
 * カテゴリ判定・視覚設定を解決する純粋関数 `resolveCardStyle` を提供する。
 */

import { LIVE_TYPE_LABELS } from '../types'
import type { LiveType } from '../types'

/** 4 カテゴリ */
export type CardCategory = 'solo' | 'tour' | 'music' | 'other-live'

/** 情報ドメイン */
export type CardDomain = 'music' | 'live'

/** 使用する色相パレット */
export type ColorPalette = 'pink' | 'purple'

/** カード内テキストバッジ（色以外の判別手段） */
export interface CardBadge {
  /** 種別を示すテキストラベル（必ず非空） */
  label: string
  /** 種別を示すアイコン（絵文字またはアイコン識別子。任意） */
  icon?: string
  /**
   * サブ種別配色クラスのサフィックス（Other_Live_Card のみ）。
   * 既存 live-timeline-item__type--{festival|event|release|other} を再利用する。
   */
  subTypeClass?: 'festival' | 'event' | 'release' | 'overseas' | 'other'
}

/** カードの視覚設定（描画に必要な情報の集約） */
export interface TimelineCardVisualConfig {
  category: CardCategory
  domain: CardDomain
  palette: ColorPalette
  /** 軸に対する配置 */
  position: 'left' | 'right' | 'center'
  /**
   * 強調序列。値が大きいほど強調度が高い。
   * solo=4, tour=3, music=2, other-live=1
   */
  emphasisRank: number
  /** ルートに付与する BEM 修飾子クラス（例: 'timeline-card--solo'） */
  categoryClass: string
  /** カテゴリ判別用のテキストバッジ */
  badge: CardBadge
}

/** resolveCardStyle への入力（各コンポーネントの判別情報） */
export type CardStyleInput =
  | { kind: 'major-event'; eventType: 'solo' | 'tour' }
  | { kind: 'song' }
  | { kind: 'release-unit'; releaseType: 'single' | 'album' }
  | { kind: 'live'; liveType: LiveType }

/**
 * 強調序列。値が大きいほど強調度が高い。
 * 序列 Solo ＞ Tour ＞ Music ＞ Other_Live を厳密な全順序として表現する。
 */
export const EMPHASIS_RANK: Record<CardCategory, number> = {
  solo: 4,
  tour: 3,
  music: 2,
  'other-live': 1,
}

/**
 * 情報ドメイン → 色相パレットの一意な対応。
 * Music_Card は常に pink、Live 系（solo/tour/other-live）は常に purple。
 */
export const DOMAIN_PALETTE: Record<CardDomain, ColorPalette> = {
  music: 'pink',
  live: 'purple',
}

/** ルートに付与する BEM 修飾子クラスのプレフィックス */
const CATEGORY_CLASS_PREFIX = 'timeline-card--'

/** single/album を示すアイコン（絵文字識別子） */
const SINGLE_ICON = '💿'
const ALBUM_ICON = '📀'

/** カテゴリ → ドメインの対応（palette は DOMAIN_PALETTE 経由で導出する） */
const CATEGORY_DOMAIN: Record<CardCategory, CardDomain> = {
  solo: 'live',
  tour: 'live',
  music: 'music',
  'other-live': 'live',
}

/** カテゴリ → 軸配置の対応 */
const CATEGORY_POSITION: Record<CardCategory, TimelineCardVisualConfig['position']> = {
  solo: 'center',
  tour: 'center',
  music: 'right',
  'other-live': 'left',
}

/**
 * カテゴリ・バッジ情報から `TimelineCardVisualConfig` を組み立てる内部ヘルパー。
 * `palette` は `DOMAIN_PALETTE[domain]`、`emphasisRank` は `EMPHASIS_RANK[category]`
 * から一意に導出し、規則の単一情報源を保つ。
 */
function buildConfig(category: CardCategory, badge: CardBadge): TimelineCardVisualConfig {
  const domain = CATEGORY_DOMAIN[category]
  return {
    category,
    domain,
    palette: DOMAIN_PALETTE[domain],
    position: CATEGORY_POSITION[category],
    emphasisRank: EMPHASIS_RANK[category],
    categoryClass: `${CATEGORY_CLASS_PREFIX}${category}`,
    badge,
  }
}

/**
 * Other_Live_Card（live サブ種別）の視覚設定を解決する。
 * `subTypeClass` は入力の `liveType` と一致させ、既存の
 * `live-timeline-item__type--*` 配色クラスへ対応づける。
 */
function resolveLiveCardStyle(liveType: LiveType): TimelineCardVisualConfig {
  switch (liveType) {
    case 'festival':
    case 'event':
    case 'release':
    case 'overseas':
    case 'other':
      return buildConfig('other-live', {
        label: LIVE_TYPE_LABELS[liveType],
        subTypeClass: liveType,
      })
    // タイムライン上は solo/tour は major-event として描画されるため通常発生しないが、
    // LiveTimelineItem に solo/tour が渡された場合も Other_Live 相当（purple）へ寄せて
    // 描画を継続する（Error Handling 参照）。
    case 'solo':
      return buildConfig('other-live', {
        label: LIVE_TYPE_LABELS.solo,
        subTypeClass: 'other',
      })
    case 'tour':
      return buildConfig('other-live', {
        label: LIVE_TYPE_LABELS.tour,
        subTypeClass: 'other',
      })
    default:
      // 網羅性チェック（コンパイル時に欠落を検出する）
      return assertNeverLiveType(liveType)
  }
}

/**
 * 判別情報からカードの視覚設定を解決する純粋関数。
 *
 * すべての有効な入力に対して必ず設定を返す（未定義動作なし）。設計の
 * 「カテゴリ解決表」に従い、`palette` は `DOMAIN_PALETTE[domain]`、
 * `emphasisRank` は `EMPHASIS_RANK[category]` から一意に導出する。
 *
 * 網羅性は判別ユニオンの `switch` と `never` フォールバックでコンパイル時に検証する。
 * 実行時に想定外の値が来た場合は、最も控えめなカテゴリ（other-live・purple・left）へ
 * フォールバックし、UI を破綻させない。
 */
export function resolveCardStyle(input: CardStyleInput): TimelineCardVisualConfig {
  switch (input.kind) {
    case 'major-event':
      // 単独公演（solo）/ ツアー（tour）: center 配置・purple。
      return input.eventType === 'solo'
        ? buildConfig('solo', { label: LIVE_TYPE_LABELS.solo })
        : buildConfig('tour', { label: LIVE_TYPE_LABELS.tour })

    case 'song':
      // 個別曲: 曲ラベル（アイコンなし）・pink・right。
      return buildConfig('music', { label: '曲' })

    case 'release-unit':
      // シングル / アルバム: 同一 pink 色相をアイコン + テキストで区別する。
      return input.releaseType === 'single'
        ? buildConfig('music', { label: 'シングル', icon: SINGLE_ICON })
        : buildConfig('music', { label: 'アルバム', icon: ALBUM_ICON })

    case 'live':
      return resolveLiveCardStyle(input.liveType)

    default:
      // 網羅性チェック: 判別ユニオンに新種別が追加されるとコンパイルエラーになる。
      return assertNeverInput(input)
  }
}

/**
 * `CardStyleInput` の網羅性チェック用フォールバック。
 * コンパイル時は `never` により欠落を検出し、実行時に想定外の値が来た場合は
 * 最も控えめな Other_Live 相当の設定へフォールバックする。
 */
function assertNeverInput(input: never): TimelineCardVisualConfig {
  void (input as unknown)
  return buildConfig('other-live', {
    label: LIVE_TYPE_LABELS.other,
    subTypeClass: 'other',
  })
}

/**
 * `LiveType` の網羅性チェック用フォールバック。
 * 実行時に想定外の値が来た場合も控えめな Other_Live 相当へフォールバックする。
 */
function assertNeverLiveType(liveType: never): TimelineCardVisualConfig {
  void (liveType as unknown)
  return buildConfig('other-live', {
    label: LIVE_TYPE_LABELS.other,
    subTypeClass: 'other',
  })
}
