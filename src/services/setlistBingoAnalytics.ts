import type { BingoDesignId, GridSize } from '../types'
import {
  reportSetlistBingoError,
  trackSetlistBingoTelemetry,
  type BingoOperationErrorCode,
  type SetlistBingoErrorAdapter,
  type SetlistBingoLogOperation,
  type SetlistBingoTelemetryActionType,
  type SetlistBingoTelemetryAdapter,
} from '../utils/setlistBingoTelemetry'
import {
  AnalyticsEvents,
  trackEvent as trackAnalyticsEvent,
  type AnalyticsEventName,
} from './analyticsService'

export type SetlistBingoEntryMode = 'new' | 'source-live' | 'edit'
export type SetlistBingoPreviewSource = 'memory' | 'url'
export type SetlistBingoRetryAction = 'load-registered-songs' | SetlistBingoTelemetryActionType

export type SetlistBingoPreviewPageView =
  | {
      readonly kind: 'valid'
      readonly source: SetlistBingoPreviewSource
      readonly gridSize: GridSize
      readonly designId: BingoDesignId
    }
  | { readonly kind: 'invalid' }

export interface SetlistBingoGridChange {
  readonly from: GridSize
  readonly to: GridSize
  readonly confirmed: boolean
}

export interface SetlistBingoCreationMetadata {
  readonly entryMode: SetlistBingoEntryMode
  readonly gridSize: GridSize
  readonly designId: BingoDesignId
}

export interface SetlistBingoPreviewMetadata {
  readonly source: SetlistBingoPreviewSource
  readonly gridSize: GridSize
  readonly designId: BingoDesignId
}

export interface SetlistBingoShareMetadata {
  readonly action: SetlistBingoTelemetryActionType
  readonly gridSize: GridSize
  readonly designId: BingoDesignId
}

export interface SetlistBingoSafeError {
  readonly code: BingoOperationErrorCode
  readonly operation: SetlistBingoLogOperation
}

export interface SetlistBingoRetryMetadata {
  readonly action: SetlistBingoRetryAction
  readonly operation: SetlistBingoLogOperation
}

type SetlistBingoAnalyticsParams = Record<string, string | number | boolean>

function trackSetlistBingoEvent(
  eventName: AnalyticsEventName,
  params: SetlistBingoAnalyticsParams
): void {
  const { origin, pathname } = window.location
  trackAnalyticsEvent(eventName, {
    ...params,
    page_location: `${origin}${pathname}`,
    page_path: pathname,
  })
}

const analyticsTelemetryAdapter: SetlistBingoTelemetryAdapter = {
  track(payload) {
    trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_共有完了, {
      action_type: payload.actionType,
      grid_size: payload.gridSize,
      design_id: payload.designId,
    })
  },
}

const analyticsErrorAdapter: SetlistBingoErrorAdapter = {
  report(payload) {
    trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_エラー, {
      error_code: payload.code,
      operation: payload.operation,
    })
  },
}

/** Records a create-page view without accepting draft or route content. */
export function trackSetlistBingoCreatePageView(entryMode: SetlistBingoEntryMode): void {
  trackSetlistBingoEvent(AnalyticsEvents.ページ閲覧_セトリビンゴ作成, {
    entry_mode: entryMode,
  })
}

/** Records only the validated preview resolution metadata. */
export function trackSetlistBingoPreviewPageView(input: SetlistBingoPreviewPageView): void {
  if (input.kind === 'invalid') {
    trackSetlistBingoEvent(AnalyticsEvents.ページ閲覧_セトリビンゴプレビュー, {
      resolution_status: 'invalid',
    })
    return
  }

  trackSetlistBingoEvent(AnalyticsEvents.ページ閲覧_セトリビンゴプレビュー, {
    resolution_status: 'valid',
    resolution_source: input.source,
    grid_size: input.gridSize,
    design_id: input.designId,
  })
}

export function trackSetlistBingoGridChange(input: SetlistBingoGridChange): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_曲数変更, {
    from_grid_size: input.from,
    to_grid_size: input.to,
    shrink_confirmed: input.confirmed,
  })
}

export function trackSetlistBingoDesignChange(designId: BingoDesignId): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_デザイン変更, {
    design_id: designId,
  })
}

export function trackSetlistBingoCreationComplete(input: SetlistBingoCreationMetadata): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_作成完了, {
    entry_mode: input.entryMode,
    grid_size: input.gridSize,
    design_id: input.designId,
  })
}

export function trackSetlistBingoEditStart(input: SetlistBingoPreviewMetadata): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_編集開始, {
    resolution_source: input.source,
    grid_size: input.gridSize,
    design_id: input.designId,
  })
}

export function trackSetlistBingoShareComplete(input: SetlistBingoShareMetadata): void {
  trackSetlistBingoTelemetry(analyticsTelemetryAdapter, {
    actionType: input.action,
    gridSize: input.gridSize,
    designId: input.designId,
  })
}

/** Reports only a fixed code and operation; exceptions are not accepted. */
export function reportSetlistBingoAnalyticsError(input: SetlistBingoSafeError): void {
  reportSetlistBingoError(analyticsErrorAdapter, {
    code: input.code,
    operation: input.operation,
  })
}

export function trackSetlistBingoRetry(input: SetlistBingoRetryMetadata): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_再試行, {
    action_type: input.action,
    operation: input.operation,
  })
}

export function trackSetlistBingoInvalidRecovery(code: BingoOperationErrorCode): void {
  trackSetlistBingoEvent(AnalyticsEvents.セトリビンゴ_復旧開始, {
    error_code: code,
  })
}
