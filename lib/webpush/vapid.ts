/**
 * VAPID公開鍵を base64url から Uint8Array に変換するユーティリティ
 * Web Push API の subscription 作成時に必要
 */

/**
 * base64url形式の文字列をUint8Arrayに変換
 * @param base64url base64url形式の公開鍵文字列
 * @returns Uint8Array形式の公開鍵
 */
export function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}


