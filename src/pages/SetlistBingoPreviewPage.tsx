import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { BingoCard } from '../components/setlist-bingo/BingoCard'
import {
  reportSetlistBingoAnalyticsError,
  trackSetlistBingoEditStart,
  trackSetlistBingoInvalidRecovery,
  trackSetlistBingoPreviewPageView,
  trackSetlistBingoRetry,
  trackSetlistBingoShareComplete,
} from '../services/setlistBingoAnalytics'
import { shareOrDownloadImage } from '../services/setlistBingo/imageShareService'
import {
  createBingoPngFilename,
  generateBingoPng,
  PNG_MIME_TYPE,
} from '../services/setlistBingo/pngService'
import {
  buildXIntent,
  createXPostText,
  openExternalNoOpener,
} from '../services/setlistBingo/xShareService'
import type { CreateRouteState } from '../types'
import {
  createSetlistBingoOperationGate,
  type SetlistBingoOperationGate,
} from '../utils/setlistBingoOperationGate'
import type { SetlistBingoLogOperation } from '../utils/setlistBingoTelemetry'
import { getBingoErrorMessage, resolvePreviewInput } from '../utils/setlistBingoPreviewResolution'
import { buildCanonicalShareUrl } from '../utils/setlistBingoShareUrl'
import './SetlistBingoPreviewPage.css'

export type PreviewShareAction = 'save-image' | 'share-without-url' | 'share-url'

export type PreviewOperationErrorCode =
  | 'canvas_unavailable'
  | 'png_blob_failed'
  | 'download_failed'
  | 'file_share_failed'
  | 'x_intent_blocked'
  | 'decoded_payload_too_large'
  | 'share_url_too_long'

export type PreviewOperationState =
  | { status: 'idle' }
  | {
      status: 'generating' | 'downloading' | 'sharing'
      action: PreviewShareAction
    }
  | {
      status: 'error'
      action: PreviewShareAction
      code: PreviewOperationErrorCode
    }

export interface PreviewOperationFeedback {
  kind: 'success'
  action: PreviewShareAction
}

export interface PreviewOperationDependencies {
  generateBingoPng: typeof generateBingoPng
  shareOrDownloadImage: typeof shareOrDownloadImage
  createBingoPngFilename: typeof createBingoPngFilename
  createXPostText: typeof createXPostText
  buildCanonicalShareUrl: typeof buildCanonicalShareUrl
  buildXIntent: typeof buildXIntent
  openExternalNoOpener: typeof openExternalNoOpener
  getRootStyle: () => CSSStyleDeclaration
  getOrigin: () => string
  getBaseUrl: () => string
}

export interface SetlistBingoPreviewPageProps {
  operationDependencies?: PreviewOperationDependencies
}

const DEFAULT_OPERATION_DEPENDENCIES: PreviewOperationDependencies = {
  generateBingoPng,
  shareOrDownloadImage,
  createBingoPngFilename,
  createXPostText,
  buildCanonicalShareUrl,
  buildXIntent,
  openExternalNoOpener,
  getRootStyle: () => window.getComputedStyle(document.documentElement),
  getOrigin: () => window.location.origin,
  getBaseUrl: () => import.meta.env.BASE_URL,
}

const OPERATION_ERROR_MESSAGES = {
  canvas_unavailable: '画像を生成できませんでした。もう一度お試しください。',
  png_blob_failed: '画像を生成できませんでした。もう一度お試しください。',
  download_failed: '画像を保存できませんでした。もう一度お試しください。',
  file_share_failed: '画像の保存画面を開けませんでした。もう一度お試しください。',
  x_intent_blocked: 'Xの投稿画面を開けませんでした。もう一度お試しください。',
  decoded_payload_too_large:
    '共有URLに含める情報が大きすぎるためURLでは共有できません。画像での保存をお試しください。',
  share_url_too_long: '共有URLが長すぎるためURLでは共有できません。画像での保存をお試しください。',
} as const satisfies Record<PreviewOperationErrorCode, string>

const OPERATION_ERROR_CODES = new Set<PreviewOperationErrorCode>(
  Object.keys(OPERATION_ERROR_MESSAGES) as PreviewOperationErrorCode[]
)

