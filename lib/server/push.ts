/**
 * Web Push通知送信のサーバー側ロジック
 */

import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * VAPID_SUBJECTを整形する
 * - emailだけの場合は `mailto:` を付ける
 * - 既に `mailto:` や `https://` で始まる場合はそのまま使用
 */
function normalizeVapidSubject(subject: string | undefined): string {
  if (!subject) {
    return 'mailto:admin@example.com'
  }

  // 既に mailto: や https:// で始まる場合はそのまま返す
  if (subject.startsWith('mailto:') || subject.startsWith('https://')) {
    return subject
  }

  // email形式かどうかを簡易チェック（@が含まれているか）
  if (subject.includes('@')) {
    return `mailto:${subject}`
  }

  // それ以外の場合は mailto: を付ける
  return `mailto:${subject}`
}

/**
 * VAPIDキーを環境変数から取得（リクエスト時に取得）
 */
function getVapidKeys(): {
  publicKey: string | undefined
  privateKey: string | undefined
  subject: string
} {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = normalizeVapidSubject(process.env.VAPID_SUBJECT)

  return {
    publicKey,
    privateKey,
    subject,
  }
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

  // VAPIDキーを取得（リクエスト時に取得）
  const { publicKey, privateKey, subject } = getVapidKeys()

  // VAPIDキーが設定されていない場合はスキップ
  if (!publicKey || !privateKey) {
    console.warn('[push] VAPID keys not configured, skipping push notifications')
    return result
  }

  // VAPIDキーを初期化（リクエスト時に実行、try/catchで包む）
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
  } catch (error: any) {
    console.error('[push] Failed to set VAPID details:', error)
    console.error('[push] VAPID subject:', subject)
    console.error('[push] VAPID public key exists:', !!publicKey)
    console.error('[push] VAPID private key exists:', !!privateKey)
    // エラーが発生しても処理を続行（通知送信はスキップ）
    return result
  }

  const adminSupabase = createAdminClient()

  try {
    // 同じfacilityの購読者を取得（投稿者本人は除外）
    const { data: subscriptions, error: fetchError } = await adminSupabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, deleted')
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

    // 送信直前ログ：取得結果の詳細を出力
    const deletedCount = subscriptions.filter((s) => s.deleted === true).length
    const endpointSamples = subscriptions
      .slice(0, 3)
      .map((s) => s.endpoint?.substring(0, 50) + (s.endpoint && s.endpoint.length > 50 ? '...' : ''))
    console.log('[push] Subscription fetch result:', {
      facilityId,
      authorId,
      totalCount: subscriptions.length,
      deletedTrueCount: deletedCount,
      endpointSamples,
    })

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

