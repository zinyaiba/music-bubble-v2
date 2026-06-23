/**
 * タイムラインデータ変換サービス
 * Music Bubble Explorer V2
 * 楽曲とライブデータをタイムラインアイテムに変換し、グループ化する
 */

import type {
  Song,
  Live,
  TimelineItem,
  SongTimelineItem,
  ReleaseUnitTimelineItem,
  LiveTimelineItem,
  MajorEventTimelineItem,
  TimelineYearMonthGroup,
} from '../types'
import type { FirebaseService } from './firebaseService'
import type { LiveService } from './liveService'
import type { TourGroupingService } from './tourGroupingService'

/**
 * タイムラインサービスクラス
 */
export class TimelineService {
  private static instance: TimelineService
  private firebaseService: FirebaseService
  private liveService: LiveService
  private tourGroupingService: TourGroupingService

  private constructor(
    firebaseService: FirebaseService,
    liveService: LiveService,
    tourGroupingService: TourGroupingService
  ) {
    this.firebaseService = firebaseService
    this.liveService = liveService
    this.tourGroupingService = tourGroupingService
  }

  /**
   * シングルトンインスタンスを取得
   * @param firebaseService Firebase楽曲サービス
   * @param liveService ライブサービス
   * @param tourGroupingService ツアーグループ化サービス
   */
  public static getInstance(
    firebaseService: FirebaseService,
    liveService: LiveService,
    tourGroupingService: TourGroupingService
  ): TimelineService {
    if (!TimelineService.instance) {
      TimelineService.instance = new TimelineService(
        firebaseService,
        liveService,
        tourGroupingService
      )
    }
    return TimelineService.instance
  }