function getFeedbackAnnouncement(feedback: PreviewOperationFeedback | null): string {
  if (!feedback) return ''

  switch (feedback.action) {
    case 'save-image':
      return '画像の保存・共有操作が完了しました。'
    case 'share-without-url':
    case 'share-url':
      return 'Xの投稿画面を開きました。'
  }
}

function getOperationAnnouncement(
  state: PreviewOperationState,
  feedback: PreviewOperationFeedback | null
): string {
  switch (state.status) {
    case 'idle':
      return getFeedbackAnnouncement(feedback)
    case 'generating':
      return 'ビンゴ画像を生成しています。'
    case 'downloading':
      return 'ビンゴ画像を保存しています。'
    case 'sharing':
      if (state.action === 'save-image') {
        return '画像の保存先を開いています。'
      }
      return state.action === 'share-url'
        ? '共有URLからXの投稿画面を開いています。'
        : 'Xの投稿画面を開いています。'
    case 'error':
      return OPERATION_ERROR_MESSAGES[state.code]
  }
}

function getOperationErrorCode(
  error: unknown,
  fallback: PreviewOperationErrorCode
): PreviewOperationErrorCode {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return fallback
  }

  const code = error.code
  return typeof code === 'string' && OPERATION_ERROR_CODES.has(code as PreviewOperationErrorCode)
    ? (code as PreviewOperationErrorCode)
    : fallback
}

function getOperationForErrorCode(code: PreviewOperationErrorCode): SetlistBingoLogOperation {
  switch (code) {
    case 'canvas_unavailable':
    case 'png_blob_failed':
      return 'generate-png'
    case 'download_failed':
      return 'download-png'
    case 'file_share_failed':
      return 'share-image'
    case 'decoded_payload_too_large':
    case 'share_url_too_long':
      return 'build-share-url'
    case 'x_intent_blocked':
      return 'open-x-intent'
  }
}

function getRetryLabel(action: PreviewShareAction): string {
  switch (action) {
    case 'save-image':
      return '画像保存を再試行'
    case 'share-without-url':
      return 'URLなし投稿を再試行'
    case 'share-url':
      return 'URL共有を再試行'
  }
}

export interface PreviewOperationAnnouncementProps {
  state: PreviewOperationState
  feedback?: PreviewOperationFeedback | null
}

