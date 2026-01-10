/**
 * useOnlineStatus フック
 * オンライン/オフライン状態を監視
 * 
 * Requirements: 15.4
 */

import { useState, useEffect } from 'react'
import { errorService } from '../services/errorService'

/**
 * オンライン/オフライン状態を監視するフック
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(errorService.getOnlineStatus())

  useEffect(() => {
    // errorServiceのリスナーを登録
    const unsubscribe = errorService.addOnlineListener((online) => {
      setIsOnline(online)
    })

    return unsubscribe
  }, [])

  return isOnline
}

export default useOnlineStatus
