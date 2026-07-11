import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

import {
  resolveCardStyle,
  EMPHASIS_RANK,
  type CardStyleInput,
  type CardCategory,
} from './timelineCardStyle'
import type { LiveType } from '../types'

/**
 * timelineCardStyle 純粋関数のプロパティテスト（Property 1〜7）。
 *
 * Testing Strategy に従い fast-check + vitest を用い、各プロパティは
 * `{ numRuns: 100 }` で最低 100 回反復する。CardStyleInput の 4 kind と
 * 各サブ種別・releaseType を網羅する arbitrary を定義する。
 */

/** Other_Live として扱う liveType サブ種別 */
const OTHER_LIVE_TYPES = ['festival', 'event', 'release', 'other'] as const satisfies LiveType[]

/** 全 liveType（solo/tour を含む runtime 入力も網羅） */
const ALL_LIVE_TYPES = [
  'tour',
  'solo',
  'festival',
  'event',
  'release',
  'other',
] as const satisfies LiveType[]

/** major-event 入力（solo / tour） */
const majorEventArb: fc.Arbitrary<CardStyleInput> = fc.record({
  kind: fc.constant('major-event' as const),
  eventType: fc.constantFrom('solo' as const, 'tour' as const),
})

/** song 入力 */
const songArb: fc.Arbitrary<CardStyleInput> = fc.constant({ kind: 'song' as const })

/** release-unit 入力（single / album） */
const releaseUnitArb: fc.Arbitrary<CardStyleInput> = fc.record({
  kind: fc.constant('release-unit' as const),
  releaseType: fc.constantFrom('single' as const, 'album' as const),
})

/** live 入力（Other_Live の 4 サブ種別） */
const liveArb: fc.Arbitrary<CardStyleInput> = fc.record({
  kind: fc.constant('live' as const),
  liveType: fc.constantFrom(...OTHER_LIVE_TYPES),
})

/** 全 kind を網羅する CardStyleInput の arbitrary */
const cardStyleInputArb: fc.Arbitrary<CardStyleInput> = fc.oneof(
  majorEventArb,
  songArb,
  releaseUnitArb,
  liveArb,
)

/** Music_Card 入力（song / release-unit(single) / release-unit(album)） */
const musicInputArb: fc.Arbitrary<CardStyleInput> = fc.oneof(songArb, releaseUnitArb)

