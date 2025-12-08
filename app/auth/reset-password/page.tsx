'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { validatePasswordStrength, getPasswordStrengthDescription } from '@/lib/validators'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const [hasTokenError, setHasTokenError] = useState(false) // トークンエラー（リンク無効/期限切れ）かどうか

  useEffect(() => {
    // URLパラメータからトークンを確認
    // Supabaseのパスワードリセットフローでは、以下のいずれかが含まれる：
    // 1. URLフラグメント（#access_token=...&type=recovery）
    // 2. クエリパラメータ（?access_token=...）
    // 3. クエリパラメータ（?code=...）← メールリンクで使用される
    // 4. エラーパラメータ（?error=...）← リンクが無効または期限切れの場合
    const checkToken = async () => {
      const supabase = createClient()
      
      // まず、エラーパラメータをチェック（最優先）
      const errorParam = searchParams.get('error')
      const errorCode = searchParams.get('error_code')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        console.error('[ResetPassword] Error parameter found:', {
          error: errorParam,
          errorCode,
          errorDescription,
        })
        
        // エラーメッセージを適切に表示
        setHasTokenError(true) // トークンエラーを設定
        if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
          setErrorMessage('リンクの有効期限が切れています。もう一度パスワード再設定メールを送信してください。')
        } else if (errorCode === 'access_denied' || errorDescription?.includes('invalid')) {
          // 既に使用済みの可能性も含む
          if (errorDescription?.includes('expired') || errorDescription?.includes('invalid')) {
            setErrorMessage('このリンクは既に使用済みか、無効です。新しいパスワード再設定メールを送信してください。')
          } else {
            setErrorMessage('リンクが無効です。新しいパスワード再設定メールを送信してください。')
          }
        } else {
          setErrorMessage('パスワード再設定リンクに問題があります。新しいパスワード再設定メールを送信してください。')
        }
        setIsValidatingToken(false)
        return
      }
      
      // URLフラグメント（#以降）を確認（最優先）
      // Supabaseのパスワードリセットでは、メールリンクをクリックすると、
      // 通常はURLフラグメント（#以降）にaccess_tokenとrefresh_tokenが含まれる
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const hashError = hashParams.get('error')
      const hashErrorCode = hashParams.get('error_code')
      const hashErrorDescription = hashParams.get('error_description')
      
      // フラグメント内のエラーパラメータをチェック
      if (hashError) {
        console.error('[ResetPassword] Error parameter found in hash:', {
          error: hashError,
          errorCode: hashErrorCode,
          errorDescription: hashErrorDescription,
        })
        
        // エラーメッセージを適切に表示
        setHasTokenError(true) // トークンエラーを設定
        if (hashErrorCode === 'otp_expired' || hashErrorDescription?.includes('expired')) {
          setErrorMessage('リンクの有効期限が切れています。もう一度パスワード再設定メールを送信してください。')
        } else if (hashErrorCode === 'access_denied' || hashErrorDescription?.includes('invalid')) {
          // 既に使用済みの可能性も含む
          if (hashErrorDescription?.includes('expired') || hashErrorDescription?.includes('invalid')) {
            setErrorMessage('このリンクは既に使用済みか、無効です。新しいパスワード再設定メールを送信してください。')
          } else {
            setErrorMessage('リンクが無効です。新しいパスワード再設定メールを送信してください。')
          }
        } else {
          setErrorMessage('パスワード再設定リンクに問題があります。新しいパスワード再設定メールを送信してください。')
        }
        setIsValidatingToken(false)
        return
      }
      
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      
      // パスワードリセットタイプか確認
      if (type === 'recovery' && accessToken) {
        try {
          console.log('[ResetPassword] Found hash fragment with access_token, setting session...')
          // セッションを確立
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })
          
          if (error) {
            console.error('[ResetPassword] Token validation error:', error)
            setHasTokenError(true) // トークンエラーを設定
            setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
            setIsValidatingToken(false)
            return
          }
          
          if (data.session) {
            console.log('[ResetPassword] Session established for password reset')
            setIsValidatingToken(false)
          } else {
            setHasTokenError(true) // トークンエラーを設定
            setErrorMessage('セッションの確立に失敗しました。新しいパスワード再設定メールを送信してください。')
            setIsValidatingToken(false)
          }
        } catch (err) {
          console.error('[ResetPassword] Token validation exception:', err)
          setHasTokenError(true) // トークンエラーを設定
          setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
          setIsValidatingToken(false)
        }
        return
      }
      
      // codeパラメータをチェック（メールリンクで使用される場合がある）
      // 注意：codeパラメータがクエリパラメータとして含まれている場合、
      // Supabaseが自動的にセッションを確立している可能性があるため、まずセッションを確認する
      const code = searchParams.get('code')
      if (code) {
        try {
          console.log('[ResetPassword] Found code parameter, checking for existing session...')
          
          // まず、既にセッションが確立されているか確認
          // Supabaseが自動的にセッションを確立している可能性がある
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (session) {
            console.log('[ResetPassword] Session already established from code')
            setIsValidatingToken(false)
            return
          }
          
          // セッションが確立されていない場合、codeパラメータは無効または期限切れの可能性がある
          console.log('[ResetPassword] No session found for code parameter')
          setHasTokenError(true)
          setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
          setIsValidatingToken(false)
          return
        } catch (err) {
          console.error('[ResetPassword] Session check exception:', err)
          setHasTokenError(true)
          setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
          setIsValidatingToken(false)
          return
        }
      }
      
      // 通常のクエリパラメータ（?access_token=...）の場合も確認
      const queryAccessToken = searchParams.get('access_token')
      if (queryAccessToken) {
        try {
          console.log('[ResetPassword] Found query parameter access_token, setting session...')
          const { data, error } = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: searchParams.get('refresh_token') || '',
          })
          
          if (error) {
            console.error('[ResetPassword] Token validation error:', error)
            setHasTokenError(true) // トークンエラーを設定
            setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
            setIsValidatingToken(false)
            return
          }
          
          if (data.session) {
            console.log('[ResetPassword] Session established for password reset')
            setIsValidatingToken(false)
          } else {
            setHasTokenError(true) // トークンエラーを設定
            setErrorMessage('セッションの確立に失敗しました。新しいパスワード再設定メールを送信してください。')
            setIsValidatingToken(false)
          }
        } catch (err) {
          console.error('[ResetPassword] Token validation exception:', err)
          setHasTokenError(true) // トークンエラーを設定
          setErrorMessage('リンクの有効期限が切れているか、無効です。新しいパスワード再設定メールを送信してください。')
          setIsValidatingToken(false)
        }
        return
      }
      
      // いずれのパラメータも見つからない場合
      console.warn('[ResetPassword] No valid token found in URL')
      setHasTokenError(true) // トークンエラーを設定
      setErrorMessage('パスワード再設定リンクが見つかりません。新しいパスワード再設定メールを送信してください。')
      setIsValidatingToken(false)
    }
    
    checkToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setPasswordErrors([])
    
    // パスワード強度チェック
    const validation = validatePasswordStrength(newPassword)
    if (!validation.isValid) {
      setPasswordErrors(validation.errors)
      return
    }
    
    setLoading(true)

    try {
      const supabase = createClient()
      
      // 現在のユーザーを取得
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setErrorMessage('セッションが無効です。再度パスワード再設定メールを送信してください。')
        setLoading(false)
        return
      }
      
      // パスワードを更新
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: {
          password_updated_at: new Date().toISOString(),
        },
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        setErrorMessage(updateError.message)
        setLoading(false)
        return
      }

      // パスワード更新成功
      // パスワード変更完了メールを送信（APIエンドポイントを呼び出し）
      try {
        console.log('[ResetPassword] Sending password changed notification email request...', {
          userId: user.id,
          email: user.email,
        })
        
        const response = await fetch('/api/auth/password-changed-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        })
        
        const responseData = await response.json()
        console.log('[ResetPassword] Password changed notification response:', {
          status: response.status,
          data: responseData,
        })
        
        if (!response.ok) {
          console.warn('[ResetPassword] Failed to send password changed notification email, but password was updated successfully')
        } else if (responseData.emailSent === false) {
          console.warn('[ResetPassword] Email sending failed:', responseData.error)
        } else if (responseData.emailSent === true) {
          console.log('[ResetPassword] ✅ Email sent successfully!')
        }
      } catch (emailError) {
        // メール送信エラーは無視（パスワードは既に更新済み）
        console.warn('Failed to send password changed notification email:', emailError)
      }
      
      // ログイン画面にリダイレクト
      router.push('/login?message=password-reset-success')
    } catch (err) {
      console.error('Password reset exception:', err)
      setErrorMessage('予期しないエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
    }
  }

  if (isValidatingToken) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-8 text-center">
              <Logo />
              <p className="mt-4 text-gray-600">リンクを確認中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-4 text-xl font-semibold text-gray-900">パスワードのリセット</h1>
            {!hasTokenError && (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  新しいパスワードを設定してください。
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {getPasswordStrengthDescription()}
                </p>
              </>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {errorMessage}
            </div>
          )}

          {hasTokenError ? (
            // トークンエラーの場合：フォームを非表示にして、パスワード再設定メール送信ページへのリンクを表示
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  新しいパスワード再設定メールを送信してください。
                </p>
                <a
                  href="/auth/forgot-password"
                  className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  パスワード再設定メールを送信する
                </a>
              </div>
            </div>
          ) : (
            // トークンが有効な場合：パスワード入力フォームを表示
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                新しいパスワード
              </label>
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordErrors([])
                }}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="新しいパスワードを入力"
              />
              <div className="mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">パスワードを表示する</span>
                </label>
              </div>
              {passwordErrors.length > 0 && (
                <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <ul className="list-disc list-inside space-y-1">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '設定中...' : '送信する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