/** Persistent live region for image generation, download, and sharing results. */
export function PreviewOperationAnnouncement({
  state,
  feedback = null,
}: PreviewOperationAnnouncementProps) {
  const isError = state.status === 'error'

  return (
    <p
      className={`setlist-bingo-preview-page__announcement${
        isError ? ' setlist-bingo-preview-page__announcement--error' : ''
      }`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {getOperationAnnouncement(state, feedback)}
    </p>
  )
}

/** Displays only strictly resolved bingo state and keeps all content in Router memory. */
export function SetlistBingoPreviewPage({
  operationDependencies = DEFAULT_OPERATION_DEPENDENCIES,
}: SetlistBingoPreviewPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [resolution] = useState(() => resolvePreviewInput(window.location.href, location.state))
  const [operationState, setOperationState] = useState<PreviewOperationState>({
    status: 'idle',
  })
  const [operationFeedback, setOperationFeedback] = useState<PreviewOperationFeedback | null>(null)
  const operationGateRef = useRef<SetlistBingoOperationGate | null>(null)
  const pageViewTrackedRef = useRef(false)
  if (operationGateRef.current == null) {
    operationGateRef.current = createSetlistBingoOperationGate()
  }

  useEffect(() => {
    if (pageViewTrackedRef.current) return
    pageViewTrackedRef.current = true

    if (resolution.kind === 'invalid') {
      trackSetlistBingoPreviewPageView({ kind: 'invalid' })
      reportSetlistBingoAnalyticsError({
        code: resolution.code,
        operation: 'resolve-preview',
      })
      return
    }

    trackSetlistBingoPreviewPageView({
      kind: 'valid',
      source: resolution.source,
      gridSize: resolution.state.gridSize,
      designId: resolution.state.designId,
    })
  }, [resolution])

  const handleNavigation = (path: string) => navigate(path)

  if (resolution.kind === 'invalid') {
    return (
      <div className="setlist-bingo-preview-page">
        <Header title="セトリ予想ビンゴ" />

        <main className="setlist-bingo-preview-page__main">
          <section
            className="setlist-bingo-preview-page__invalid"
            aria-labelledby="setlist-bingo-preview-invalid-title"
          >
            <h2 id="setlist-bingo-preview-invalid-title">プレビューを表示できません</h2>
            <p role="alert">{getBingoErrorMessage(resolution.code)}</p>
            <button
              type="button"
              className="setlist-bingo-preview-page__primary-action"
              onClick={() => {
                trackSetlistBingoInvalidRecovery(resolution.code)
                navigate('/setlist-bingo/new')
              }}
            >
              新しく作る
            </button>
          </section>
        </main>

        <Navigation currentPath="/lives" onNavigate={handleNavigation} />
      </div>
    )
  }

  const isBusy =
    operationState.status === 'generating' ||
    operationState.status === 'downloading' ||
    operationState.status === 'sharing'

  const setOperationError = (
    action: PreviewShareAction,
    error: unknown,
    fallback: PreviewOperationErrorCode
  ) => {
    const code = getOperationErrorCode(error, fallback)
    setOperationFeedback(null)
    setOperationState({
      status: 'error',
      action,
      code,
    })
    reportSetlistBingoAnalyticsError({
      code,
      operation: getOperationForErrorCode(code),
    })
  }

  const startGatedOperation = (operation: () => Promise<void>, onAccepted?: () => void) => {
    const pendingOperation = operationGateRef.current?.run(operation)
    if (!pendingOperation) return

    onAccepted?.()
    void pendingOperation
  }

  const runSaveImage = (onAccepted?: () => void) => {
    startGatedOperation(async () => {
      setOperationFeedback(null)
      setOperationState({ status: 'generating', action: 'save-image' })

      try {
        const blob = await operationDependencies.generateBingoPng(
          resolution.state,
          operationDependencies.getRootStyle()
        )
        const filename = operationDependencies.createBingoPngFilename(
          resolution.state.performanceName
        )
        const file = new File([blob], filename, { type: PNG_MIME_TYPE })
        setOperationState({ status: 'sharing', action: 'save-image' })
        const result = await operationDependencies.shareOrDownloadImage(file)
        setOperationState({ status: 'idle' })
        if (result.kind === 'cancelled') {
          return
        }
        trackSetlistBingoShareComplete({
          action: result.kind === 'downloaded' ? 'save-image' : 'share-image',
          gridSize: resolution.state.gridSize,
          designId: resolution.state.designId,
        })
        setOperationFeedback({ kind: 'success', action: 'save-image' })
      } catch (error) {
        setOperationError('save-image', error, 'file_share_failed')
      }
    }, onAccepted)
  }

  const runShareWithoutUrl = (onAccepted?: () => void) => {
    startGatedOperation(async () => {
      setOperationFeedback(null)
      setOperationState({ status: 'sharing', action: 'share-without-url' })

      try {
        const intent = operationDependencies.buildXIntent({
          text: operationDependencies.createXPostText(resolution.state.performanceName),
        })
        operationDependencies.openExternalNoOpener(intent)
        trackSetlistBingoShareComplete({
          action: 'share-without-url',
          gridSize: resolution.state.gridSize,
          designId: resolution.state.designId,
        })
        setOperationState({ status: 'idle' })
        setOperationFeedback({ kind: 'success', action: 'share-without-url' })
      } catch (error) {
        setOperationError('share-without-url', error, 'x_intent_blocked')
      }
    }, onAccepted)
  }

  const runShareUrl = (onAccepted?: () => void) => {
    startGatedOperation(async () => {
      setOperationFeedback(null)
      setOperationState({ status: 'sharing', action: 'share-url' })

      try {
        const shareUrl = operationDependencies.buildCanonicalShareUrl(
          resolution.state,
          operationDependencies.getOrigin(),
          operationDependencies.getBaseUrl()
        )

        if (!shareUrl.ok) {
          setOperationError('share-url', { code: shareUrl.code }, shareUrl.code)
          return
        }

        const intent = operationDependencies.buildXIntent({
          text: operationDependencies.createXPostText(
            resolution.state.performanceName,
            shareUrl.url
          ),
        })
        operationDependencies.openExternalNoOpener(intent)
        trackSetlistBingoShareComplete({
          action: 'share-url',
          gridSize: resolution.state.gridSize,
          designId: resolution.state.designId,
        })
        setOperationState({ status: 'idle' })
        setOperationFeedback({ kind: 'success', action: 'share-url' })
      } catch (error) {
        setOperationError('share-url', error, 'x_intent_blocked')
      }
    }, onAccepted)
  }

  const runAction = (action: PreviewShareAction, onAccepted?: () => void) => {
    switch (action) {
      case 'save-image':
        runSaveImage(onAccepted)
        return
      case 'share-without-url':
        runShareWithoutUrl(onAccepted)
        return
      case 'share-url':
        runShareUrl(onAccepted)
    }
  }

  const handleRetry = (action: PreviewShareAction, code: PreviewOperationErrorCode) => {
    runAction(action, () => {
      trackSetlistBingoRetry({
        action,
        operation: getOperationForErrorCode(code),
      })
    })
  }

  const handleEdit = () => {
    trackSetlistBingoEditStart({
      source: resolution.source,
      gridSize: resolution.state.gridSize,
      designId: resolution.state.designId,
    })
    const routeState: CreateRouteState = {
      kind: 'edit-bingo',
      bingoState: resolution.state,
      ...(resolution.sourceLive ? { sourceLive: resolution.sourceLive } : {}),
    }
    navigate('/setlist-bingo/new', { state: routeState })
  }

  return (
    <div className="setlist-bingo-preview-page">
      <Header title="セトリ予想ビンゴ" />

      <main className="setlist-bingo-preview-page__main">
        <div className="setlist-bingo-preview-page__content">
          <p className="setlist-bingo-preview-page__intro">
            公演名、予想曲、デザインを確認してから保存または共有してください。
          </p>

          <BingoCard state={resolution.state} mode="preview" />

          <PreviewOperationAnnouncement state={operationState} feedback={operationFeedback} />

          {operationState.status === 'error' && (
            <div className="setlist-bingo-preview-page__recovery">
              {operationState.action === 'share-url' && (
                <p>画像で保存する方法を代替手段として利用できます。</p>
              )}
              <button
                type="button"
                className="setlist-bingo-preview-page__secondary-action"
                disabled={isBusy}
                onClick={() => handleRetry(operationState.action, operationState.code)}
              >
                {getRetryLabel(operationState.action)}
              </button>
            </div>
          )}

          <p className="setlist-bingo-preview-page__save-help">
            スマートフォンでは、表示された共有画面から「画像を保存」を選択してください。対応していない端末ではPNGをダウンロードします。
          </p>

          <div
            className="setlist-bingo-preview-page__actions"
            aria-label="ビンゴカードの操作"
            aria-busy={isBusy}
          >
            <button
              type="button"
              className="setlist-bingo-preview-page__secondary-action"
              onClick={handleEdit}
            >
              編集に戻る
            </button>
            <button
              type="button"
              className="setlist-bingo-preview-page__primary-action"
              disabled={isBusy}
              onClick={() => runSaveImage()}
            >
              画像で保存する
            </button>
            <button
              type="button"
              className="setlist-bingo-preview-page__primary-action"
              disabled={isBusy}
              onClick={() => runShareWithoutUrl()}
            >
              Xでポストする（URLなし）※画像添付用
            </button>
            <button
              type="button"
              className="setlist-bingo-preview-page__primary-action"
              disabled={isBusy}
              onClick={() => runShareUrl()}
            >
              Xでポストする（URLあり）
            </button>
          </div>
        </div>
      </main>

      <Navigation currentPath="/lives" onNavigate={handleNavigation} />
    </div>
  )
}

export default SetlistBingoPreviewPage
