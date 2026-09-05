import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import type { BingoState } from '../types'
import {
  logSetlistBingoDiagnostic,
  projectSetlistBingoSafeLog,
  projectSetlistBingoTelemetry,
  reportSetlistBingoError,
  trackSetlistBingoTelemetry,
  type SetlistBingoDiagnosticAdapter,
  type SetlistBingoErrorAdapter,
  type SetlistBingoSafeLogPayload,
  type SetlistBingoTelemetryAdapter,
  type SetlistBingoTelemetryProjection,
} from './setlistBingoTelemetry'

const FORBIDDEN_CONTENT = {
  performanceName: '秘密の公演名',
  songTitle: '未公開の予想曲',
  encodedState: 'ZW5jb2RlZC1wcml2YXRlLXN0YXRl',
  canonicalUrl: 'https://example.com/setlist-bingo/preview?b=private',
  pngBytes: new Uint8Array([137, 80, 78, 71]),
  sourceLiveId: 'private-live-id',
  rawExceptionMessage: 'browser failed while processing 秘密の公演名',
} as const

const bingoStateFixture: BingoState = {
  schemaVersion: 1,
  performanceName: FORBIDDEN_CONTENT.performanceName,
  gridSize: 2,
  songTitles: [FORBIDDEN_CONTENT.songTitle, '曲B', '曲C', '曲D'],
  designId: 'violet-ribbon',
}

function expectNoForbiddenContent(payload: object): void {
  const keys = Reflect.ownKeys(payload)
  const values = Object.values(payload)
  const serialized = JSON.stringify(payload)

  expect(keys).not.toContain('performanceName')
  expect(keys).not.toContain('songTitle')
  expect(keys).not.toContain('songTitles')
  expect(keys).not.toContain('encodedState')
  expect(keys).not.toContain('canonicalUrl')
  expect(keys).not.toContain('pngBytes')
  expect(keys).not.toContain('sourceLiveId')
  expect(keys).not.toContain('message')
  expect(keys).not.toContain('error')
  expect(values).not.toContain(FORBIDDEN_CONTENT.pngBytes)

  for (const forbidden of [
    FORBIDDEN_CONTENT.performanceName,
    FORBIDDEN_CONTENT.songTitle,
    FORBIDDEN_CONTENT.encodedState,
    FORBIDDEN_CONTENT.canonicalUrl,
    FORBIDDEN_CONTENT.sourceLiveId,
    FORBIDDEN_CONTENT.rawExceptionMessage,
  ]) {
    expect(serialized).not.toContain(forbidden)
  }
}

describe('setlist bingo telemetry projection', () => {
  it('returns exactly actionType/gridSize/designId with the expected values', () => {
    const runtimeInput = {
      actionType: 'share-url',
      gridSize: bingoStateFixture.gridSize,
      designId: bingoStateFixture.designId,
      bingoState: bingoStateFixture,
      ...FORBIDDEN_CONTENT,
    } as unknown as SetlistBingoTelemetryProjection

    const projection = projectSetlistBingoTelemetry(runtimeInput)

    expect(Reflect.ownKeys(projection)).toEqual([
      'actionType',
      'gridSize',
      'designId',
    ])
    expect(projection).toEqual({
      actionType: 'share-url',
      gridSize: 2,
      designId: 'violet-ribbon',
    })
    expectNoForbiddenContent(projection)
  })

  it('re-projects before invoking the analytics adapter', () => {
    const track = vi.fn()
    const adapter: SetlistBingoTelemetryAdapter = { track }
    const runtimeInput = {
      actionType: 'share-image',
      gridSize: 4,
      designId: 'duo-pop',
      performanceName: FORBIDDEN_CONTENT.performanceName,
      songTitles: bingoStateFixture.songTitles,
      encodedState: FORBIDDEN_CONTENT.encodedState,
      canonicalUrl: FORBIDDEN_CONTENT.canonicalUrl,
      pngBytes: FORBIDDEN_CONTENT.pngBytes,
      sourceLiveId: FORBIDDEN_CONTENT.sourceLiveId,
    } as unknown as SetlistBingoTelemetryProjection

    trackSetlistBingoTelemetry(adapter, runtimeInput)

    expect(track).toHaveBeenCalledOnce()
    const payload = track.mock.calls[0][0] as SetlistBingoTelemetryProjection
    expect(Reflect.ownKeys(payload)).toEqual(['actionType', 'gridSize', 'designId'])
    expect(Object.values(payload)).toEqual(['share-image', 4, 'duo-pop'])
    expectNoForbiddenContent(payload)
  })
})

