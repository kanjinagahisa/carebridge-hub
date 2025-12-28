/**
 * 通知機能のユーティリティ関数
 * v1ではモック実装
 */

/**
 * プッシュ通知を送信（モック実装）
 * @param userId - ユーザーID
 * @param title - 通知タイトル
 * @param body - 通知本文
 * @param data - 追加データ（オプション）
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  console.log('[Notifications] Mock push notification:', {
    userId,
    title,
    body,
    data,
  })

  // v1ではモック実装
  // 将来的にはFirebase Cloud Messagingを使用
  // 現在はコンソールログのみ出力

  // ブラウザのNotification APIが利用可能な場合、ローカル通知を表示
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-192x192.png', // PWAアイコンがあれば
        data,
      })
    } else if (Notification.permission !== 'denied') {
      // 許可を求める（初回のみ）
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/icon-192x192.png',
            data,
          })
        }
      })
    }
  }

  // アプリバッジを更新（PWA対応ブラウザのみ）
  if (typeof window !== 'undefined' && 'navigator' in window && 'setAppBadge' in navigator) {
    try {
      // 未読数を取得してバッジに表示（簡易版）
      await (navigator as any).setAppBadge(1)
    } catch (error) {
      console.error('[Notifications] Failed to set app badge:', error)
    }
  }
}

/**
 * 投稿作成時に通知を送信
 * @param postId - 投稿ID
 * @param facilityId - 施設ID
 * @param authorName - 投稿者名
 * @param postBody - 投稿本文（プレビュー用）
 * @param postType - 投稿タイプ（'group' | 'client'）
 * @param targetName - グループ名または利用者名
 */
export async function notifyNewPost(
  postId: string,
  facilityId: string,
  authorName: string,
  postBody: string,
  postType: 'group' | 'client',
  targetName: string
): Promise<void> {
  const title = postType === 'client' 
    ? `利用者「${targetName}」に新しい投稿`
    : `グループ「${targetName}」に新しい投稿`
  
  const bodyPreview = postBody.length > 50
    ? postBody.substring(0, 50) + '...'
    : postBody

  // 施設内の全ユーザーに通知を送信（モック）
  // 実際の実装では、push_notificationsテーブルにジョブを積む
  console.log('[Notifications] New post notification:', {
    postId,
    facilityId,
    title,
    body: `${authorName}: ${bodyPreview}`,
  })

  // モック実装：コンソールログのみ
  // 将来的には以下のような実装になる：
  // 1. push_notificationsテーブルにジョブを挿入
  // 2. バックグラウンドワーカーがジョブを処理
  // 3. Firebase Cloud Messaging経由でプッシュ通知を送信
}