  /**
   * タイムラインデータを取得・変換
   * - 全楽曲と全ライブを取得
   * - タイムラインアイテムに変換して統合
   * - 年月グループ化して返す
   * @param sortOrder グループのソート順（'asc' | 'desc'、デフォルト: 'desc'）
   * @returns 年月グループの配列（時系列順）
   * @throws データ取得に失敗した場合、意味のあるエラーをスロー
   */
  public async fetchTimelineData(
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<TimelineYearMonthGroup[]> {
    try {
      // 楽曲データとライブデータを並列取得
      const [songs, lives] = await Promise.all([
        this.firebaseService.getAllSongs(),
        this.liveService.getAllLives(),
      ])

      // タイムラインアイテムに変換
      const songItems = this.convertSongsToTimelineItems(songs)
      const liveItems = this.convertLivesToTimelineItems(lives)

      // すべてのアイテムを統合
      const allItems: TimelineItem[] = [...songItems, ...liveItems]

      // 年月グループ化
      const groups = this.groupByYearMonth(allItems, sortOrder)

      if (import.meta.env.DEV) {
        console.log(
          `⏰ TimelineService: ${songs.length}曲、${lives.length}件のライブから${groups.length}個の年月グループを生成しました`
        )
      }

      return groups
    } catch (error) {
      console.warn('⏰ TimelineService: タイムラインデータ取得エラー:', error)
      throw new Error('タイムラインデータの取得に失敗しました')
    }
  }

  /**
   * 日付文字列またはreleaseYearとreleaseDateから年月キー（YYYY-MM）を抽出
   * @param dateInput ISO 8601形式の文字列または{year: number, date: string}オブジェクト
   * @returns YYYY-MM形式の文字列、日付情報が欠落している場合は'9999-99'
   */
  public extractYearMonth(
    dateInput: string | { year?: number; date?: string }
  ): string {
    try {
      if (typeof dateInput === 'string') {
        // ISO 8601形式の場合
        const date = new Date(dateInput)
        
        // 無効な日付をチェック
        if (isNaN(date.getTime())) {
          return '9999-99'
        }
        
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        return `${year}-${month}`
      } else {
        // Song型の場合（releaseYear + releaseDate）
        const { year, date } = dateInput
        
        if (!year || !date) {
          return '9999-99' // 日付不明の場合
        }
        
        // releaseDateはMMDD形式
        const month = date.substring(0, 2)
        return `${year}-${month}`
      }
    } catch (error) {
      console.warn('⏰ TimelineService: 年月抽出エラー:', error)
      return '9999-99'
    }
  }

  /**
   * 楽曲をリリース単位でグループ化
   * @param songs 楽曲の配列
   * @returns リリース単位とグループ化されない個別楽曲
   */
  public groupSongsByRelease(songs: Song[]): {
    releaseUnits: Map<string, Song[]>
    standaloneSongs: Song[]
  } {
    const singleMap = new Map<string, Song[]>()
    const albumMap = new Map<string, Song[]>()
    const standaloneSongs: Song[] = []

    for (const song of songs) {
      if (song.singleName) {
        // シングル名でグループ化（優先度1）
        const key = song.singleName
        if (!singleMap.has(key)) {
          singleMap.set(key, [])
        }
        singleMap.get(key)!.push(song)
      } else if (song.albumName) {
        // アルバム名でグループ化（優先度2、singleNameがない場合）
        const key = song.albumName
        if (!albumMap.has(key)) {
          albumMap.set(key, [])
        }
        albumMap.get(key)!.push(song)
      } else {
        // どちらもない楽曲は個別アイテム
        standaloneSongs.push(song)
      }
    }

    // シングルとアルバムをマージ
    const releaseUnits = new Map([...singleMap, ...albumMap])

    return { releaseUnits, standaloneSongs }
  }

  /**
   * 楽曲をタイムラインアイテムに変換
   * - singleNameでグループ化
   * - albumNameでグループ化（singleNameがない場合）
   * - どちらもない場合は個別アイテム
   * @param songs 楽曲の配列
   * @returns タイムラインアイテムの配列
   */
  public convertSongsToTimelineItems(songs: Song[]): TimelineItem[] {
    const timelineItems: TimelineItem[] = []

    // 楽曲をリリース単位でグループ化
    const { releaseUnits, standaloneSongs } = this.groupSongsByRelease(songs)

    // リリース単位をタイムラインアイテムに変換
    for (const [releaseName, releaseSongs] of releaseUnits) {
      // リリース単位内の楽曲をリリース日でソート（古い順）
      const sortedSongs = [...releaseSongs].sort((a, b) => {
        const dateA = this.extractYearMonth({ year: a.releaseYear, date: a.releaseDate })
        const dateB = this.extractYearMonth({ year: b.releaseYear, date: b.releaseDate })
        return dateA.localeCompare(dateB)
      })

      // 最初の楽曲の日付を代表日時として使用
      const firstSong = sortedSongs[0]
      const yearMonth = this.extractYearMonth({
        year: firstSong.releaseYear,
        date: firstSong.releaseDate,
      })

      // リリース単位の日付を決定（releaseYear + releaseDate から ISO 8601形式に変換）
      let date: string
      if (firstSong.releaseYear && firstSong.releaseDate) {
        const year = firstSong.releaseYear
        const month = firstSong.releaseDate.substring(0, 2)
        const day = firstSong.releaseDate.substring(2, 4)
        date = `${year}-${month}-${day}T00:00:00.000Z`
      } else {
        // 日付が不明な場合はフォールバック
        date = '9999-12-31T00:00:00.000Z'
      }

      // リリース種別を決定
      const releaseType = firstSong.singleName ? 'single' : 'album'

      // リリース単位タイムラインアイテムを作成
      const releaseUnitItem: ReleaseUnitTimelineItem = {
        id: `release-unit-${releaseName}`,
        type: 'release-unit',
        position: 'right',
        date,
        yearMonth,
        releaseName,
        releaseType,
        songs: sortedSongs,
      }

      timelineItems.push(releaseUnitItem)
    }

    // 個別楽曲をタイムラインアイテムに変換
    for (const song of standaloneSongs) {
      const yearMonth = this.extractYearMonth({
        year: song.releaseYear,
        date: song.releaseDate,
      })

      // 日付を決定
      let date: string
      if (song.releaseYear && song.releaseDate) {
        const year = song.releaseYear
        const month = song.releaseDate.substring(0, 2)
        const day = song.releaseDate.substring(2, 4)
        date = `${year}-${month}-${day}T00:00:00.000Z`
      } else {
        date = '9999-12-31T00:00:00.000Z'
      }

      // 個別楽曲タイムラインアイテムを作成
      const songItem: SongTimelineItem = {
        id: `song-${song.id}`,
        type: 'song',
        position: 'right',
        date,
        yearMonth,
        song,
      }

      timelineItems.push(songItem)
    }

    return timelineItems
  }

  /**
   * ライブをタイムラインアイテムに変換
   * - liveType='tour'は tourGroupingService でグループ化
   * - liveType='solo'または'tour'は重要イベント（center）として扱う
   * - その他は左側の通常ライブアイテム
   * @param lives ライブの配列
   * @returns タイムラインアイテムの配列
   */
  public convertLivesToTimelineItems(lives: Live[]): TimelineItem[] {
    const timelineItems: TimelineItem[] = []

    // ツアーグループ化サービスを使用してライブをグループ化
    const groupedItems = this.tourGroupingService.groupLives(lives)

    for (const item of groupedItems) {
      if (item.type === 'tour') {
        // ツアーグループの場合
        const tourGroup = item.data
        
        // 最も早い公演日時を代表日時として使用
        const date = tourGroup.firstDate
        const yearMonth = this.extractYearMonth(date)

        // 重要イベント（Major Event）として扱う
        const majorEventItem: MajorEventTimelineItem = {
          id: `major-event-tour-${tourGroup.id}`,
          type: 'major-event',
          position: 'center',
          date,
          yearMonth,
          eventType: 'tour',
          tourGroup,
        }

        timelineItems.push(majorEventItem)
      } else {
        // 個別ライブの場合
        const live = item.data
        const date = live.dateTime
        const yearMonth = this.extractYearMonth(date)

        if (live.liveType === 'solo') {
          // 単独公演は重要イベント（Major Event）として扱う
          const majorEventItem: MajorEventTimelineItem = {
            id: `major-event-solo-${live.id}`,
            type: 'major-event',
            position: 'center',
            date,
            yearMonth,
            eventType: 'solo',
            live,
          }

          timelineItems.push(majorEventItem)
        } else {
          // その他のライブは左側の通常ライブアイテムとして扱う
          const liveItem: LiveTimelineItem = {
            id: `live-${live.id}`,
            type: 'live',
            position: 'left',
            date,
            yearMonth,
            live,
          }

          timelineItems.push(liveItem)
        }
      }
    }

    return timelineItems
  }

  /**
   * タイムラインアイテムを年月でグループ化
   * - `yearMonth`でグループ化
   * - グループ内アイテムは`date`の昇順でソート
   * - グループ自体は`yearMonth`の指定順（昇順/降順）でソート
   * @param items タイムラインアイテムの配列
   * @param sortOrder グループのソート順（'asc' | 'desc'、デフォルト: 'desc'）
   * @returns 年月グループの配列
   */
  public groupByYearMonth(
    items: TimelineItem[],
    sortOrder: 'asc' | 'desc' = 'desc'
  ): TimelineYearMonthGroup[] {
    // yearMonthごとにアイテムをグループ化
    const groupMap = new Map<string, TimelineItem[]>()
    for (const item of items) {
      const { yearMonth } = item
      if (!groupMap.has(yearMonth)) {
        groupMap.set(yearMonth, [])
      }
      groupMap.get(yearMonth)!.push(item)
    }

    // グループ内アイテムをdateの昇順でソート
    const groups: TimelineYearMonthGroup[] = Array.from(groupMap.entries()).map(
      ([yearMonth, groupItems]) => ({
        yearMonth,
        items: groupItems.sort((a, b) => a.date.localeCompare(b.date)),
      })
    )

    // グループ自体をyearMonthの指定順でソート
    groups.sort((a, b) => {
      const comparison = a.yearMonth.localeCompare(b.yearMonth)
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return groups
  }
}
