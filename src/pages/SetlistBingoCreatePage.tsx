import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Header } from '../components/common/Header'
import { Navigation } from '../components/common/Navigation'
import { BingoDesignPicker } from '../components/setlist-bingo/BingoDesignPicker'
import { GridShrinkDialog } from '../components/setlist-bingo/GridShrinkDialog'
import { PredictionSongGrid } from '../components/setlist-bingo/PredictionSongGrid'
import { cacheService } from '../services/cacheService'
import { firebaseService } from '../services/firebaseService'
import {
  reportSetlistBingoAnalyticsError,
  trackSetlistBingoCreatePageView,
  trackSetlistBingoCreationComplete,
  trackSetlistBingoDesignChange,
  trackSetlistBingoGridChange,
  trackSetlistBingoRetry,
} from '../services/setlistBingoAnalytics'
import {
  GRID_SIZE_OPTIONS,
  MAX_PARTICIPANT_NAME_LENGTH,
  MAX_PERFORMANCE_NAME_LENGTH,
  MAX_SONG_TITLE_LENGTH,
  type BingoDesignId,
  type DraftBingoState,
  type GridSize,
  type PreviewRouteState,
  type Song,
  type ValidationIssue,
  type ValidationIssueCode,
} from '../types'
import { confirmGridShrink, requestGridResize } from '../utils/setlistBingoGrid'
import { initializeDraft, validateDraftBingoState } from '../utils/setlistBingoValidation'
import './SetlistBingoCreatePage.css'

type RegisteredSongLoadStatus = 'loading' | 'ready' | 'error'

interface PendingGridShrink {
  target: GridSize
  excludedFilledCount: number
}

const REGISTERED_SONG_LOAD_ERROR =
  '登録曲の読み込みに失敗しました。自由入力は引き続き利用できます。'

function getValidationMessage(code: ValidationIssueCode): string {
  switch (code) {
    case 'performance_name_required':
      return '公演名を入力してください。'
    case 'performance_name_too_long':
      return `公演名は${MAX_PERFORMANCE_NAME_LENGTH}文字以下で入力してください。`
    case 'participant_name_too_long':
      return `名前は${MAX_PARTICIPANT_NAME_LENGTH}文字以下で入力してください。`
    case 'invalid_grid_size':
      return '曲数を選択してください。'
    case 'song_count_mismatch':
      return '選択した曲数に対応する入力欄を確認してください。'
    case 'song_title_too_long':
      return `曲名は${MAX_SONG_TITLE_LENGTH}文字以下で入力してください。`
    case 'design_required':
    case 'unknown_design':
      return 'ビンゴデザインを選択してください。'
  }
}

function findIssue(
  issues: readonly ValidationIssue[],
  path: ValidationIssue['path']
): ValidationIssue | undefined {
  return issues.find((issue) => issue.path === path)
}

