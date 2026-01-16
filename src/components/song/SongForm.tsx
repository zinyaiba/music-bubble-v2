/**
 * SongForm コンポーネント
 * 楽曲登録・編集フォーム、バリデーション
 *
 * Requirements:
 * - 7.4: 新規楽曲を追加するボタンを提供
 * - 7.5: 既存楽曲の編集機能を提供
 * - 15.5: ユーザー入力を検証し、明確な検証メッセージを表示
 */

import { useState, useCallback, useMemo } from 'react'
import type { Song, DetailPageUrl, MusicServiceEmbed } from '../../types'
import './SongForm.css'

export interface SongFormProps {
  /** 編集時は既存データ */
  song?: Song
  /** 送信時のコールバック */
  onSubmit: (song: Partial<Song>) => void
  /** キャンセル時のコールバック */
  onCancel: () => void
  /** 送信中フラグ */
  isSubmitting?: boolean
}

interface FormData {
  title: string
  artists: string
  lyricists: string
  composers: string
  arrangers: string
  releaseYear: string
  releaseMonth: string
  releaseDay: string
  singleName: string
  albumName: string
  musicServiceEmbeds: MusicServiceEmbed[]
  detailPageUrls: DetailPageUrl[]
}

interface FormErrors {
  title?: string
  releaseYear?: string
  releaseMonth?: string
  releaseDay?: string
  detailPageUrls?: string[]
}

/**
 * 配列を文字列に変換（カンマ区切り）
 */
function arrayToString(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return ''
  return arr.join(', ')
}

/**
 * 文字列を配列に変換（カンマ区切り）
 */
function stringToArray(str: string): string[] {
  if (!str.trim()) return []
  return str
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * URLが有効かチェック
 */
function isValidUrl(url: string): boolean {
  if (!url.trim()) return true // 空は許可
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 埋め込み内容からサービス名を自動判定
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
 * URLからリンクラベルを自動判定
 */
function getLinkLabelFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('spotify')) return 'Spotify'
  if (lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) return 'YouTube'
  if (lowerUrl.includes('apple')) return 'Apple Music'
  if (lowerUrl.includes('amazon')) return 'Amazon Music'
  if (lowerUrl.includes('aniuta')) return 'ANiUTa'
  if (lowerUrl.includes('mora')) return 'mora'
  if (lowerUrl.includes('recochoku')) return 'レコチョク'
  if (lowerUrl.includes('oricon')) return 'ORICON'
  if (lowerUrl.includes('utaten')) return 'UtaTen'
  if (lowerUrl.includes('uta-net')) return 'Uta-Net'
  if (lowerUrl.includes('joysound')) return 'JOYSOUND'
  if (lowerUrl.includes('dam')) return 'DAM'
  if (lowerUrl.includes('nicovideo') || lowerUrl.includes('nico.ms')) return 'ニコニコ動画'
  return 'リンク'
}

/**
 * 年が有効かチェック
 */
function isValidYear(year: string): boolean {
  if (!year.trim()) return true // 空は許可
  const num = parseInt(year, 10)
  return !isNaN(num) && num >= 1900 && num <= new Date().getFullYear() + 1
}

/**
 * 月が有効かチェック（1-12）
 */
function isValidMonth(month: string): boolean {
  if (!month.trim()) return true // 空は許可
  const num = parseInt(month, 10)
  return !isNaN(num) && num >= 1 && num <= 12
}

/**
 * 日が有効かチェック（1-31）
 */
function isValidDay(day: string): boolean {
  if (!day.trim()) return true // 空は許可
  const num = parseInt(day, 10)
  return !isNaN(num) && num >= 1 && num <= 31
}

/**
 * MMDD形式から月と日を分解
 */
function parseReleaseDate(releaseDate: string | undefined): { month: string; day: string } {
  if (!releaseDate || releaseDate.length !== 4) {
    return { month: '', day: '' }
  }
  const month = parseInt(releaseDate.substring(0, 2), 10)
  const day = parseInt(releaseDate.substring(2, 4), 10)
  return {
    month: isNaN(month) ? '' : month.toString(),
    day: isNaN(day) ? '' : day.toString(),
  }
}