describe('resolveCardStyle - property based tests', () => {
  // Feature: timeline-card-design, Property 1: ドメインが色相を一意に固定する（Music_Card は常に pink、それ以外は常に purple）
  it('Property 1: domain uniquely fixes palette (music -> pink, else -> purple)', () => {
    fc.assert(
      fc.property(cardStyleInputArb, (input) => {
        const config = resolveCardStyle(input)
        if (config.domain === 'music') {
          expect(config.palette).toBe('pink')
        } else {
          expect(config.domain).toBe('live')
          expect(config.palette).toBe('purple')
        }
        // 2値以外を取らない
        expect(['pink', 'purple']).toContain(config.palette)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: timeline-card-design, Property 2: カテゴリが軸配置を一意に固定する（music->right, other-live->left, solo/tour->center）
  it('Property 2: category uniquely fixes position', () => {
    fc.assert(
      fc.property(cardStyleInputArb, (input) => {
        const { category, position } = resolveCardStyle(input)
        switch (category) {
          case 'music':
            expect(position).toBe('right')
            break
          case 'other-live':
            expect(position).toBe('left')
            break
          case 'solo':
          case 'tour':
            expect(position).toBe('center')
            break
        }
      }),
      { numRuns: 100 },
    )
  })

  // Feature: timeline-card-design, Property 3: 強調序列の全順序が維持される（Solo > Tour > Music > Other-Live）
  it('Property 3: emphasisRank total order Solo > Tour > Music > Other-Live', () => {
    fc.assert(
      fc.property(cardStyleInputArb, cardStyleInputArb, (a, b) => {
        const configA = resolveCardStyle(a)
        const configB = resolveCardStyle(b)
        const orderValue: Record<CardCategory, number> = {
          solo: 4,
          tour: 3,
          music: 2,
          'other-live': 1,
        }
        // emphasisRank の大小関係はカテゴリ序列と厳密に一致する
        const rankCmp = Math.sign(configA.emphasisRank - configB.emphasisRank)
        const orderCmp = Math.sign(
          orderValue[configA.category] - orderValue[configB.category],
        )
        expect(rankCmp).toBe(orderCmp)
        // 序列の絶対値も設計通り（solo=4 > tour=3 > music=2 > other-live=1）
        expect(configA.emphasisRank).toBe(EMPHASIS_RANK[configA.category])
      }),
      { numRuns: 100 },
    )
  })

  // Feature: timeline-card-design, Property 4: カテゴリは強調度と補助要素の組 (emphasisRank, badge.label) で判別可能である
  it('Property 4: distinct categories have distinct (emphasisRank, badge.label)', () => {
    fc.assert(
      fc.property(cardStyleInputArb, cardStyleInputArb, (a, b) => {
        const configA = resolveCardStyle(a)
        const configB = resolveCardStyle(b)
        const keyA = `${configA.emphasisRank}::${configA.badge.label}`
        const keyB = `${configB.emphasisRank}::${configB.badge.label}`
        if (configA.category !== configB.category) {
          expect(keyA).not.toBe(keyB)
        }
      }),
      { numRuns: 100 },
    )
  })

  // Feature: timeline-card-design, Property 5: Music サブ種別はテキストとアイコンで区別される（label 非空・3種で相異・single/album はアイコン付き）
  it('Property 5: Music subtypes have non-empty distinct labels; single/album have icons', () => {
    fc.assert(
      fc.property(musicInputArb, (input) => {
        const config = resolveCardStyle(input)
        expect(config.category).toBe('music')
        expect(config.badge.label.trim().length).toBeGreaterThan(0)

        if (input.kind === 'release-unit') {
          // single / album にはアイコンが定義される
          expect(config.badge.icon).toBeDefined()
          expect((config.badge.icon ?? '').length).toBeGreaterThan(0)
          const expectedLabel = input.releaseType === 'single' ? 'シングル' : 'アルバム'
          expect(config.badge.label).toBe(expectedLabel)
        } else {
          expect(config.badge.label).toBe('曲')
        }
      }),
      { numRuns: 100 },
    )

    // 3 種のラベルが互いに異なることを明示的に確認
    const song = resolveCardStyle({ kind: 'song' }).badge.label
    const single = resolveCardStyle({ kind: 'release-unit', releaseType: 'single' }).badge.label
    const album = resolveCardStyle({ kind: 'release-unit', releaseType: 'album' }).badge.label
    expect(new Set([song, single, album]).size).toBe(3)
  })

  // Feature: timeline-card-design, Property 6: Other_Live サブ種別が配色クラスを一意に決定する（subTypeClass === liveType）
  it('Property 6: Other_Live subTypeClass matches liveType', () => {
    fc.assert(
      fc.property(fc.constantFrom(...OTHER_LIVE_TYPES), (liveType) => {
        const config = resolveCardStyle({ kind: 'live', liveType })
        expect(config.category).toBe('other-live')
        expect(config.badge.subTypeClass).toBe(liveType)
      }),
      { numRuns: 100 },
    )
  })

  // Feature: timeline-card-design, Property 7: すべてのカードが色に依存しない非空テキスト補助要素を持つ（badge.label は空白のみでない非空）
  it('Property 7: every card has non-empty (non-whitespace) badge.label', () => {
    // solo/tour を含む全 liveType も runtime 入力として網羅する
    const liveAnyArb: fc.Arbitrary<CardStyleInput> = fc.record({
      kind: fc.constant('live' as const),
      liveType: fc.constantFrom(...ALL_LIVE_TYPES),
    })
    const anyInputArb = fc.oneof(cardStyleInputArb, liveAnyArb)

    fc.assert(
      fc.property(anyInputArb, (input) => {
        const config = resolveCardStyle(input)
        expect(config.badge.label).toBeTruthy()
        expect(config.badge.label.trim().length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )
  })
})
