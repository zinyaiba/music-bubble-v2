/**
 * LiveForm コンポーネント
 * ライブ情報の入力フォームコンポーネント
 *
 * Requirements:
 * - 6.1: 必要なすべてのフィールドを含むフォームを表示
 * - 6.2: ライブ種別セレクター、公演名入力、会場名入力、日時ピッカー、セトリエディター
 * - 6.3: ツアー選択時の公演地入力フィールド
 * - 6.9: バリデーションエラーメッセージを表示
 */

import { useState, useCallback, useMemo } from 'react'
import type { Live, LiveType, Song, MusicServiceEmbed } from '../../types'
import { LIVE_TYPE_LABELS } from '../../types'
import { SetlistEditor, type SetlistItemFormData } from './SetlistEditor'
import './LiveForm.css'

/**
 * フォームデータの型
 */
export interface LiveFormData {
  liveType: LiveType
  title: string
  venueName: string
  dateTime: string
  tourLocation?: string
  setlist: SetlistItemFormData[]
  embeds?: MusicServiceEmbed[]
}

/**
 * 内部フォームデータの型（年・月・日を分離）
 */
interface InternalFormData {
  liveType: LiveType
  title: string
  venueName: string
  year: string
  month: string // MM形式
  day: string // DD形式
  tourLocation: string
  setlist: SetlistItemFormData[]
  embeds: MusicServiceEmbed[]
}

export interface LiveFormProps {
  /** 編集時は既存データ */
  live?: Live
  /** 楽曲データの配列（セトリエディター用） */
  songs: Song[]
  /** 送信時のコールバック */
  onSubmit: (liveData: LiveFormData) => void
  /** キャンセル時のコールバック */
  onCancel: () => void
  /** 送信中フラグ */
  isLoading?: boolean
  /** バリデーションエラー */
  validationErrors?: Record<string, string>
  /** ツアー公演追加モード（ライブ種別・公演名を固定） */
  tourAddMode?: boolean
  /** 固定するツアー名（tourAddMode時に使用） */
  fixedTourName?: string
  /** 同じツアーの公演リスト（セトリコピー用） */
  tourPerformances?: Live[]
}

/**
 * バリデーションエラーの型
 */
interface FormErrors {
  liveType?: string
  title?: string
  venueName?: string
  year?: string
  month?: string
  day?: string
  tourLocation?: string
}

/**
 * ライブ種別の選択肢
 */
const LIVE_TYPE_OPTIONS: { value: LiveType; label: string }[] = [
  { value: 'tour', label: LIVE_TYPE_LABELS.tour },
  { value: 'solo', label: LIVE_TYPE_LABELS.solo },
  { value: 'festival', label: LIVE_TYPE_LABELS.festival },
  { value: 'event', label: LIVE_TYPE_LABELS.event },
]

/**
 * ISO 8601形式の日時文字列から年を取得
 */
function getYearFromDateTime(dateTime: string | undefined): string {
  if (!dateTime) return ''
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return ''
    return String(date.getFullYear())
  } catch {
    return ''
  }
}

/**
 * ISO 8601形式の日時文字列から月を取得（MM形式）
 */
function getMonthFromDateTime(dateTime: string | undefined): string {
  if (!dateTime) return ''
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return ''
    return String(date.getMonth() + 1).padStart(2, '0')
  } catch {
    return ''
  }
}

/**
 * ISO 8601形式の日時文字列から日を取得（DD形式）
 */
function getDayFromDateTime(dateTime: string | undefined): string {
  if (!dateTime) return ''
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return ''
    return String(date.getDate()).padStart(2, '0')
  } catch {
    return ''
  }
}

/**
 * 年・月・日からISO 8601形式の日時文字列を生成
 */
function formatDateTimeForSubmit(year: string, month: string, day: string): string {
  if (!year || !month || !day) return ''
  try {
    const dateStr = `${year}-${month}-${day}T00:00:00`
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return ''
    return date.toISOString()
  } catch {
    return ''
  }
}

