export const X_INTENT_URL = 'https://twitter.com/intent/tweet' as const
const X_POST_MESSAGE = '私のセトリ予想はこれです！' as const
const X_POST_HASHTAGS = '#マロバブ #マロンで予想して' as const

export type XShareErrorCode = 'x_intent_blocked'

/** Error exposed by the X intent boundary without browser exception details. */
export class XShareError extends Error {
  readonly code: XShareErrorCode

  constructor(code: XShareErrorCode) {
    super(code)
    this.name = 'XShareError'
    this.code = code
  }
}

export interface XIntentParams {
  text: string
  url?: string
}

/** Builds the bingo post text, inserting the share URL before the hashtags when present. */
export function createXPostText(performanceName: string, shareUrl?: string): string {
  const shareUrlBlock = shareUrl ? `\n\n${shareUrl}` : ''

  return (
    `【${performanceName}】\n${X_POST_MESSAGE}` +
    `${shareUrlBlock}\n\n${X_POST_HASHTAGS}`
  )
}

/** Builds an X Web Intent with each value encoded by the URL API. */
export function buildXIntent({ text, url }: XIntentParams): string {
  const intent = new URL(X_INTENT_URL)
  intent.searchParams.set('text', text)

  if (url !== undefined) {
    intent.searchParams.set('url', url)
  }

  return intent.toString()
}

function xIntentBlocked(): XShareError {
  return new XShareError('x_intent_blocked')
}

/**
 * Opens a same-origin blank context, severs its opener, then navigates it.
 * This keeps popup-block detection reliable because browsers may return null
 * for a successfully opened context when `noopener` is passed to window.open.
 */
export function openExternalNoOpener(
  url: string,
  openFn: typeof window.open = window.open,
): void {
  let handle: Window | null = null

  try {
    handle = openFn('about:blank', '_blank')
    if (!handle) {
      throw xIntentBlocked()
    }

    handle.opener = null
    handle.location.replace(url)
  } catch {
    try {
      handle?.close()
    } catch {
      // The original content-safe error is returned even if cleanup is blocked.
    }
    throw xIntentBlocked()
  }
}
