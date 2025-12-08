/**
 * パスワード強度バリデーション関数
 * MCS風：英小文字、英大文字、数字、記号のうち3種類以上を含む必要がある（記号は必須）
 * 
 * @param password - 検証するパスワード
 * @returns バリデーション結果（isValid: 有効かどうか, errors: エラーメッセージの配列）
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // 最低文字数チェック（8文字以上）
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります')
  }
  
  // 文字種チェック
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  
  // 記号は必須
  if (!hasSpecial) {
    errors.push('パスワードには記号を含む必要があります')
  }
  
  const characterTypes = [
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length
  
  // 3種類以上必要（記号を含む）
  if (characterTypes < 3) {
    errors.push('パスワードは、半角英小文字、半角英大文字、半角数字、記号のうち3種類以上を含む必要があります')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * パスワード強度の説明文を取得
 */
export function getPasswordStrengthDescription(): string {
  return '半角英小文字、半角英大文字、半角数字、記号のうち3種類以上を含む（記号は必須）'
}


