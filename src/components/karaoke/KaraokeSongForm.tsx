import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import type {
  CreateKaraokeSongInput,
  KaraokeSongDraft,
  KaraokeValidationErrors,
} from '../../types/karaoke'
import { normalizeKaraokeDraft, streamingEpisodesReducer } from '../../utils/karaokeDraft'
import './KaraokeSongForm.css'

export interface KaraokeSongFormProps {
  initialDraft?: KaraokeSongDraft
  mode?: 'create' | 'edit'
  onSubmit: (input: CreateKaraokeSongInput) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

const EMPTY_DRAFT: KaraokeSongDraft = {
  title: '',
  originalArtist: '',
  releaseYear: '',
  streamingEpisodes: [],
  notes: '',
}

function copyDraft(draft: KaraokeSongDraft): KaraokeSongDraft {
  return {
    ...draft,
    streamingEpisodes: [...draft.streamingEpisodes],
  }
}

export function KaraokeSongForm({
  initialDraft,
  mode = 'create',
  onSubmit,
  onCancel,
  isSubmitting = false,
}: KaraokeSongFormProps) {
  const idPrefix = useId()
  const [draft, setDraft] = useState<KaraokeSongDraft>(() => copyDraft(initialDraft ?? EMPTY_DRAFT))
  const [errors, setErrors] = useState<KaraokeValidationErrors>({})
  const titleInputRef = useRef<HTMLInputElement>(null)
  const releaseYearInputRef = useRef<HTMLInputElement>(null)
  const episodeInputRefs = useRef<Array<HTMLInputElement | null>>([])

  const titleId = `${idPrefix}-title`
  const titleErrorId = `${titleId}-error`
  const originalArtistId = `${idPrefix}-original-artist`
  const releaseYearId = `${idPrefix}-release-year`
  const releaseYearHintId = `${releaseYearId}-hint`
  const releaseYearErrorId = `${releaseYearId}-error`
  const notesId = `${idPrefix}-notes`
  const formTitleId = `${idPrefix}-form-title`

  const updateTextField =
    (field: 'title' | 'originalArtist' | 'releaseYear' | 'notes') =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value
      setDraft((current) => ({ ...current, [field]: value }))

      if (field === 'title' || field === 'releaseYear') {
        setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
      }
    }

  const handleAddEpisode = () => {
    setDraft((current) => ({
      ...current,
      streamingEpisodes: streamingEpisodesReducer(current.streamingEpisodes, { type: 'add' }),
    }))
  }

  const handleRemoveEpisode = (index: number) => {
    setDraft((current) => ({
      ...current,
      streamingEpisodes: streamingEpisodesReducer(current.streamingEpisodes, {
        type: 'remove',
        index,
      }),
    }))
    setErrors((current) => ({ ...current, streamingEpisodes: undefined }))
  }

