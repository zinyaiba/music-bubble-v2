import { describe, expect, it, vi } from 'vitest'
import {
  X_INTENT_URL,
  XShareError,
  buildXIntent,
  createXPostText,
  openExternalNoOpener,
} from './xShareService'

function expectBlocked(action: () => void): void {
  let error: unknown

  try {
    action()
  } catch (caughtError) {
    error = caughtError
  }

  expect(error).toBeInstanceOf(XShareError)
  expect(error).toMatchObject({
    code: 'x_intent_blocked',
    message: 'x_intent_blocked',
  })
}

describe('X post text', () => {
  it('formats a URL post with the performance name, URL, and hashtags in order', () => {
    const performanceName = '<script>記念公演</script> 🎤'
    const shareUrl =
      'https://example.com/music-bubble-v2/setlist-bingo/preview?b=encoded'

    expect(createXPostText(performanceName, shareUrl)).toBe(
      `【${performanceName}】\n` +
        '私のセトリ予想はこれです！\n\n' +
        `${shareUrl}\n\n` +
        '#マロバブ #マロンで予想して',
    )
  })

  it('omits only the URL block for a URL-free post', () => {
    expect(createXPostText('Anniversary Live')).toBe(
      '【Anniversary Live】\n\n' +
        '私のセトリ予想はこれです！\n\n' +
        '#マロバブ #マロンで予想して',
    )
  })
})

describe('buildXIntent', () => {
  it('uses the fixed HTTPS endpoint with exactly one encoded text parameter', () => {
    const text = '予想 & #タグ + emoji 🫧?'
    const intent = new URL(buildXIntent({ text }))
    const endpoint = new URL(X_INTENT_URL)

    expect(intent.origin).toBe(endpoint.origin)
    expect(intent.pathname).toBe(endpoint.pathname)
    expect(intent.protocol).toBe('https:')
    expect(intent.searchParams.getAll('text')).toEqual([text])
    expect(intent.searchParams.has('url')).toBe(false)
    expect(Array.from(intent.searchParams.keys())).toEqual(['text'])
    expect(intent.hash).toBe('')
  })

  it('places a shared URL exactly once in the dedicated url parameter', () => {
    const text = 'URLを共有します & 続き'
    const sharedUrl =
      'https://example.com/music-bubble-v2/setlist-bingo/preview?b=a_b-c&text=not-an-intent#カード'
    const intent = new URL(buildXIntent({ text, url: sharedUrl }))

    expect(intent.searchParams.getAll('text')).toEqual([text])
    expect(intent.searchParams.getAll('url')).toEqual([sharedUrl])
    expect(Array.from(intent.searchParams.keys())).toEqual(['text', 'url'])
  })
})

describe('openExternalNoOpener', () => {
  it('opens a blank context, clears its opener, and then navigates it', () => {
    const replace = vi.fn()
    const close = vi.fn()
    const handle = {
      opener: { source: true },
      location: { replace },
      close,
    } as unknown as Window
    const openFn = vi.fn(() => handle)
    const intent = buildXIntent({ text: createXPostText('テスト公演') })

    openExternalNoOpener(intent, openFn)

    expect(openFn).toHaveBeenCalledOnce()
    expect(openFn).toHaveBeenCalledWith('about:blank', '_blank')
    expect(handle.opener).toBeNull()
    expect(replace).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith(intent)
    expect(close).not.toHaveBeenCalled()
  })

  it('maps a blocked popup to x_intent_blocked', () => {
    const openFn = vi.fn(() => null)

    expectBlocked(() => openExternalNoOpener(X_INTENT_URL, openFn))
    expect(openFn).toHaveBeenCalledOnce()
  })

  it('maps browser exceptions to x_intent_blocked without exposing details', () => {
    const openFn = vi.fn(() => {
      throw new Error('browser popup detail')
    })

    expectBlocked(() => openExternalNoOpener(X_INTENT_URL, openFn))
  })

  it('maps failure to clear opener to x_intent_blocked', () => {
    const handle = {} as Window
    Object.defineProperty(handle, 'opener', {
      configurable: true,
      set: () => {
        throw new Error('cross-origin browser detail')
      },
    })

    expectBlocked(() =>
      openExternalNoOpener(X_INTENT_URL, vi.fn(() => handle)),
    )
  })
})