/** Creates and validates a Setlist Bingo using page-local and Router state only. */
export function SetlistBingoCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const generatedId = useId().replaceAll(':', '')
  const [{ draft: initialDraft, entryMode, sourceLive }] = useState(() =>
    initializeDraft(location.state)
  )
  const [draft, setDraft] = useState<DraftBingoState>(initialDraft)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])
  const [registeredSongs, setRegisteredSongs] = useState<Song[]>([])
  const [songLoadStatus, setSongLoadStatus] = useState<RegisteredSongLoadStatus>('loading')
  const [pendingGridShrink, setPendingGridShrink] = useState<PendingGridShrink | null>(null)
  const [validationAnnouncement, setValidationAnnouncement] = useState('')
  const loadRequestIdRef = useRef(0)
  const shrinkTriggerRef = useRef<HTMLInputElement | null>(null)
  const pageViewTrackedRef = useRef(false)

  const performanceNameId = `${generatedId}-performance-name`
  const performanceNameHelpId = `${performanceNameId}-help`
  const performanceNameErrorId = `${performanceNameId}-error`
  const participantNameId = `${generatedId}-participant-name`
  const participantNameHelpId = `${participantNameId}-help`
  const participantNameErrorId = `${participantNameId}-error`
  const gridHelpId = `${generatedId}-grid-help`
  const gridErrorId = `${generatedId}-grid-error`

  useEffect(() => {
    if (!pageViewTrackedRef.current) {
      pageViewTrackedRef.current = true
      trackSetlistBingoCreatePageView(entryMode)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [entryMode])

  const loadRegisteredSongs = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    setSongLoadStatus('loading')

    try {
      const cachedSongs = cacheService.getCachedSongs()
      if (cachedSongs !== null) {
        if (requestId === loadRequestIdRef.current) {
          setRegisteredSongs(cachedSongs)
          setSongLoadStatus('ready')
        }
        return
      }

      const fetchedSongs = await firebaseService.getAllSongs()
      if (requestId !== loadRequestIdRef.current) return

      cacheService.cacheSongs(fetchedSongs)
      setRegisteredSongs(fetchedSongs)
      setSongLoadStatus('ready')
    } catch {
      if (requestId !== loadRequestIdRef.current) return
      reportSetlistBingoAnalyticsError({
        code: 'registered_songs_load_failed',
        operation: 'load-registered-songs',
      })
      setRegisteredSongs([])
      setSongLoadStatus('error')
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadRegisteredSongs)
    return () => {
      loadRequestIdRef.current += 1
    }
  }, [loadRegisteredSongs])

  const clearIssues = useCallback((predicate: (issue: ValidationIssue) => boolean) => {
    setValidationIssues((current) => current.filter((issue) => !predicate(issue)))
    setValidationAnnouncement('')
  }, [])

  const handlePerformanceNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const performanceName = event.currentTarget.value
    setDraft((current) => ({ ...current, performanceName }))
    clearIssues((issue) => issue.path === 'performanceName')
  }

  const handleParticipantNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const participantName = event.currentTarget.value
    setDraft((current) => ({ ...current, participantName }))
    clearIssues((issue) => issue.path === 'participantName')
  }

  const applyGridResize = (gridSize: GridSize, songs: DraftBingoState['songs']) => {
    setDraft((current) => ({ ...current, gridSize, songs }))
    clearIssues(
      (issue) =>
        issue.path === 'gridSize' ||
        (issue.path.startsWith('songs.') &&
          Number(issue.path.slice('songs.'.length)) >= songs.length)
    )
  }

  const handleGridSizeChange = (target: GridSize, trigger: HTMLInputElement) => {
    shrinkTriggerRef.current = trigger
    const previousGridSize = draft.gridSize
    const result = requestGridResize(previousGridSize, draft.songs, target)

    if (result.kind === 'confirmation-required') {
      setPendingGridShrink({
        target: result.target,
        excludedFilledCount: result.excludedFilledCount,
      })
      return
    }

    applyGridResize(result.gridSize, result.slots)
    if (previousGridSize !== result.gridSize) {
      trackSetlistBingoGridChange({
        from: previousGridSize,
        to: result.gridSize,
        confirmed: false,
      })
    }
  }

  const handleConfirmGridShrink = () => {
    if (!pendingGridShrink) return
    const previousGridSize = draft.gridSize
    const target = pendingGridShrink.target
    applyGridResize(target, confirmGridShrink(draft.songs, target))
    trackSetlistBingoGridChange({
      from: previousGridSize,
      to: target,
      confirmed: true,
    })
    setPendingGridShrink(null)
  }

  const handleSongsChange = (songs: DraftBingoState['songs']) => {
    const changedIndexes = new Set<number>()
    const length = Math.max(draft.songs.length, songs.length)
    for (let index = 0; index < length; index += 1) {
      if (draft.songs[index] !== songs[index]) changedIndexes.add(index)
    }

    setDraft((current) => ({ ...current, songs }))
    clearIssues((issue) => {
      if (issue.path === 'gridSize' && issue.code === 'song_count_mismatch') return true
      if (!issue.path.startsWith('songs.')) return false
      return changedIndexes.has(Number(issue.path.slice('songs.'.length)))
    })
  }

  const handleDesignChange = (designId: BingoDesignId) => {
    if (draft.designId === designId) return
    setDraft((current) => ({ ...current, designId }))
    clearIssues((issue) => issue.path === 'designId')
    trackSetlistBingoDesignChange(designId)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateDraftBingoState(draft)

    if (!result.ok) {
      setValidationIssues(result.issues)
      setValidationAnnouncement('入力内容にエラーがあります。各入力欄を確認してください。')
      return
    }

    setValidationIssues([])
    setValidationAnnouncement('')
    const routeState: PreviewRouteState = {
      kind: 'preview-bingo',
      bingoState: result.value,
      ...(sourceLive ? { sourceLive } : {}),
    }
    trackSetlistBingoCreationComplete({
      entryMode,
      gridSize: result.value.gridSize,
      designId: result.value.designId,
    })
    navigate('/setlist-bingo/preview', { state: routeState })
  }

  const handleSourceLiveBack = () => {
    if (!sourceLive) return
    if (sourceLive.tourName) {
      navigate(`/tours/${encodeURIComponent(sourceLive.tourName)}`)
      return
    }
    navigate(`/lives/${encodeURIComponent(sourceLive.id)}`)
  }

  const handleHeaderBack = () => {
    if (sourceLive) {
      handleSourceLiveBack()
      return
    }
    navigate('/lives')
  }

  const performanceIssue = findIssue(validationIssues, 'performanceName')
  const performanceError = performanceIssue
    ? getValidationMessage(performanceIssue.code)
    : undefined
  const participantIssue = findIssue(validationIssues, 'participantName')
  const participantError = participantIssue
    ? getValidationMessage(participantIssue.code)
    : undefined
  const gridIssue = findIssue(validationIssues, 'gridSize')
  const gridError = gridIssue ? getValidationMessage(gridIssue.code) : undefined
  const designIssue = findIssue(validationIssues, 'designId')
  const designError = designIssue ? getValidationMessage(designIssue.code) : undefined
  const songErrors = draft.songs.map((_, index) => {
    const issue = findIssue(validationIssues, `songs.${index}`)
    return issue ? getValidationMessage(issue.code) : undefined
  })
  const gridDescribedBy = [gridHelpId, gridError ? gridErrorId : ''].filter(Boolean).join(' ')
  const songLoadAnnouncement =
    songLoadStatus === 'loading'
      ? '登録曲を読み込んでいます。'
      : songLoadStatus === 'error'
        ? REGISTERED_SONG_LOAD_ERROR
        : ''

  return (
    <div className="setlist-bingo-create-page">
      <Header title="セトリ予想ビンゴ作成" showBackButton onBack={handleHeaderBack} />

      <main className="setlist-bingo-create-page__main">
        <div className="setlist-bingo-create-page__content">
          <p className="setlist-bingo-create-page__intro">
            公演名、名前、予想曲、カードデザインを選んでセトリ予想ビンゴを作成します。
          </p>

          <section
            className="setlist-bingo-create-page__song-load"
            aria-label="登録曲の読み込み状態"
            hidden={songLoadStatus === 'ready'}
          >
            <p
              className="setlist-bingo-create-page__announcement"
              aria-live="polite"
              aria-atomic="true"
            >
              {songLoadAnnouncement}
            </p>
            {songLoadStatus === 'error' && (
              <div className="setlist-bingo-create-page__load-error" role="alert">
                <p>{REGISTERED_SONG_LOAD_ERROR}</p>
                <button
                  type="button"
                  className="setlist-bingo-create-page__retry"
                  onClick={() => {
                    trackSetlistBingoRetry({
                      action: 'load-registered-songs',
                      operation: 'load-registered-songs',
                    })
                    void loadRegisteredSongs()
                  }}
                >
                  登録曲を再読み込み
                </button>
              </div>
            )}
          </section>

          <form className="setlist-bingo-create-page__form" noValidate onSubmit={handleSubmit}>
            <section className="setlist-bingo-create-page__section">
              <div className="setlist-bingo-create-page__field">
                <label className="setlist-bingo-create-page__label" htmlFor={performanceNameId}>
                  公演名
                </label>
                <p id={performanceNameHelpId} className="setlist-bingo-create-page__help">
                  {MAX_PERFORMANCE_NAME_LENGTH}文字以下で入力してください。
                </p>
                <input
                  id={performanceNameId}
                  className="setlist-bingo-create-page__text-input"
                  type="text"
                  value={draft.performanceName}
                  aria-invalid={performanceError ? true : undefined}
                  aria-describedby={
                    performanceError
                      ? `${performanceNameHelpId} ${performanceNameErrorId}`
                      : performanceNameHelpId
                  }
                  onChange={handlePerformanceNameChange}
                />
                {performanceError && (
                  <p
                    id={performanceNameErrorId}
                    className="setlist-bingo-create-page__field-error"
                    role="alert"
                  >
                    {performanceError}
                  </p>
                )}
              </div>

              <div className="setlist-bingo-create-page__field">
                <label className="setlist-bingo-create-page__label" htmlFor={participantNameId}>
                  名前（任意）
                </label>
                <p id={participantNameHelpId} className="setlist-bingo-create-page__help">
                  カードに表示する名前を{MAX_PARTICIPANT_NAME_LENGTH}文字以下で入力してください。
                </p>
                <input
                  id={participantNameId}
                  className="setlist-bingo-create-page__text-input"
                  type="text"
                  value={draft.participantName}
                  aria-invalid={participantError ? true : undefined}
                  aria-describedby={
                    participantError
                      ? `${participantNameHelpId} ${participantNameErrorId}`
                      : participantNameHelpId
                  }
                  onChange={handleParticipantNameChange}
                />
                {participantError && (
                  <p
                    id={participantNameErrorId}
                    className="setlist-bingo-create-page__field-error"
                    role="alert"
                  >
                    {participantError}
                  </p>
                )}
              </div>

              <fieldset
                className="setlist-bingo-create-page__grid-size"
                aria-describedby={gridDescribedBy}
                aria-invalid={gridError ? true : undefined}
              >
                <legend className="setlist-bingo-create-page__legend">曲数</legend>
                <p id={gridHelpId} className="setlist-bingo-create-page__help">
                  カードに入れる予想曲数を選択してください。
                </p>
                <div className="setlist-bingo-create-page__grid-options">
                  {GRID_SIZE_OPTIONS.map((option) => (
                    <label
                      key={option.gridSize}
                      className="setlist-bingo-create-page__grid-option"
                      data-selected={draft.gridSize === option.gridSize ? 'true' : 'false'}
                    >
                      <input
                        ref={(element) => {
                          if (draft.gridSize === option.gridSize && !pendingGridShrink) {
                            shrinkTriggerRef.current = element
                          }
                        }}
                        type="radio"
                        name="setlist-bingo-grid-size"
                        value={option.gridSize}
                        checked={draft.gridSize === option.gridSize}
                        aria-describedby={gridError ? gridErrorId : undefined}
                        onChange={(event) => {
                          if (event.currentTarget.checked) {
                            handleGridSizeChange(option.gridSize, event.currentTarget)
                          }
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                {gridError && (
                  <p
                    id={gridErrorId}
                    className="setlist-bingo-create-page__field-error"
                    role="alert"
                  >
                    {gridError}
                  </p>
                )}
              </fieldset>
            </section>

            <section className="setlist-bingo-create-page__section">
              <PredictionSongGrid
                gridSize={draft.gridSize}
                slots={draft.songs}
                songs={registeredSongs}
                errors={songErrors}
                onChange={handleSongsChange}
              />
            </section>

            <section className="setlist-bingo-create-page__section">
              <BingoDesignPicker
                performanceName={draft.performanceName}
                participantName={draft.participantName}
                gridSize={draft.gridSize}
                value={draft.designId}
                error={designError}
                onChange={handleDesignChange}
              />
            </section>

            {validationAnnouncement && (
              <p className="setlist-bingo-create-page__validation-summary" role="alert">
                {validationAnnouncement}
              </p>
            )}

            <div className="setlist-bingo-create-page__actions">
              <button type="submit" className="setlist-bingo-create-page__submit">
                作成
              </button>
            </div>
          </form>
        </div>
      </main>

      <Navigation currentPath="/lives" onNavigate={(path) => navigate(path)} />

      {pendingGridShrink && (
        <GridShrinkDialog
          excludedFilledCount={pendingGridShrink.excludedFilledCount}
          triggerRef={shrinkTriggerRef}
          onCancel={() => setPendingGridShrink(null)}
          onConfirm={handleConfirmGridShrink}
        />
      )}
    </div>
  )
}

export default SetlistBingoCreatePage
