export interface SetlistBingoOperationGate {
  /**
   * Starts the operation only when no earlier operation is still unsettled.
   * Returns undefined when the trigger is suppressed.
   */
  run<T>(operation: () => Promise<T>): Promise<T> | undefined
  isInFlight(): boolean
}

/**
 * Serializes image save/share triggers without changing their result or error.
 * The gate remains locked until the started operation settles, including
 * successful, failed, and user-cancelled results.
 */
export function createSetlistBingoOperationGate(): SetlistBingoOperationGate {
  let inFlight = false

  return {
    run<T>(operation: () => Promise<T>): Promise<T> | undefined {
      if (inFlight) {
        return undefined
      }

      inFlight = true

      return (async () => {
        try {
          return await operation()
        } finally {
          inFlight = false
        }
      })()
    },

    isInFlight(): boolean {
      return inFlight
    },
  }
}
