/**
 * エラーハンドリングサービス
 * Music Bubble Explorer V2
 * 
 * ネットワークエラー表示、リトライ機能、オフラインモードを管理
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import type { AppError, NetworkError, DataError, ValidationError } from '../types'

// エラーログの最大保持数
const MAX_ERROR_LOGS = 50

// リトライ設定
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
}

interface ErrorLog {
  timestamp: string
  type: string
  message: string
  context?: string
}

/**
 * エラーハンドリングサービスクラス
 */
export class ErrorService {
  private static instance: ErrorService
  private errorLogs: ErrorLog[] = []
  private isOnline: boolean = navigator.onLine
  private onlineListeners: Set<(isOnline: boolean) => void> = new Set()

  private constructor() {
    this.setupOnlineListener()
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  /**
   * オンライン/オフライン状態の監視を設定
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyOnlineListeners(true)
      if (import.meta.env.DEV) {
        console.log('🌐 ErrorService: オンラインに復帰しました')
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyOnlineListeners(false)
      if (import.meta.env.DEV) {
        console.log('🌐 ErrorService: オフラインになりました')
      }
    })
  }

  /**
   * オンライン状態変更リスナーに通知
   */
  private notifyOnlineListeners(isOnline: boolean): void {
    this.onlineListeners.forEach((listener) => listener(isOnline))
  }

  /**
   * オンライン状態変更リスナーを登録
   */
  public addOnlineListener(listener: (isOnline: boolean) => void): () => void {
    this.onlineListeners.add(listener)
    return () => this.onlineListeners.delete(listener)
  }

  /**
   * 現在のオンライン状態を取得
   */
  public getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * ネットワークエラーを作成
   */
  public createNetworkError(message: string): NetworkError {
    return {
      type: 'network',
      message,
      retryable: true,
    }
  }

  /**
   * データエラーを作成
   */
  public createDataError(message: string, retryable: boolean = false): DataError {
    return {
      type: 'data',
      message,
      retryable,
    }
  }

  /**
   * バリデーションエラーを作成
   */
  public createValidationError(field: string, message: string): ValidationError {
    return {
      type: 'validation',
      field,
      message,
    }
  }


  /**
   * エラーをログに記録（機密情報を除外）
   * Requirements: 15.3
   */
  public logError(error: unknown, context?: string): void {
    const sanitizedError = this.sanitizeError(error)
    
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: this.getErrorType(error),
      message: sanitizedError,
      context,
    }

    this.errorLogs.push(errorLog)

    // 最大保持数を超えたら古いログを削除
    if (this.errorLogs.length > MAX_ERROR_LOGS) {
      this.errorLogs = this.errorLogs.slice(-MAX_ERROR_LOGS)
    }

    // 開発環境ではコンソールにも出力
    if (import.meta.env.DEV) {
      console.error('🚨 ErrorService:', {
        ...errorLog,
        originalError: error,
      })
    } else {
      // 本番環境では機密情報を除外してログ出力
      console.error('🚨 Error:', errorLog.message)
    }
  }

  /**
   * エラーから機密情報を除外
   */
  private sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // APIキーやトークンを含む可能性のあるパターンを除外
      let message = error.message
      message = message.replace(/api[_-]?key[=:]\s*["']?[^"'\s]+["']?/gi, 'api_key=[REDACTED]')
      message = message.replace(/token[=:]\s*["']?[^"'\s]+["']?/gi, 'token=[REDACTED]')
      message = message.replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]')
      message = message.replace(/secret[=:]\s*["']?[^"'\s]+["']?/gi, 'secret=[REDACTED]')
      message = message.replace(/auth[=:]\s*["']?[^"'\s]+["']?/gi, 'auth=[REDACTED]')
      return message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    return 'Unknown error occurred'
  }

  /**
   * エラータイプを判定
   */
  private getErrorType(error: unknown): string {
    if (error instanceof TypeError) {
      return 'TypeError'
    }
    if (error instanceof SyntaxError) {
      return 'SyntaxError'
    }
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'NetworkError'
      }
      if (error.message.includes('Firebase') || error.message.includes('Firestore')) {
        return 'FirebaseError'
      }
      return 'Error'
    }
    return 'UnknownError'
  }

  /**
   * エラーがネットワークエラーかどうかを判定
   */
  public isNetworkError(error: unknown): boolean {
    if (!this.isOnline) {
      return true
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('failed to fetch') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('offline')
      )
    }

    return false
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを取得
   * Requirements: 15.1
   */
  public getUserFriendlyMessage(error: unknown): string {
    if (!this.isOnline) {
      return 'インターネット接続がありません。オフラインモードで動作しています。'
    }

    if (this.isNetworkError(error)) {
      return 'ネットワークエラーが発生しました。接続を確認して再試行してください。'
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      if (message.includes('firebase') || message.includes('firestore')) {
        return 'データベースへの接続に失敗しました。しばらく待ってから再試行してください。'
      }
      
      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'アクセス権限がありません。'
      }
      
      if (message.includes('not found')) {
        return 'データが見つかりませんでした。'
      }
    }

    return 'エラーが発生しました。再試行してください。'
  }


  /**
   * リトライ付きで非同期関数を実行
   * Requirements: 15.2
   */
  public async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      onRetry?: (attempt: number, error: unknown) => void
    } = {}
  ): Promise<T> {
    const {
      maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
      baseDelay = DEFAULT_RETRY_CONFIG.baseDelay,
      maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
      onRetry,
    } = options

    let lastError: unknown

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        this.logError(error, `Retry attempt ${attempt + 1}/${maxRetries + 1}`)

        if (attempt < maxRetries) {
          // 指数バックオフでリトライ間隔を計算
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
          
          if (onRetry) {
            onRetry(attempt + 1, error)
          }

          if (import.meta.env.DEV) {
            console.log(`🔄 ErrorService: ${delay}ms後にリトライします (${attempt + 1}/${maxRetries})`)
          }

          await this.sleep(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * エラーログを取得
   */
  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs]
  }

  /**
   * エラーログをクリア
   */
  public clearErrorLogs(): void {
    this.errorLogs = []
  }

  /**
   * AppErrorからエラーメッセージを取得
   */
  public getAppErrorMessage(error: AppError): string {
    switch (error.type) {
      case 'network':
        return error.message || 'ネットワークエラーが発生しました'
      case 'data':
        return error.message || 'データエラーが発生しました'
      case 'validation':
        return `${error.field}: ${error.message}`
      default:
        return 'エラーが発生しました'
    }
  }

  /**
   * AppErrorがリトライ可能かどうかを判定
   */
  public isRetryable(error: AppError): boolean {
    return error.type === 'network' || (error.type === 'data' && error.retryable)
  }
}

// シングルトンインスタンスをエクスポート
export const errorService = ErrorService.getInstance()
