/**
 * ツアーグループ化サービス
 * Music Bubble Explorer V2
 * ライブデータをツアー名でグループ化するロジックを提供
 */

import type { Live, TourGroup, GroupedLiveItem } from '../types'

/**
 * ツアーグループ化サービスクラス
 */
export class TourGroupingService {
  private static instance: TourGroupingService

  private constructor() {}

  public static getInstance(): TourGroupingService {
    if (!TourGroupingService.instance) {
      TourGroupingService.instance = new TourGroupingService()
    }
    return TourGroupingService.instance
  }

  /**
   * ライブリストをグループ化
   * - liveType='tour'のライブを同じtitleでグループ化
   * - liveType='solo'/'festival'は個別項目として返す
   * @param lives ライブデータの配列
   * @returns グループ化されたアイテムの配列（日時降順）
   */
  public groupLives(lives: Live[]): GroupedLiveItem[] {
    // ツアーとその他を分離
    const tourLives: Live[] = []
    const otherLives: Live[] = []

    for (const live of lives) {
      if (live.liveType === 'tour') {
        tourLives.push(live)
      } else {
        otherLives.push(live)
      }
    }

    // ツアーをtitleでグループ化
    const tourGroups = new Map<string, Live[]>()
    for (const live of tourLives) {
      const existing = tourGroups.get(live.title)
      if (existing) {
        existing.push(live)
      } else {
        tourGroups.set(live.title, [live])
      }
    }

    // グループ化されたアイテムを作成
    const groupedItems: GroupedLiveItem[] = []

    // ツアーグループを追加
    for (const [tourName, performances] of tourGroups) {
      const tourGroup = this.createTourGroup(tourName, performances)
      groupedItems.push({ type: 'tour', data: tourGroup })
    }

    // その他のライブを個別項目として追加
    for (const live of otherLives) {
      groupedItems.push({ type: 'live', data: live })
    }

    // 日時でソートして返す
    return this.sortGroupedItems(groupedItems)
  }

  /**
   * ツアーグループを生成
   * @param tourName ツアー名
   * @param performances 公演リスト
   * @returns TourGroup
   */
  public createTourGroup(tourName: string, performances: Live[]): TourGroup {
    // 公演を日時昇順でソート
    const sortedPerformances = [...performances].sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime()
      const dateB = new Date(b.dateTime).getTime()
      return dateA - dateB // 昇順（古い順）
    })

    // 最初と最後の公演日時を取得
    const firstDate = sortedPerformances[0]?.dateTime || ''
    const lastDate = sortedPerformances[sortedPerformances.length - 1]?.dateTime || ''

    // グループIDは最初の公演IDを使用
    const id = sortedPerformances[0]?.id || `tour-${Date.now()}`

    return {
      id,
      tourName,
      performances: sortedPerformances,
      performanceCount: sortedPerformances.length,
      firstDate,
      lastDate,
    }
  }

  /**
   * グループ化されたアイテムを日時でソート
   * @param items グループ化されたアイテム
   * @returns ソートされたアイテム（降順）
   */
  public sortGroupedItems(items: GroupedLiveItem[]): GroupedLiveItem[] {
    return [...items].sort((a, b) => {
      // 代表日時を取得
      const dateA = this.getRepresentativeDate(a)
      const dateB = this.getRepresentativeDate(b)
      return dateB - dateA // 降順（新しい順）
    })
  }

  /**
   * グループ化されたアイテムの代表日時を取得
   * @param item グループ化されたアイテム
   * @returns 代表日時のタイムスタンプ（ミリ秒）
   */
  private getRepresentativeDate(item: GroupedLiveItem): number {
    if (item.type === 'tour') {
      // ツアーは最初の公演日時（firstDate）を代表日時とする
      return new Date(item.data.firstDate).getTime()
    } else {
      // 個別ライブはdateTimeを使用
      return new Date(item.data.dateTime).getTime()
    }
  }
}

// シングルトンインスタンスをエクスポート
export const tourGroupingService = TourGroupingService.getInstance()
