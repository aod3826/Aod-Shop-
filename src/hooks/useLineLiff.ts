import { useState, useEffect, useCallback } from 'react'
import liff from '@line/liff'
import { useUserStore } from '@/store/userStore'
import toast from 'react-hot-toast'

export const useLineLiff = () => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [liffError, setLiffError] = useState<string | null>(null)
  const { login } = useUserStore()

  const initLiff = useCallback(async () => {
    try {
      const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID
      
      if (!LIFF_ID) {
        throw new Error('LINE LIFF ID is not configured')
      }

      await liff.init({ liffId: LIFF_ID })
      
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }

      const profile = await liff.getProfile()
      
      // Login user with LINE profile
      await login(profile.userId, profile.displayName)
      
      setIsInitialized(true)
      setLiffError(null)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize LINE'
      console.error('LINE LIFF Error:', error)
      setLiffError(errorMessage)
      toast.error('Failed to connect with LINE')
    }
  }, [login])

  const shareToLine = useCallback(async (text: string, url?: string) => {
    if (!liff.isApiAvailable('shareTargetPicker')) {
      toast.error('Sharing is not available in this environment')
      return
    }

    try {
      await liff.shareTargetPicker([
        {
          type: 'text',
          text: text + (url ? `\n${url}` : ''),
        },
      ])
    } catch (error) {
      console.error('Share error:', error)
      toast.error('Failed to share')
    }
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!liff.isInClient()) {
      return
    }

    try {
      await liff.sendMessages([
        {
          type: 'text',
          text: text,
        },
      ])
    } catch (error) {
      console.error('Send message error:', error)
    }
  }, [])

  const closeApp = useCallback(() => {
    if (liff.isInClient()) {
      liff.closeWindow()
    }
  }, [])

  const getContext = useCallback(() => {
    if (isInitialized) {
      return liff.getContext()
    }
    return null
  }, [isInitialized])

  useEffect(() => {
    initLiff()
  }, [initLiff])

  return {
    isInitialized,
    liffError,
    initLiff,
    shareToLine,
    sendMessage,
    closeApp,
    getContext,
    isInClient: liff.isInClient(),
    isLoggedIn: liff.isLoggedIn(),
  }
}
