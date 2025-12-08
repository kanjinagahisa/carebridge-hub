/**
 * 利用者（Client）関連のユーティリティ関数
 */

/**
 * 生年月日から年齢を計算
 * @param dateOfBirth - 生年月日（YYYY-MM-DD形式の文字列）
 * @returns 年齢（数値）、計算できない場合は null
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null

  try {
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age >= 0 ? age : null
  } catch {
    return null
  }
}

/**
 * 利用者のイニシャル（頭文字）を取得
 * @param name - 利用者名
 * @returns イニシャル（日本語の場合は最初の1文字、英語の場合は最初の2文字）
 */
export function getClientInitials(name: string): string {
  if (!name) return '?'
  const firstChar = name[0]
  if (/[a-zA-Z]/.test(firstChar)) {
    return name.substring(0, 2).toUpperCase()
  }
  return firstChar
}

/**
 * 日付を日本語形式でフォーマット
 * @param dateString - ISO日付文字列
 * @returns フォーマットされた日付文字列（例: "2024年1月1日"）
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  } catch {
    return dateString
  }
}








