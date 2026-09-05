import { describe, expect, it, vi } from 'vitest'
import {
  ImageShareError,
  shareImage,
  supportsFileShare,
  type ShareBrowserDependencies,
} from './imageShareService'

function createPngFile(): File {
  return new File(['png bytes'], 'setlist-bingo.png', {
    type: 'image/png',
  })
}

function createNavigator(
  canShare: (data?: ShareData) => boolean,
  share: (data?: ShareData) => Promise<void>
): Navigator {
  return { canShare, share } as Navigator
}

function createDependencies(navigatorLike: Navigator): ShareBrowserDependencies {
  return {
    navigatorLike,
    downloadPng: vi.fn(),
    buildXIntent: vi.fn(
      ({ text }) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    ),
    openExternalNoOpener: vi.fn(),
  }
}

function expectFileShareFailure(error: unknown): boolean {
  expect(error).toBeInstanceOf(ImageShareError)
  expect(error).toMatchObject({
    code: 'file_share_failed',
    message: 'file_share_failed',
  })
  return true
}

describe('supportsFileShare', () => {
  it('passes the actual File to canShare and requires both share methods', () => {
    const file = createPngFile()
    const canShare = vi.fn(() => true)
    const navigatorLike = createNavigator(
      canShare,
      vi.fn(async () => undefined)
    )

    expect(supportsFileShare(file, navigatorLike)).toBe(true)
    expect(canShare).toHaveBeenCalledOnce()
    expect(canShare).toHaveBeenCalledWith({ files: [file] })

    expect(
      supportsFileShare(file, {
        canShare,
      } as unknown as Navigator)
    ).toBe(false)
    expect(canShare).toHaveBeenCalledOnce()
  })

  it('treats false and canShare exceptions as unsupported', () => {
    const file = createPngFile()

    expect(
      supportsFileShare(
        file,
        createNavigator(
          vi.fn(() => false),
          vi.fn(async () => undefined)
        )
      )
    ).toBe(false)

    expect(
      supportsFileShare(
        file,
        createNavigator(
          vi.fn(() => {
            throw new Error('browser detail')
          }),
          vi.fn(async () => undefined)
        )
      )
    ).toBe(false)
  })
})

describe('shareImage', () => {
  it('shares the same File and post text through Web Share when supported', async () => {
    const file = createPngFile()
    const canShare = vi.fn(() => true)
    const share = vi.fn(async () => undefined)
    const dependencies = createDependencies(createNavigator(canShare, share))

    await expect(shareImage(file, '投稿文', dependencies)).resolves.toEqual({
      kind: 'shared',
    })
    expect(canShare).toHaveBeenCalledWith({ files: [file] })
    expect(share).toHaveBeenCalledOnce()
    expect(share).toHaveBeenCalledWith({ files: [file], text: '投稿文' })
    expect(dependencies.downloadPng).not.toHaveBeenCalled()
    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()
  })

  it('returns cancelled for AbortError without starting manual fallback', async () => {
    const abortError = new DOMException('share cancelled', 'AbortError')
    const share = vi.fn(async () => {
      throw abortError
    })
    const dependencies = createDependencies(
      createNavigator(
        vi.fn(() => true),
        share
      )
    )

    await expect(shareImage(createPngFile(), '投稿文', dependencies)).resolves.toEqual({
      kind: 'cancelled',
    })
    expect(dependencies.downloadPng).not.toHaveBeenCalled()
    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()
  })

  it('maps non-cancel share rejection to file_share_failed', async () => {
    const share = vi.fn(async () => {
      throw new Error('browser share detail')
    })
    const dependencies = createDependencies(
      createNavigator(
        vi.fn(() => true),
        share
      )
    )

    await expect(shareImage(createPngFile(), '投稿文', dependencies)).rejects.toSatisfy(
      expectFileShareFailure
    )
    expect(dependencies.downloadPng).not.toHaveBeenCalled()
    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()
  })

  it('downloads before opening X and requires manual attachment when unsupported', async () => {
    const events: string[] = []
    const file = createPngFile()
    const share = vi.fn(async () => undefined)
    const dependencies = createDependencies(
      createNavigator(
        vi.fn(() => {
          events.push('can-share')
          return false
        }),
        share
      )
    )
    dependencies.downloadPng = vi.fn(() => {
      events.push('download-complete')
    })
    dependencies.buildXIntent = vi.fn(({ text }) => {
      events.push('build-intent')
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    })
    dependencies.openExternalNoOpener = vi.fn(() => {
      events.push('open-intent')
    })

    await expect(shareImage(file, '投稿文', dependencies)).resolves.toEqual({
      kind: 'manual-attachment-required',
    })
    expect(events).toEqual(['can-share', 'download-complete', 'build-intent', 'open-intent'])
    expect(dependencies.downloadPng).toHaveBeenCalledOnce()
    expect(dependencies.downloadPng).toHaveBeenCalledWith(file, file.name)
    expect(dependencies.openExternalNoOpener).toHaveBeenCalledWith(
      'https://twitter.com/intent/tweet?text=%E6%8A%95%E7%A8%BF%E6%96%87'
    )
    expect(share).not.toHaveBeenCalled()
  })

  it('does not build or open an X intent when the PNG download fails', async () => {
    const dependencies = createDependencies(
      createNavigator(
        vi.fn(() => false),
        vi.fn(async () => undefined)
      )
    )
    dependencies.downloadPng = vi.fn(() => {
      throw new Error('download_failed')
    })

    await expect(shareImage(createPngFile(), '投稿文', dependencies)).rejects.toThrow(
      'download_failed'
    )
    expect(dependencies.buildXIntent).not.toHaveBeenCalled()
    expect(dependencies.openExternalNoOpener).not.toHaveBeenCalled()
  })
})