/**
 * LiveからSetlistItemFormDataの配列に変換
 */
function liveSetlistToFormData(live?: Live): SetlistItemFormData[] {
  if (!live?.setlist || live.setlist.length === 0) return []
  return live.setlist.map((item) => ({
    songId: item.songId,
    songTitle: item.songTitle,
    isDailySong: item.isDailySong,
  }))
}

/**
 * 埋め込みコンテンツからサービス名を自動判定
 */
function getServiceNameFromEmbed(embed: string): string {
  const lowerEmbed = embed.toLowerCase()
  if (lowerEmbed.includes('spotify')) return 'Spotify'
  if (lowerEmbed.includes('youtube') || lowerEmbed.includes('youtu.be')) return 'YouTube'
  if (lowerEmbed.includes('apple')) return 'Apple Music'
  if (lowerEmbed.includes('soundcloud')) return 'SoundCloud'
  if (lowerEmbed.includes('bandcamp')) return 'Bandcamp'
  if (lowerEmbed.includes('nicovideo') || lowerEmbed.includes('nico.ms')) return 'ニコニコ動画'
  return '埋め込みコンテンツ'
}

/**
 * LiveForm コンポーネント
 * ライブの登録・編集フォーム
 */
export function LiveForm({
  live,
  songs,
  onSubmit,
  onCancel,
  isLoading = false,
  validationErrors = {},
  tourAddMode = false,
  fixedTourName,
  tourPerformances = [],
}: LiveFormProps) {
  const isEditMode = !!live

  // フォームデータの初期化
  const initialFormData = useMemo(
    (): InternalFormData => ({
      // ツアー追加モードの場合はライブ種別を'tour'に固定
      liveType: tourAddMode ? 'tour' : (live?.liveType || ('tour' as LiveType)),
      // ツアー追加モードの場合は公演名を固定
      title: tourAddMode && fixedTourName ? fixedTourName : (live?.title || ''),
      venueName: live?.venueName || '',
      year: getYearFromDateTime(live?.dateTime),
      month: getMonthFromDateTime(live?.dateTime),
      day: getDayFromDateTime(live?.dateTime),
      tourLocation: live?.tourLocation || '',
      setlist: liveSetlistToFormData(live),
      embeds: live?.embeds?.filter((item) => item.embed && item.embed.trim() !== '') || [],
    }),
    [live, tourAddMode, fixedTourName]
  )

  const [formData, setFormData] = useState<InternalFormData>(initialFormData)
  const [internalErrors, setInternalErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // 内部エラーと外部バリデーションエラーをマージ
  const errors: FormErrors = useMemo(
    () => ({ ...internalErrors, ...validationErrors }),
    [internalErrors, validationErrors]
  )

  /**
   * フィールド変更ハンドラ
   */
  const handleChange = useCallback(
    (field: keyof InternalFormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value
        setFormData((prev) => {
          const newData = { ...prev, [field]: value }
          // ライブ種別がtour以外に変更された場合、公演地をクリア
          if (field === 'liveType' && value !== 'tour') {
            newData.tourLocation = ''
          }
          return newData
        })

        // エラーをクリア
        if (errors[field as keyof FormErrors]) {
          setInternalErrors((prev) => ({ ...prev, [field]: undefined }))
        }
      },
    [errors]
  )

  /**
   * フィールドのblurハンドラ
   */
  const handleBlur = useCallback(
    (field: string) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }))
    },
    []
  )

  /**
   * セトリ変更ハンドラ
   */
  const handleSetlistChange = useCallback((items: SetlistItemFormData[]) => {
    setFormData((prev) => ({ ...prev, setlist: items }))
  }, [])

  /**
   * 別の公演からセトリをコピー
   */
  const handleCopySetlist = useCallback((performanceId: string) => {
    if (!performanceId) return
    const sourcePerformance = tourPerformances.find((p) => p.id === performanceId)
    if (!sourcePerformance || !sourcePerformance.setlist) return

    const copiedSetlist: SetlistItemFormData[] = sourcePerformance.setlist.map((item) => ({
      songId: item.songId,
      songTitle: item.songTitle,
      isDailySong: item.isDailySong,
    }))
    setFormData((prev) => ({ ...prev, setlist: copiedSetlist }))
  }, [tourPerformances])

  /**
   * 埋め込みコンテンツの追加
   */
  const handleAddEmbed = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      embeds: [...prev.embeds, { embed: '', label: '' }],
    }))
  }, [])

  /**
   * 埋め込みコンテンツの削除
   */
  const handleRemoveEmbed = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      embeds: prev.embeds.filter((_, i) => i !== index),
    }))
  }, [])

  /**
   * 埋め込みコンテンツの変更
   */
  const handleEmbedChange = useCallback(
    (index: number, field: 'embed' | 'label', value: string) => {
      setFormData((prev) => ({
        ...prev,
        embeds: prev.embeds.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }))
    },
    []
  )

  /**
   * バリデーション
   */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // ライブ種別は必須（ツアー追加モードでは固定なのでスキップ）
    if (!tourAddMode && !formData.liveType) {
      newErrors.liveType = 'ライブ種別を選択してください'
    }

    // 公演名は必須（ツアー追加モードでは固定なのでスキップ）
    if (!tourAddMode && !formData.title.trim()) {
      newErrors.title = '公演名を入力してください'
    }

    // 会場名は任意（バリデーションなし）

    // 年は必須
    if (!formData.year) {
      newErrors.year = '年を入力してください'
    } else if (!/^\d{4}$/.test(formData.year)) {
      newErrors.year = '4桁の年を入力してください'
    }

    // 月は必須
    if (!formData.month) {
      newErrors.month = '月を選択してください'
    }

    // 日は必須
    if (!formData.day) {
      newErrors.day = '日を選択してください'
    }

    setInternalErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, tourAddMode])

  /**
   * フォーム送信ハンドラ
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 全フィールドをtouchedに
    const allTouched: Record<string, boolean> = {}
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true
    })
    setTouched(allTouched)

    if (!validate()) {
      return
    }

    // 送信データを構築
    const submitData: LiveFormData = {
      liveType: formData.liveType,
      title: formData.title.trim(),
      venueName: formData.venueName.trim(),
      dateTime: formatDateTimeForSubmit(formData.year, formData.month, formData.day),
      setlist: formData.setlist,
    }

    // ツアーの場合のみ公演地を含める
    if (formData.liveType === 'tour' && formData.tourLocation?.trim()) {
      submitData.tourLocation = formData.tourLocation.trim()
    }

    // 有効な埋め込みコンテンツのみ
    const validEmbeds = formData.embeds.filter((item) => item.embed && item.embed.trim())
    if (validEmbeds.length > 0) {
      submitData.embeds = validEmbeds.map((item) => {
        const embed = (item.embed || '').trim()
        const label = item.label?.trim()
        // ラベルが空の場合は埋め込み内容から自動判定
        const autoLabel = label || getServiceNameFromEmbed(embed)
        return {
          embed,
          label: autoLabel,
        }
      })
    }

    onSubmit(submitData)
  }

  /**
   * エラーメッセージの表示判定
   */
  const shouldShowError = useCallback(
    (field: string): boolean => {
      return touched[field] && !!errors[field as keyof FormErrors]
    },
    [touched, errors]
  )

  return (
    <form className="live-form" onSubmit={handleSubmit} noValidate>
      <div className="live-form__header">
        <h2 className="live-form__title">
          {tourAddMode ? '公演地を追加' : isEditMode ? 'ライブを編集' : '新規ライブを登録'}
        </h2>
        {tourAddMode && fixedTourName && (
          <p className="live-form__tour-name">{fixedTourName}</p>
        )}
      </div>

      <div className="live-form__content">
        {/* 基本情報セクション */}
        <section className="live-form__section">
          <h3 className="live-form__section-title">基本情報</h3>

          {/* ライブ種別（ツアー追加モードでは非表示） */}
          {!tourAddMode && (
            <div
              className={`live-form__field ${shouldShowError('liveType') ? 'live-form__field--error' : ''}`}
            >
              <label htmlFor="liveType" className="live-form__label">
                ライブ種別 <span className="live-form__required">*</span>
              </label>
              <select
                id="liveType"
                className="live-form__select"
                value={formData.liveType}
                onChange={handleChange('liveType')}
                onBlur={handleBlur('liveType')}
                disabled={isLoading}
              >
                {LIVE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {shouldShowError('liveType') && <p className="live-form__error">{errors.liveType}</p>}
            </div>
          )}

          {/* 公演名（ツアー追加モードでは非表示） */}
          {!tourAddMode && (
            <div
              className={`live-form__field ${shouldShowError('title') ? 'live-form__field--error' : ''}`}
            >
              <label htmlFor="title" className="live-form__label">
                公演名 <span className="live-form__required">*</span>
              </label>
              <input
                type="text"
                id="title"
                className="live-form__input"
                value={formData.title}
                onChange={handleChange('title')}
                onBlur={handleBlur('title')}
                placeholder="公演名を入力"
                disabled={isLoading}
                autoComplete="off"
              />
              {shouldShowError('title') && <p className="live-form__error">{errors.title}</p>}
            </div>
          )}

          {/* 公演地（ツアーの場合のみ表示、ツアー追加モードでは常に表示） */}
          {(formData.liveType === 'tour' || tourAddMode) && (
            <div className="live-form__field">
              <label htmlFor="tourLocation" className="live-form__label">
                公演地
              </label>
              <input
                type="text"
                id="tourLocation"
                className="live-form__input"
                value={formData.tourLocation || ''}
                onChange={handleChange('tourLocation')}
                onBlur={handleBlur('tourLocation')}
                placeholder="例: 東京、大阪、名古屋"
                disabled={isLoading}
                autoComplete="off"
              />
              <p className="live-form__hint">ツアー公演の開催地を入力してください</p>
            </div>
          )}

          {/* 会場名 */}
          <div className="live-form__field">
            <label htmlFor="venueName" className="live-form__label">
              会場名
            </label>
            <input
              type="text"
              id="venueName"
              className="live-form__input"
              value={formData.venueName}
              onChange={handleChange('venueName')}
              onBlur={handleBlur('venueName')}
              placeholder="会場名を入力（任意）"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* 日時（年と月日を分離） */}
          <div className="live-form__date-row">
            {/* 年 */}
            <div
              className={`live-form__field live-form__field--year ${shouldShowError('year') ? 'live-form__field--error' : ''}`}
            >
              <label htmlFor="year" className="live-form__label">
                年 <span className="live-form__required">*</span>
              </label>
              <input
                type="number"
                id="year"
                className="live-form__input"
                value={formData.year}
                onChange={handleChange('year')}
                onBlur={handleBlur('year')}
                placeholder="2024"
                min="1900"
                max="2100"
                disabled={isLoading}
              />
              {shouldShowError('year') && <p className="live-form__error">{errors.year}</p>}
            </div>

            {/* 月 */}
            <div
              className={`live-form__field live-form__field--month ${shouldShowError('month') ? 'live-form__field--error' : ''}`}
            >
              <label htmlFor="month" className="live-form__label">
                月 <span className="live-form__required">*</span>
              </label>
              <select
                id="month"
                className="live-form__select"
                value={formData.month}
                onChange={handleChange('month')}
                onBlur={handleBlur('month')}
                disabled={isLoading}
              >
                <option value="">--</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={String(m).padStart(2, '0')}>
                    {m}月
                  </option>
                ))}
              </select>
              {shouldShowError('month') && <p className="live-form__error">{errors.month}</p>}
            </div>

            {/* 日 */}
            <div
              className={`live-form__field live-form__field--day ${shouldShowError('day') ? 'live-form__field--error' : ''}`}
            >
              <label htmlFor="day" className="live-form__label">
                日 <span className="live-form__required">*</span>
              </label>
              <select
                id="day"
                className="live-form__select"
                value={formData.day}
                onChange={handleChange('day')}
                onBlur={handleBlur('day')}
                disabled={isLoading}
              >
                <option value="">--</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d).padStart(2, '0')}>
                    {d}日
                  </option>
                ))}
              </select>
              {shouldShowError('day') && <p className="live-form__error">{errors.day}</p>}
            </div>
          </div>
        </section>

        {/* セトリセクション */}
        <section className="live-form__section">
          <h3 className="live-form__section-title">セトリ</h3>

          {/* セトリコピー機能（ツアー追加モードで他の公演がある場合のみ表示） */}
          {tourAddMode && tourPerformances.length > 0 && (
            <div className="live-form__setlist-copy">
              <label htmlFor="copySetlist" className="live-form__label">
                別の公演からセトリをコピー
              </label>
              <div className="live-form__setlist-copy-row">
                <select
                  id="copySetlist"
                  className="live-form__select"
                  defaultValue=""
                  onChange={(e) => handleCopySetlist(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">公演を選択...</option>
                  {tourPerformances.map((performance) => (
                    <option key={performance.id} value={performance.id}>
                      {performance.tourLocation || performance.venueName || '不明な公演'}
                      {performance.setlist?.length ? ` (${performance.setlist.length}曲)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="live-form__hint">選択した公演のセトリが反映されます（現在のセトリは上書きされます）</p>
            </div>
          )}

          <SetlistEditor
            items={formData.setlist}
            songs={songs}
            onChange={handleSetlistChange}
            disabled={isLoading}
          />
        </section>

        {/* 埋め込みコンテンツセクション */}
        <section className="live-form__section">
          <h3 className="live-form__section-title">埋め込みコンテンツ</h3>

          <div className="live-form__embeds">
            {formData.embeds.map((item, index) => (
              <div key={index} className="live-form__embed-item">
                <div className="live-form__embed-fields">
                  <div className="live-form__field">
                    <input
                      type="text"
                      className="live-form__input live-form__input--embed-label"
                      value={item.label || ''}
                      onChange={(e) => handleEmbedChange(index, 'label', e.target.value)}
                      placeholder="ラベル（例: YouTube, Spotify）"
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </div>
                  <div className="live-form__field">
                    <textarea
                      className="live-form__textarea live-form__textarea--embed"
                      value={item.embed}
                      onChange={(e) => handleEmbedChange(index, 'embed', e.target.value)}
                      placeholder="iframeタグを貼り付け"
                      disabled={isLoading}
                      rows={3}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="live-form__embed-remove"
                  onClick={() => handleRemoveEmbed(index)}
                  disabled={isLoading}
                  aria-label="埋め込みコンテンツを削除"
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
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              className="live-form__embed-add"
              onClick={handleAddEmbed}
              disabled={isLoading}
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              埋め込みコンテンツを追加
            </button>
          </div>
          <p className="live-form__hint">
            YouTube等の埋め込みiframeタグを貼り付けてください
          </p>
        </section>
      </div>

      {/* アクションボタン */}
      <div className="live-form__actions">
        <button
          type="button"
          className="live-form__cancel-button"
          onClick={onCancel}
          disabled={isLoading}
        >
          キャンセル
        </button>
        <button type="submit" className="live-form__submit-button" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="live-form__spinner" />
              保存中...
            </>
          ) : tourAddMode ? (
            '追加する'
          ) : isEditMode ? (
            '更新する'
          ) : (
            '登録する'
          )}
        </button>
      </div>
    </form>
  )
}

export default LiveForm
