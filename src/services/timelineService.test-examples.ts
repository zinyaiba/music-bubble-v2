/**
 * タイムラインサービスの動作確認用サンプル
 * 実際のテストフレームワークがセットアップされるまでの一時的な検証用
 */

import type { Song } from '../types'
import { TimelineService } from './timelineService'
import { firebaseService } from './firebaseService'
import { liveService } from './liveService'
import { tourGroupingService } from './tourGroupingService'

/**
 * TimelineServiceのインスタンスを取得
 */
const timelineService = TimelineService.getInstance(
  firebaseService,
  liveService,
  tourGroupingService
)

/**
 * extractYearMonth関数の動作確認
 */
export function testExtractYearMonth() {
  console.log('=== extractYearMonth テスト ===')

  // テスト1: ISO 8601形式
  const isoDate = '2024-03-15T10:00:00Z'
  const result1 = timelineService.extractYearMonth(isoDate)
  console.log(`ISO 8601: ${isoDate} → ${result1}`)
  console.assert(result1 === '2024-03', `Expected '2024-03', got '${result1}'`)

  // テスト2: releaseYearとreleaseDate
  const songDate = { year: 2023, date: '0520' }
  const result2 = timelineService.extractYearMonth(songDate)
  console.log(`Song date: year=2023, date=0520 → ${result2}`)
  console.assert(result2 === '2023-05', `Expected '2023-05', got '${result2}'`)

  // テスト3: 日付情報欠落（yearなし）
  const missingYear = { date: '0315' }
  const result3 = timelineService.extractYearMonth(missingYear)
  console.log(`Missing year → ${result3}`)
  console.assert(result3 === '9999-99', `Expected '9999-99', got '${result3}'`)

  // テスト4: 日付情報欠落（dateなし）
  const missingDate = { year: 2024 }
  const result4 = timelineService.extractYearMonth(missingDate)
  console.log(`Missing date → ${result4}`)
  console.assert(result4 === '9999-99', `Expected '9999-99', got '${result4}'`)

  // テスト5: 無効なISO日付
  const invalidDate = 'invalid-date'
  const result5 = timelineService.extractYearMonth(invalidDate)
  console.log(`Invalid ISO date → ${result5}`)
  console.assert(result5 === '9999-99', `Expected '9999-99', got '${result5}'`)

  console.log('✅ extractYearMonth テスト完了\n')
}

/**
 * groupSongsByRelease関数の動作確認
 */
export function testGroupSongsByRelease() {
  console.log('=== groupSongsByRelease テスト ===')

  // テスト用の楽曲データ
  const songs: Song[] = [
    {
      id: '1',
      title: '曲A',
      singleName: 'シングル1',
      lyricists: [],
      composers: [],
      arrangers: [],
    },
    {
      id: '2',
      title: '曲B',
      singleName: 'シングル1',
      lyricists: [],
      composers: [],
      arrangers: [],
    },
    {
      id: '3',
      title: '曲C',
      albumName: 'アルバム1',
      lyricists: [],
      composers: [],
      arrangers: [],
    },
    {
      id: '4',
      title: '曲D',
      albumName: 'アルバム1',
      lyricists: [],
      composers: [],
      arrangers: [],
    },
    {
      id: '5',
      title: '曲E',
      lyricists: [],
      composers: [],
      arrangers: [],
    },
    {
      id: '6',
      title: '曲F',
      singleName: 'シングル2',
      albumName: 'アルバム2', // singleNameが優先される
      lyricists: [],
      composers: [],
      arrangers: [],
    },
  ]

  const result = timelineService.groupSongsByRelease(songs)

  console.log('リリース単位の数:', result.releaseUnits.size)
  console.log('個別楽曲の数:', result.standaloneSongs.length)

  // 検証1: シングル1に2曲含まれる
  const single1 = result.releaseUnits.get('シングル1')
  console.assert(single1?.length === 2, `Expected 2 songs in 'シングル1', got ${single1?.length}`)
  console.log(`✓ シングル1: ${single1?.length}曲`)

  // 検証2: アルバム1に2曲含まれる
  const album1 = result.releaseUnits.get('アルバム1')
  console.assert(album1?.length === 2, `Expected 2 songs in 'アルバム1', got ${album1?.length}`)
  console.log(`✓ アルバム1: ${album1?.length}曲`)

  // 検証3: シングル2に1曲含まれる（singleNameが優先）
  const single2 = result.releaseUnits.get('シングル2')
  console.assert(single2?.length === 1, `Expected 1 song in 'シングル2', got ${single2?.length}`)
  console.log(`✓ シングル2: ${single2?.length}曲 (singleName優先)`)

  // 検証4: アルバム2は存在しない（singleNameが優先されるため）
  const album2 = result.releaseUnits.get('アルバム2')
  console.assert(album2 === undefined, `Expected 'アルバム2' to be undefined, got ${album2?.length} songs`)
  console.log(`✓ アルバム2: 存在しない (singleNameに優先される)`)

  // 検証5: 個別楽曲が1曲
  console.assert(
    result.standaloneSongs.length === 1,
    `Expected 1 standalone song, got ${result.standaloneSongs.length}`
  )
  console.log(`✓ 個別楽曲: ${result.standaloneSongs.length}曲`)
  console.log(`  - ${result.standaloneSongs[0]?.title}`)

  console.log('✅ groupSongsByRelease テスト完了\n')
}

/**
 * すべてのテストを実行
 */
export function runAllTests() {
  console.log('🧪 タイムラインサービス 動作確認開始\n')
  testExtractYearMonth()
  testGroupSongsByRelease()
  console.log('✨ すべての動作確認が完了しました')
}

// コンソールで直接実行する場合
if (import.meta.env.DEV) {
  // runAllTests() // 必要に応じてコメント解除
}