describe('setlist bingo safe error and diagnostic boundary', () => {
  it('returns exactly code/operation and drops exception or content fields', () => {
    const runtimeInput = {
      code: 'file_share_failed',
      operation: 'share-image',
      message: FORBIDDEN_CONTENT.rawExceptionMessage,
      error: new Error(FORBIDDEN_CONTENT.rawExceptionMessage),
      performanceName: FORBIDDEN_CONTENT.performanceName,
      songTitles: bingoStateFixture.songTitles,
      canonicalUrl: FORBIDDEN_CONTENT.canonicalUrl,
      pngBytes: FORBIDDEN_CONTENT.pngBytes,
    } as unknown as SetlistBingoSafeLogPayload

    const payload = projectSetlistBingoSafeLog(runtimeInput)

    expect(Reflect.ownKeys(payload)).toEqual(['code', 'operation'])
    expect(payload).toEqual({
      code: 'file_share_failed',
      operation: 'share-image',
    })
    expectNoForbiddenContent(payload)
  })

  it('re-projects the same code/operation-only payload for error and diagnostic adapters', () => {
    const report = vi.fn()
    const log = vi.fn()
    const errorAdapter: SetlistBingoErrorAdapter = { report }
    const diagnosticAdapter: SetlistBingoDiagnosticAdapter = { log }
    const runtimeInput = {
      code: 'png_blob_failed',
      operation: 'generate-png',
      rawExceptionMessage: FORBIDDEN_CONTENT.rawExceptionMessage,
      encodedState: FORBIDDEN_CONTENT.encodedState,
      sourceLiveId: FORBIDDEN_CONTENT.sourceLiveId,
    } as unknown as SetlistBingoSafeLogPayload

    reportSetlistBingoError(errorAdapter, runtimeInput)
    logSetlistBingoDiagnostic(diagnosticAdapter, runtimeInput)

    expect(report).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledOnce()

    for (const payload of [report.mock.calls[0][0], log.mock.calls[0][0]]) {
      expect(Reflect.ownKeys(payload)).toEqual(['code', 'operation'])
      expect(Object.values(payload)).toEqual(['png_blob_failed', 'generate-png'])
      expectNoForbiddenContent(payload)
    }
  })
})

describe('setlist bingo telemetry compile-time contracts', () => {
  it('limits public analytics and log adapter payload keys', () => {
    expectTypeOf<keyof SetlistBingoTelemetryProjection>().toEqualTypeOf<
      'actionType' | 'gridSize' | 'designId'
    >()
    expectTypeOf<keyof SetlistBingoSafeLogPayload>().toEqualTypeOf<
      'code' | 'operation'
    >()
    expectTypeOf<Parameters<SetlistBingoTelemetryAdapter['track']>[0]>().toEqualTypeOf<
      SetlistBingoTelemetryProjection
    >()
    expectTypeOf<Parameters<SetlistBingoErrorAdapter['report']>[0]>().toEqualTypeOf<
      SetlistBingoSafeLogPayload
    >()
    expectTypeOf<Parameters<SetlistBingoDiagnosticAdapter['log']>[0]>().toEqualTypeOf<
      SetlistBingoSafeLogPayload
    >()
  })
})
