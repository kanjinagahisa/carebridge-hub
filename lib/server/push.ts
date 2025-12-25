/**
 * Web Push通知送信のサーバー側ロジック
 */

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

// VAPIDキーを環境変数から取得
// サーバー側でも NEXT_PUBLIC_VAPID_PUBLIC_KEY を使用（クライアント側と統一）
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

// VAPIDキーが設定されている場合のみ初期化
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

interface PushNotificationPayload {
  title: string
  body: string
  url: string
}

interface SendPushResult {
  success: number
  failed: number
  deleted: number
}

/**
 * 同じfacilityの購読者にWeb Push通知を送信
 * @param facilityId - 施設ID
 * @param authorId - 投稿者ID（本人は除外）
 * @param payload - 通知ペイロード
 * @returns 送信結果
 */
export async function sendPushNotificationsToFacility(
  facilityId: string,
  authorId: string,
  payload: PushNotificationPayload
): Promise<SendPushResult> {
  const result: SendPushResult = {
    success: 0,
    failed: 0,
    deleted: 0,
  }

  // VAPIDキーが設定されていない場合はスキップ
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[push] VAPID keys not configured, skipping push notifications')
    return result
  }

  const adminSupabase = createAdminClient()

  try {
    // 同じfacilityの購読者を取得（投稿者本人は除外）
    const { data: subscriptions, error: fetchError } = await adminSupabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .eq('facility_id', facilityId)
      .neq('user_id', authorId)

    if (fetchError) {
      console.error('[push] Failed to fetch subscriptions:', fetchError)
      return result
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[push] No subscriptions found for facility:', facilityId)
      return result
    }

    console.log(`[push] Sending notifications to ${subscriptions.length} subscribers`)

    // 各購読者に通知を送信
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        }

        const notificationPayload = JSON.stringify(payload)

        await webpush.sendNotification(pushSubscription, notificationPayload)
        result.success++
        console.log(`[push] Successfully sent notification to user ${subscription.user_id}`)
      } catch (error: any) {
        // 410 Gone または 404 Not Found の場合は購読情報を削除
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(
            `[push] Subscription expired (${error.statusCode}), deleting: ${subscription.endpoint}`
          )
          try {
            await adminSupabase.from('push_subscriptions').delete().eq('id', subscription.id)
            result.deleted++
          } catch (deleteError) {
            console.error('[push] Failed to delete expired subscription:', deleteError)
          }
        } else {
          console.error(`[push] Failed to send notification to user ${subscription.user_id}:`, error)
          result.failed++
        }
      }
    })

    await Promise.allSettled(sendPromises)

    console.log('[push] Notification send result:', result)
  } catch (error) {
    console.error('[push] Unexpected error:', error)
  }

  return result
}

