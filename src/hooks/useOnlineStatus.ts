/**
 * useOnlineStatus フック
 * オンライン/オフライン状態を監視
 * 
 * Requirements: 15.4
 */

import { useState, useEffect, useRef } from 'react'
import { errorService } from '../services/errorService'
import { trackConnectivityChange } from '../services/analyticsService'

/**
 * オンライン/オフライン状態を監視するフック
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(errorService.getOnlineStatus())
  const isFirstRender = useRef(true)

  useEffect(() => {
    // errorServiceのリスナーを登録
    const unsubscribe = errorService.addOnlineListener((online) => {
      setIsOnline(online)
      
      // 初回レンダリング時はトラッキングしない（ページ読み込み時の状態）
      if (!isFirstRender.current) {
        trackConnectivityChange(online)
      }
      isFirstRender.current = false
    })

    return unsubscribe
  }, [])

  return isOnline
}

export default useOnlineStatus