/**
 * 月と日をMMDD形式に変換
 */
function formatReleaseDate(month: string, day: string): string | undefined {
  if (!month.trim() && !day.trim()) return undefined
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  if (isNaN(m) || isNaN(d)) return undefined
  return `${m.toString().padStart(2, '0')}${d.toString().padStart(2, '0')}`
}

/**
 * 既存データから埋め込みコンテンツ配列を生成（後方互換性対応）
 */
function getInitialEmbeds(song?: Song): MusicServiceEmbed[] {
  // 新形式があればそれを使用
  if (song?.musicServiceEmbeds && song.musicServiceEmbeds.length > 0) {
    return song.musicServiceEmbeds
  }
  // 旧形式からの変換
  if (song?.musicServiceEmbed) {
    return [{ embed: song.musicServiceEmbed }]
  }
  return []
}

/**
 * SongForm コンポーネント
 * 楽曲の登録・編集フォーム
 */
export function SongForm({
  song,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: SongFormProps) {
  const isEditMode = !!song

  // フォームデータの初期化
  const initialFormData: FormData = useMemo(() => {
    const { month, day } = parseReleaseDate(song?.releaseDate)
    return {
      title: song?.title || '',
      artists: arrayToString(song?.artists),
      lyricists: arrayToString(song?.lyricists),
      composers: arrayToString(song?.composers),
      arrangers: arrayToString(song?.arrangers),
      releaseYear: song?.releaseYear?.toString() || '',
      releaseMonth: month,
      releaseDay: day,
      singleName: song?.singleName || '',
      albumName: song?.albumName || '',
      musicServiceEmbeds: getInitialEmbeds(song),
      detailPageUrls: song?.detailPageUrls || [],
    }
  }, [song])

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  /**
   * フィールド変更ハンドラ
   */
  const handleChange = useCallback(
    (field: keyof FormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value
        setFormData((prev) => ({ ...prev, [field]: value }))

        // エラーをクリア
        if (errors[field as keyof FormErrors]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
      },
    [errors]
  )

  /**
   * フィールドのblurハンドラ
   */
  const handleBlur = useCallback((field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }, [])

  /**
   * 埋め込みコンテンツの追加
   */
  const handleAddEmbed = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      musicServiceEmbeds: [...prev.musicServiceEmbeds, { embed: '', label: '' }],
    }))
  }, [])

  /**
   * 埋め込みコンテンツの削除
   */
  const handleRemoveEmbed = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      musicServiceEmbeds: prev.musicServiceEmbeds.filter((_, i) => i !== index),
    }))
  }, [])

  /**
   * 埋め込みコンテンツの変更
   */
  const handleEmbedChange = useCallback(
    (index: number, field: 'embed' | 'label', value: string) => {
      setFormData((prev) => ({
        ...prev,
        musicServiceEmbeds: prev.musicServiceEmbeds.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }))
    },
    []
  )

  /**
   * 外部リンクの追加
   */
  const handleAddUrl = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      detailPageUrls: [...prev.detailPageUrls, { url: '', label: '' }],
    }))
  }, [])

  /**
   * 外部リンクの削除
   */
  const handleRemoveUrl = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      detailPageUrls: prev.detailPageUrls.filter((_, i) => i !== index),
    }))
    // エラーもクリア
    setErrors((prev) => {
      const newUrlErrors = [...(prev.detailPageUrls || [])]
      newUrlErrors.splice(index, 1)
      return { ...prev, detailPageUrls: newUrlErrors }
    })
  }, [])

  /**
   * 外部リンクの変更
   */
  const handleUrlChange = useCallback(
    (index: number, field: 'url' | 'label', value: string) => {
      setFormData((prev) => ({
        ...prev,
        detailPageUrls: prev.detailPageUrls.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }))
      // エラーをクリア
      if (errors.detailPageUrls?.[index]) {
        setErrors((prev) => {
          const newUrlErrors = [...(prev.detailPageUrls || [])]
          newUrlErrors[index] = ''
          return { ...prev, detailPageUrls: newUrlErrors }
        })
      }
    },
    [errors.detailPageUrls]
  )

  /**
   * バリデーション
   */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // 楽曲名は必須
    if (!formData.title.trim()) {
      newErrors.title = '楽曲名は必須です'
    }

    // 発売年のバリデーション
    if (formData.releaseYear && !isValidYear(formData.releaseYear)) {
      newErrors.releaseYear = '有効な年を入力してください（1900〜現在）'
    }

    // 発売月のバリデーション
    if (formData.releaseMonth && !isValidMonth(formData.releaseMonth)) {
      newErrors.releaseMonth = '1〜12の数値を入力してください'
    }

    // 発売日のバリデーション
    if (formData.releaseDay && !isValidDay(formData.releaseDay)) {
      newErrors.releaseDay = '1〜31の数値を入力してください'
    }

    // 外部リンクのバリデーション
    const urlErrors: string[] = []
    formData.detailPageUrls.forEach((link, index) => {
      if (link.url && !isValidUrl(link.url)) {
        urlErrors[index] = '有効なURLを入力してください'
      }
    })
    if (urlErrors.some((e) => e)) {
      newErrors.detailPageUrls = urlErrors
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

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

    // Songオブジェクトに変換
    const songData: Partial<Song> = {
      title: formData.title.trim(),
      lyricists: stringToArray(formData.lyricists),
      composers: stringToArray(formData.composers),
      arrangers: stringToArray(formData.arrangers),
    }

    // オプショナルフィールド
    const artists = stringToArray(formData.artists)
    if (artists.length > 0) songData.artists = artists

    if (formData.releaseYear) {
      songData.releaseYear = parseInt(formData.releaseYear, 10)
    }

    // 発売月日をMMDD形式で保存
    const releaseDate = formatReleaseDate(formData.releaseMonth, formData.releaseDay)
    if (releaseDate) {
      songData.releaseDate = releaseDate
    }

    if (formData.singleName.trim()) {
      songData.singleName = formData.singleName.trim()
    }

    if (formData.albumName.trim()) {
      songData.albumName = formData.albumName.trim()
    }

    // 有効な埋め込みコンテンツのみ（空の場合も明示的に空配列を設定）
    const validEmbeds = formData.musicServiceEmbeds.filter((item) => item.embed.trim())
    songData.musicServiceEmbeds = validEmbeds.map((item) => {
      const embed = item.embed.trim()
      const label = item.label?.trim()
      // ラベルが空の場合は埋め込み内容から自動判定
      const autoLabel = label || getServiceNameFromEmbed(embed)
      return {
        embed,
        label: autoLabel,
      }
    })

    // 有効な外部リンクのみ（空の場合も明示的に空配列を設定）
    const validUrls = formData.detailPageUrls.filter((link) => link.url.trim())
    songData.detailPageUrls = validUrls.map((link) => {
      const url = link.url.trim()
      const label = link.label?.trim()
      // ラベルが空の場合はURLから自動判定
      const autoLabel = label || getLinkLabelFromUrl(url)
      return {
        url,
        label: autoLabel,
      }
    })

    // 編集モードの場合はIDを保持
    if (isEditMode && song?.id) {
      songData.id = song.id
    }

    onSubmit(songData)
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
    <form className="song-form" onSubmit={handleSubmit} noValidate>
      <div className="song-form__header">
        <h2 className="song-form__title">
          {isEditMode ? '楽曲を編集' : '新規楽曲を登録'}
        </h2>
      </div>

      <div className="song-form__content">
        {/* 基本情報セクション */}
        <section className="song-form__section">
          <h3 className="song-form__section-title">基本情報</h3>

          {/* 楽曲名 */}
          <div
            className={`song-form__field ${shouldShowError('title') ? 'song-form__field--error' : ''}`}
          >
            <label htmlFor="title" className="song-form__label">
              楽曲名 <span className="song-form__required">*</span>
            </label>
            <input
              type="text"
              id="title"
              className="song-form__input"
              value={formData.title}
              onChange={handleChange('title')}
              onBlur={handleBlur('title')}
              placeholder="楽曲名を入力"
              disabled={isSubmitting}
              autoComplete="off"
            />
            {shouldShowError('title') && (
              <p className="song-form__error">{errors.title}</p>
            )}
          </div>

          {/* アーティスト */}
          <div className="song-form__field">
            <label htmlFor="artists" className="song-form__label">
              アーティスト
            </label>
            <input
              type="text"
              id="artists"
              className="song-form__input"
              value={formData.artists}
              onChange={handleChange('artists')}
              onBlur={handleBlur('artists')}
              placeholder="カンマ区切りで複数入力可"
              disabled={isSubmitting}
              autoComplete="off"
            />
            <p className="song-form__hint">例: 栗林みな実, Minami</p>
          </div>
        </section>

        {/* クレジット情報セクション */}
        <section className="song-form__section">
          <h3 className="song-form__section-title">クレジット情報</h3>

          {/* 作詞家 */}
          <div className="song-form__field">
            <label htmlFor="lyricists" className="song-form__label">
              作詞
            </label>
            <input
              type="text"
              id="lyricists"
              className="song-form__input"
              value={formData.lyricists}
              onChange={handleChange('lyricists')}
              onBlur={handleBlur('lyricists')}
              placeholder="カンマ区切りで複数入力可"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* 作曲家 */}
          <div className="song-form__field">
            <label htmlFor="composers" className="song-form__label">
              作曲
            </label>
            <input
              type="text"
              id="composers"
              className="song-form__input"
              value={formData.composers}
              onChange={handleChange('composers')}
              onBlur={handleBlur('composers')}
              placeholder="カンマ区切りで複数入力可"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* 編曲家 */}
          <div className="song-form__field">
            <label htmlFor="arrangers" className="song-form__label">
              編曲
            </label>
            <input
              type="text"
              id="arrangers"
              className="song-form__input"
              value={formData.arrangers}
              onChange={handleChange('arrangers')}
              onBlur={handleBlur('arrangers')}
              placeholder="カンマ区切りで複数入力可"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
        </section>

        {/* リリース情報セクション */}
        <section className="song-form__section">
          <h3 className="song-form__section-title">リリース情報</h3>

          <div className="song-form__row song-form__row--three">
            {/* 発売年 */}
            <div
              className={`song-form__field ${shouldShowError('releaseYear') ? 'song-form__field--error' : ''}`}
            >
              <label htmlFor="releaseYear" className="song-form__label">
                発売年
              </label>
              <input
                type="text"
                id="releaseYear"
                className="song-form__input"
                value={formData.releaseYear}
                onChange={handleChange('releaseYear')}
                onBlur={handleBlur('releaseYear')}
                placeholder="例: 2024"
                disabled={isSubmitting}
                autoComplete="off"
                inputMode="numeric"
              />
              {shouldShowError('releaseYear') && (
                <p className="song-form__error">{errors.releaseYear}</p>
              )}
            </div>

            {/* 発売月 */}
            <div
              className={`song-form__field ${shouldShowError('releaseMonth') ? 'song-form__field--error' : ''}`}
            >
              <label htmlFor="releaseMonth" className="song-form__label">
                月
              </label>
              <input
                type="text"
                id="releaseMonth"
                className="song-form__input"
                value={formData.releaseMonth}
                onChange={handleChange('releaseMonth')}
                onBlur={handleBlur('releaseMonth')}
                placeholder="例: 3"
                disabled={isSubmitting}
                autoComplete="off"
                inputMode="numeric"
              />
              {shouldShowError('releaseMonth') && (
                <p className="song-form__error">{errors.releaseMonth}</p>
              )}
            </div>

            {/* 発売日 */}
            <div
              className={`song-form__field ${shouldShowError('releaseDay') ? 'song-form__field--error' : ''}`}
            >
              <label htmlFor="releaseDay" className="song-form__label">
                日
              </label>
              <input
                type="text"
                id="releaseDay"
                className="song-form__input"
                value={formData.releaseDay}
                onChange={handleChange('releaseDay')}
                onBlur={handleBlur('releaseDay')}
                placeholder="例: 15"
                disabled={isSubmitting}
                autoComplete="off"
                inputMode="numeric"
              />
              {shouldShowError('releaseDay') && (
                <p className="song-form__error">{errors.releaseDay}</p>
              )}
            </div>
          </div>

          {/* シングル名 */}
          <div className="song-form__field">
            <label htmlFor="singleName" className="song-form__label">
              シングル名
            </label>
            <input
              type="text"
              id="singleName"
              className="song-form__input"
              value={formData.singleName}
              onChange={handleChange('singleName')}
              onBlur={handleBlur('singleName')}
              placeholder="収録シングル名"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* アルバム名 */}
          <div className="song-form__field">
            <label htmlFor="albumName" className="song-form__label">
              アルバム名
            </label>
            <input
              type="text"
              id="albumName"
              className="song-form__input"
              value={formData.albumName}
              onChange={handleChange('albumName')}
              onBlur={handleBlur('albumName')}
              placeholder="収録アルバム名"
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
        </section>

        {/* 埋め込みコンテンツセクション */}
        <section className="song-form__section">
          <h3 className="song-form__section-title">埋め込みコンテンツ</h3>

          <div className="song-form__embeds">
            {formData.musicServiceEmbeds.map((item, index) => (
              <div key={index} className="song-form__embed-item">
                <div className="song-form__embed-fields">
                  <div className="song-form__field">
                    <input
                      type="text"
                      className="song-form__input song-form__input--embed-label"
                      value={item.label || ''}
                      onChange={(e) =>
                        handleEmbedChange(index, 'label', e.target.value)
                      }
                      placeholder="ラベル（例: Spotify, YouTube）"
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </div>
                  <div className="song-form__field">
                    <textarea
                      className="song-form__textarea song-form__textarea--embed"
                      value={item.embed}
                      onChange={(e) =>
                        handleEmbedChange(index, 'embed', e.target.value)
                      }
                      placeholder="iframeタグを貼り付け"
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="song-form__embed-remove"
                  onClick={() => handleRemoveEmbed(index)}
                  disabled={isSubmitting}
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
              className="song-form__embed-add"
              onClick={handleAddEmbed}
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              埋め込みコンテンツを追加
            </button>
          </div>
          <p className="song-form__hint">
            Spotify、YouTube等の埋め込みiframeタグを貼り付けてください
          </p>
        </section>

        {/* 外部リンクセクション */}
        <section className="song-form__section">
          <h3 className="song-form__section-title">外部リンク</h3>

          <div className="song-form__urls">
            {formData.detailPageUrls.map((link, index) => (
              <div key={index} className="song-form__url-item">
                <div className="song-form__url-fields">
                  <div
                    className={`song-form__field ${errors.detailPageUrls?.[index] ? 'song-form__field--error' : ''}`}
                  >
                    <input
                      type="url"
                      className="song-form__input"
                      value={link.url}
                      onChange={(e) =>
                        handleUrlChange(index, 'url', e.target.value)
                      }
                      placeholder="URL"
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                    {errors.detailPageUrls?.[index] && (
                      <p className="song-form__error">
                        {errors.detailPageUrls[index]}
                      </p>
                    )}
                  </div>
                  <div className="song-form__field">
                    <input
                      type="text"
                      className="song-form__input song-form__input--label"
                      value={link.label || ''}
                      onChange={(e) =>
                        handleUrlChange(index, 'label', e.target.value)
                      }
                      placeholder="ラベル（任意）"
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="song-form__url-remove"
                  onClick={() => handleRemoveUrl(index)}
                  disabled={isSubmitting}
                  aria-label="リンクを削除"
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
              className="song-form__url-add"
              onClick={handleAddUrl}
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
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              リンクを追加
            </button>
          </div>
        </section>
      </div>

      {/* アクションボタン */}
      <div className="song-form__actions">
        <button
          type="button"
          className="song-form__cancel-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="song-form__submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="song-form__spinner" />
              保存中...
            </>
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

export default SongForm
