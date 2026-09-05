import { downloadPng } from './pngService'
import { buildXIntent, openExternalNoOpener } from './xShareService'

export type ImageShareResult =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'manual-attachment-required' }

export type ImageShareErrorCode = 'file_share_failed'

/** Error exposed by the Web Share boundary without browser exception details. */
export class ImageShareError extends Error {
  readonly code: ImageShareErrorCode

  constructor(code: ImageShareErrorCode) {
    super(code)
    this.name = 'ImageShareError'
    this.code = code
  }
}

export interface ShareBrowserDependencies {
  navigatorLike: Navigator
  downloadPng: typeof downloadPng
  buildXIntent: typeof buildXIntent
  openExternalNoOpener: typeof openExternalNoOpener
}

function createDefaultDependencies(): ShareBrowserDependencies {
  return {
    navigatorLike: navigator,
    downloadPng,
    buildXIntent,
    openExternalNoOpener,
  }
}

/**
 * Checks file-sharing support with the actual File that will be shared.
 * Missing APIs, rejected payloads, and browser exceptions are unsupported.
 */
export function supportsFileShare(file: File, navigatorLike: Navigator): boolean {
  try {
    return (
      typeof navigatorLike.share === 'function' &&
      typeof navigatorLike.canShare === 'function' &&
      navigatorLike.canShare({ files: [file] }) === true
    )
  } catch {
    return false
  }
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  )
}

function fileShareFailed(): ImageShareError {
  return new ImageShareError('file_share_failed')
}

/**
 * Shares a PNG File through the OS share sheet when supported. Otherwise it
 * downloads the PNG first, then opens an X intent for manual attachment.
 */
export async function shareImage(
  file: File,
  postText: string,
  dependencies: ShareBrowserDependencies = createDefaultDependencies()
): Promise<ImageShareResult> {
  const { navigatorLike } = dependencies

  if (supportsFileShare(file, navigatorLike)) {
    try {
      await navigatorLike.share({ files: [file], text: postText })
      return { kind: 'shared' }
    } catch (error) {
      if (isAbortError(error)) {
        return { kind: 'cancelled' }
      }

      throw fileShareFailed()
    }
  }

  dependencies.downloadPng(file, file.name)
  const intent = dependencies.buildXIntent({ text: postText })
  dependencies.openExternalNoOpener(intent)

  return { kind: 'manual-attachment-required' }
}

export type ImageSaveResult =
  | { kind: 'shared' }
  | { kind: 'downloaded' }
  | { kind: 'cancelled' }

export interface ImageSaveBrowserDependencies {
  navigatorLike: Navigator
  downloadPng: typeof downloadPng
}

function createDefaultImageSaveDependencies(): ImageSaveBrowserDependencies {
  return {
    navigatorLike: navigator,
    downloadPng,
  }
}

/** Opens the OS image share sheet when available, or downloads the PNG as fallback. */
export async function shareOrDownloadImage(
  file: File,
  dependencies: ImageSaveBrowserDependencies = createDefaultImageSaveDependencies(),
): Promise<ImageSaveResult> {
  const { navigatorLike } = dependencies

  if (supportsFileShare(file, navigatorLike)) {
    try {
      await navigatorLike.share({ files: [file] })
      return { kind: 'shared' }
    } catch (error) {
      if (isAbortError(error)) {
        return { kind: 'cancelled' }
      }

      throw fileShareFailed()
    }
  }

  dependencies.downloadPng(file, file.name)
  return { kind: 'downloaded' }
}
