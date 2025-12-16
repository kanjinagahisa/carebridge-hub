'use client'

import { useState, useEffect } from 'react'
import { urlBase64ToUint8Array } from '@/lib/webpush/vapid'

interface PushNotificationToggleProps {
  className?: string
}

export default function PushNotificationToggle({ className }: PushNotificationToggleProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // クライアントサイドでのみマウント状態を管理
  useEffect(() => {
    setIsMounted(true)
    console.log('[PushNotificationToggle] Component mounted')
  }, [])

  // ブラウザのサポート確認と初期状態の取得
  useEffect(() => {
    if (typeof window === 'undefined') {
      console.log('[PushNotificationToggle] window is undefined (SSR)')
      return
    }

    console.log('[PushNotificationToggle] Checking browser support...')
    console.log('[PushNotificationToggle] serviceWorker in navigator:', 'serviceWorker' in navigator)
    console.log('[PushNotificationToggle] PushManager in window:', 'PushManager' in window)

    // Service WorkerとPush APIのサポート確認
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[PushNotificationToggle] Browser does not support Web Push')
      setIsSupported(false)
      return
    }

    console.log('[PushNotificationToggle] Browser supports Web Push')
    setIsSupported(true)

    // Service Workerの登録（既存の登録があれば再利用）
    const registerServiceWorker = async () => {
      try {
        // 既に登録されているか確認
        const registration = await navigator.serviceWorker.getRegistration('/sw.js')
        if (!registration) {
          // 未登録の場合のみ登録
          await navigator.serviceWorker.register('/sw.js')
        }
        // 購読状態を確認
        checkSubscriptionStatus()
      } catch (error) {
        console.error('[PushNotificationToggle] Error registering service worker:', error)
        setIsSupported(false)
      }
    }

    registerServiceWorker()
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('[PushNotificationToggle] Error checking subscription:', error)
      setIsSubscribed(false)
    }
  }

  const handleSubscribe = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      // 1. 通知許可の確認
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setMessage({ type: 'error', text: '通知の許可が必要です。ブラウザの設定を確認してください。' })
          setIsLoading(false)
          return
        }
      } else if (Notification.permission === 'denied') {
        setMessage({ type: 'error', text: '通知が拒否されています。ブラウザの設定から許可してください。' })
        setIsLoading(false)
        return
      }

      // 2. Service Workerの準備
      const registration = await navigator.serviceWorker.ready

      // 3. 既存の購読を確認（二重登録防止）
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        // 4. VAPID公開鍵を取得
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          throw new Error('VAPID公開鍵が設定されていません')
        }

        // 5. 新しい購読を作成
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        })
      }

      // 6. サーバーに購読情報を送信
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '購読の保存に失敗しました' }))
        throw new Error(errorData.message || '購読の保存に失敗しました')
      }

      setIsSubscribed(true)
      setMessage({ type: 'success', text: '通知をONにしました' })
    } catch (error: any) {
      console.error('[PushNotificationToggle] Error subscribing:', error)
      setMessage({ type: 'error', text: error.message || '通知の有効化に失敗しました' })
      setIsSubscribed(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      // 1. Service Workerから購読を取得
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // 既に解除されている場合、サーバー側のデータだけ削除
        setMessage({ type: 'error', text: '既に通知はOFFになっています' })
        setIsLoading(false)
        return
      }

      const endpoint = subscription.endpoint

      // 2. ブラウザ側で購読を解除
      await subscription.unsubscribe()

      // 3. サーバー側から購読情報を削除
      const response = await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '購読の削除に失敗しました' }))
        throw new Error(errorData.message || '購読の削除に失敗しました')
      }

      setIsSubscribed(false)
      setMessage({ type: 'success', text: '通知をOFFにしました' })
    } catch (error: any) {
      console.error('[PushNotificationToggle] Error unsubscribing:', error)
      setMessage({ type: 'error', text: error.message || '通知の無効化に失敗しました' })
    } finally {
      setIsLoading(false)
    }
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // サーバーサイドレンダリング時は何も表示しない
  if (!isMounted) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 ${className || ''}`}>
        <p className="text-sm text-gray-600">読み込み中...</p>
      </div>
    )
  }

  // サポートされていない場合（デバッグ用：常に表示）
  if (!isSupported) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-4 ${className || ''}`}>
        <h3 className="font-semibold text-gray-900 mb-2">プッシュ通知</h3>
        <p className="text-sm text-gray-600">
          このブラウザではWeb Push通知に対応していません。
        </p>
        <p className="text-xs text-gray-500 mt-2">
          デバッグ: Service Worker={typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? '✓' : '✗'}, PushManager={typeof window !== 'undefined' && 'PushManager' in window ? '✓' : '✗'}
        </p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">プッシュ通知</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isSubscribed ? '通知はONになっています' : '通知はOFFになっています'}
          </p>
        </div>
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isSubscribed ? 'bg-primary' : 'bg-gray-300'}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 p-2 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}