  const handleEpisodeChange = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      streamingEpisodes: current.streamingEpisodes.map((episode, episodeIndex) =>
        episodeIndex === index ? value : episode
      ),
    }))
    setErrors((current) => {
      if (!current.streamingEpisodes?.[index]) return current
      const nextEpisodeErrors = { ...current.streamingEpisodes }
      delete nextEpisodeErrors[index]
      return {
        ...current,
        streamingEpisodes:
          Object.keys(nextEpisodeErrors).length > 0 ? nextEpisodeErrors : undefined,
      }
    })
  }

  const focusFirstInvalidField = (validationErrors: KaraokeValidationErrors) => {
    if (validationErrors.title) {
      titleInputRef.current?.focus()
    } else if (validationErrors.releaseYear) {
      releaseYearInputRef.current?.focus()
    } else if (validationErrors.streamingEpisodes) {
      const firstInvalidIndex = Number(Object.keys(validationErrors.streamingEpisodes)[0])
      episodeInputRefs.current[firstInvalidIndex]?.focus()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = normalizeKaraokeDraft(draft)

    if (!result.success) {
      setErrors(result.errors)
      focusFirstInvalidField(result.errors)
      return
    }

    setErrors({})
    void onSubmit(result.input)
  }

  const releaseYearDescribedBy = errors.releaseYear
    ? `${releaseYearHintId} ${releaseYearErrorId}`
    : releaseYearHintId

  return (
    <form
      className="karaoke-song-form"
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={formTitleId}
    >
      <div className="karaoke-song-form__header">
        <h2 id={formTitleId} className="karaoke-song-form__title">
          {mode === 'edit' ? 'カラオケ歌唱曲を編集' : 'カラオケ歌唱曲を登録'}
        </h2>
      </div>

      <div className="karaoke-song-form__content">
        <section className="karaoke-song-form__section">
          <h3 className="karaoke-song-form__section-title">基本情報</h3>

          <div
            className={`karaoke-song-form__field${errors.title ? ' karaoke-song-form__field--error' : ''}`}
          >
            <label htmlFor={titleId} className="karaoke-song-form__label">
              曲名
              <span className="karaoke-song-form__required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              ref={titleInputRef}
              id={titleId}
              className="karaoke-song-form__input"
              type="text"
              value={draft.title}
              onChange={updateTextField('title')}
              placeholder="曲名を入力"
              required
              aria-invalid={errors.title ? 'true' : undefined}
              aria-describedby={errors.title ? titleErrorId : undefined}
              disabled={isSubmitting}
              autoComplete="off"
            />
            {errors.title && (
              <p id={titleErrorId} className="karaoke-song-form__error" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div className="karaoke-song-form__field">
            <label htmlFor={originalArtistId} className="karaoke-song-form__label">
              原曲アーティスト名
            </label>
            <input
              id={originalArtistId}
              className="karaoke-song-form__input"
              type="text"
              value={draft.originalArtist}
              onChange={updateTextField('originalArtist')}
              placeholder="原曲のアーティスト名を入力"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          <div
            className={`karaoke-song-form__field${errors.releaseYear ? ' karaoke-song-form__field--error' : ''}`}
          >
            <label htmlFor={releaseYearId} className="karaoke-song-form__label">
              発売年
            </label>
            <input
              ref={releaseYearInputRef}
              id={releaseYearId}
              className="karaoke-song-form__input karaoke-song-form__input--year"
              type="text"
              inputMode="numeric"
              value={draft.releaseYear}
              onChange={updateTextField('releaseYear')}
              placeholder="例: 2024"
              aria-invalid={errors.releaseYear ? 'true' : undefined}
              aria-describedby={releaseYearDescribedBy}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p id={releaseYearHintId} className="karaoke-song-form__hint">
              1000から9999までの年を4桁で入力してください。月日は不要です。
            </p>
            {errors.releaseYear && (
              <p id={releaseYearErrorId} className="karaoke-song-form__error" role="alert">
                {errors.releaseYear}
              </p>
            )}
          </div>
        </section>

        <section className="karaoke-song-form__section">
          <div className="karaoke-song-form__section-heading">
            <h3 className="karaoke-song-form__section-title">配信回</h3>
            <span className="karaoke-song-form__optional">任意</span>
          </div>

          <div className="karaoke-song-form__episodes">
            {draft.streamingEpisodes.length === 0 ? (
              <p className="karaoke-song-form__empty-episodes">配信回は追加されていません</p>
            ) : (
              draft.streamingEpisodes.map((episode, index) => {
                const episodeId = `${idPrefix}-episode-${index}`
                const episodeErrorId = `${episodeId}-error`
                const episodeError = errors.streamingEpisodes?.[index]
                return (
                  <div className="karaoke-song-form__episode" key={index}>
                    <div
                      className={`karaoke-song-form__episode-field${episodeError ? ' karaoke-song-form__field--error' : ''}`}
                    >
                      <label htmlFor={episodeId} className="karaoke-song-form__label">
                        配信回 {index + 1}
                      </label>
                      <input
                        ref={(element) => {
                          episodeInputRefs.current[index] = element
                        }}
                        id={episodeId}
                        className="karaoke-song-form__input"
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]+(?:\.[0-9]+)?"
                        value={episode}
                        onChange={(event) => handleEpisodeChange(index, event.target.value)}
                        placeholder="例: 10.5"
                        aria-invalid={episodeError ? 'true' : undefined}
                        aria-describedby={episodeError ? episodeErrorId : undefined}
                        disabled={isSubmitting}
                        autoComplete="off"
                      />
                      {episodeError && (
                        <p id={episodeErrorId} className="karaoke-song-form__error" role="alert">
                          {episodeError}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="karaoke-song-form__episode-remove"
                      onClick={() => handleRemoveEpisode(index)}
                      disabled={isSubmitting}
                      aria-label={`配信回 ${index + 1} を削除`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )
              })
            )}

            <button
              type="button"
              className="karaoke-song-form__episode-add"
              onClick={handleAddEpisode}
              disabled={isSubmitting}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              配信回を追加
            </button>
          </div>
          <p className="karaoke-song-form__hint">
            配信回の数字だけを入力してください。空欄は保存されません。
          </p>
        </section>

        <section className="karaoke-song-form__section">
          <h3 className="karaoke-song-form__section-title">備考</h3>
          <div className="karaoke-song-form__field">
            <label htmlFor={notesId} className="karaoke-song-form__label">
              備考
            </label>
            <textarea
              id={notesId}
              className="karaoke-song-form__textarea"
              value={draft.notes}
              onChange={updateTextField('notes')}
              placeholder="キー変更などの補足情報を入力"
              disabled={isSubmitting}
              rows={5}
            />
          </div>
        </section>
      </div>

      <div className="karaoke-song-form__actions">
        <button
          type="button"
          className="karaoke-song-form__cancel-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button type="submit" className="karaoke-song-form__submit-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="karaoke-song-form__spinner" aria-hidden="true" />
              保存中...
            </>
          ) : (
            '保存する'
          )}
        </button>
      </div>
    </form>
  )
}

export default KaraokeSongForm
