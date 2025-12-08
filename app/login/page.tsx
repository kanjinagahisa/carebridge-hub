'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

function LoginContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/home'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // 認証確認後のコールバック処理（メール確認URLクリック後）
  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      // まず、既にセッションが確立されているか確認（ページリロード後など）
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        console.log('[Login] Existing session found, redirecting to home')
        window.location.replace('/home')
        return
      }
      
      // エラーパラメータをチェック（クエリパラメータとフラグメントの両方を確認）
      const errorParam = searchParams.get('error')
      const errorCode = searchParams.get('error_code')
      const errorDescription = searchParams.get('error_description')
      
      if (errorParam) {
        console.error('[Login] Error parameter found:', { error: errorParam, errorCode, errorDescription })
        if (errorCode === 'otp_expired' || errorDescription?.includes('expired') || errorDescription?.includes('invalid')) {
          setErrorMessage('メール確認リンクの有効期限が切れています。もう一度新規登録を行ってください。')
        } else {
          setErrorMessage('アカウント確認に失敗しました。リンクが無効または期限切れの可能性があります。')
        }
        // URLからエラーパラメータを削除
        window.history.replaceState(null, '', '/login')
        setIsCheckingAuth(false)
        return
      }
      
      // URLフラグメント（#以降）を確認（メール確認では通常フラグメントに含まれる）
      const hash = window.location.hash
      
      // フラグメント内のエラーパラメータもチェック
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const hashError = hashParams.get('error')
        const hashErrorCode = hashParams.get('error_code')
        const hashErrorDescription = hashParams.get('error_description')
        
        if (hashError) {
          console.error('[Login] Error parameter found in hash:', { error: hashError, errorCode: hashErrorCode, errorDescription: hashErrorDescription })
          if (hashErrorCode === 'otp_expired' || hashErrorDescription?.includes('expired') || hashErrorDescription?.includes('invalid')) {
            setErrorMessage('メール確認リンクの有効期限が切れています。もう一度新規登録を行ってください。')
          } else {
            setErrorMessage('アカウント確認に失敗しました。リンクが無効または期限切れの可能性があります。')
          }
          // URLからエラーパラメータを削除
          window.history.replaceState(null, '', '/login')
          setIsCheckingAuth(false)
          return
        }
      }
      
      if (!hash) {
        // ハッシュがない場合、通常のログイン画面を表示
        setIsCheckingAuth(false)
        return
      }
      
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      
      // 新規登録確認（type=signup）の場合
      if (type === 'signup' && accessToken) {
        try {
          console.log('[Login] Found signup confirmation token, setting session...')
          // セッションを確立
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })
          
          if (error) {
            console.error('[Login] Token validation error:', error)
            setErrorMessage('アカウント確認に失敗しました。リンクが無効または期限切れの可能性があります。')
            setIsCheckingAuth(false)
            return
          }
          
          if (data.session) {
            console.log('[Login] Session established for signup confirmation')
            // セッション確立後、ホーム画面にリダイレクト
            // URLフラグメントを削除してクリーンなURLに
            window.history.replaceState(null, '', '/login')
            setSuccessMessage('アカウント登録が完了しました。')
            await new Promise((resolve) => setTimeout(resolve, 1000))
            window.location.replace('/home')
            return
          } else {
            setErrorMessage('セッションの確立に失敗しました。')
            setIsCheckingAuth(false)
          }
        } catch (err) {
          console.error('[Login] Token validation exception:', err)
          setErrorMessage('アカウント確認中にエラーが発生しました。')
          setIsCheckingAuth(false)
        }
        return
      }
      
      // codeパラメータをチェック（メールリンクで使用される場合がある）
      const code = searchParams.get('code')
      if (code) {
        try {
          console.log('[Login] Found code parameter, checking for existing session...')
          
          // 既にセッションが確立されているか確認
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (session) {
            console.log('[Login] Session already established from code')
            // URLパラメータを削除してクリーンなURLに
            window.history.replaceState(null, '', '/login')
            setSuccessMessage('アカウント登録が完了しました。')
            await new Promise((resolve) => setTimeout(resolve, 1000))
            window.location.replace('/home')
            return
          } else {
            // セッションが確立されていない場合、少し待ってから再確認
            await new Promise((resolve) => setTimeout(resolve, 500))
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            
            if (retrySession) {
              // URLパラメータを削除してクリーンなURLに
              window.history.replaceState(null, '', '/login')
              setSuccessMessage('アカウント登録が完了しました。')
              await new Promise((resolve) => setTimeout(resolve, 1000))
              window.location.replace('/home')
              return
            } else {
              console.warn('[Login] No session found for code parameter')
              setIsCheckingAuth(false)
            }
          }
        } catch (err) {
          console.error('[Login] Session check exception:', err)
          setIsCheckingAuth(false)
        }
        return
      }
      
      // 通常のクエリパラメータ（?access_token=...）の場合も確認
      const queryAccessToken = searchParams.get('access_token')
      if (queryAccessToken) {
        try {
          console.log('[Login] Found query parameter access_token, setting session...')
          const { data, error } = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: searchParams.get('refresh_token') || '',
          })
          
          if (error) {
            console.error('[Login] Token validation error:', error)
            setErrorMessage('アカウント確認に失敗しました。')
            setIsCheckingAuth(false)
            return
          }
          
          if (data.session) {
            console.log('[Login] Session established for signup confirmation')
            // URLパラメータを削除してクリーンなURLに
            window.history.replaceState(null, '', '/login')
            setSuccessMessage('アカウント登録が完了しました。')
            await new Promise((resolve) => setTimeout(resolve, 1000))
            window.location.replace('/home')
            return
          } else {
            setErrorMessage('セッションの確立に失敗しました。')
            setIsCheckingAuth(false)
          }
        } catch (err) {
          console.error('[Login] Token validation exception:', err)
          setErrorMessage('アカウント確認中にエラーが発生しました。')
          setIsCheckingAuth(false)
        }
        return
      }
      
      // 認証確認のコールバックがない場合、通常のログイン画面を表示
      setIsCheckingAuth(false)
    }
    
    handleAuthCallback()
    
    // ハッシュ変更を監視（メール確認URLクリック後にハッシュが追加される場合がある）
    const handleHashChange = () => {
      handleAuthCallback()
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [searchParams])

  // URLパラメータから成功メッセージを取得
  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'password-reset-success') {
      setSuccessMessage('パスワードの再設定が完了しました。新しいパスワードでログインしてください。')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // ローディング中は二重送信しない
    if (loading) {
      console.log('Already processing login, ignoring duplicate request')
      return
    }
    
    setErrorMessage('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Supabase の signInWithPassword を必ず await する
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // 返ってきた { data, error } をコンソールに必ず表示する
      console.log('signIn result', { data, error })

      // error があれば setErrorMessage に保存し、画面に表示する
      if (error) {
        console.error('Login error:', error)
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      // error がなく data.session が存在する場合のみ /home へリダイレクトする
      if (data?.session) {
        console.log('Login successful, session exists:', data.session)
        // クッキーが確実に設定されるまで待機
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        // セッションを再確認
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        console.log('Current session after wait:', currentSession)
        
        if (currentSession) {
          console.log('Session confirmed, redirecting to:', redirectTo)
          // セッションが確立されるまで少し待機してからリダイレクト
          await new Promise((resolve) => setTimeout(resolve, 200))
          // 完全なページリロードを行い、サーバー側のミドルウェアがセッションを認識できるようにする
          // window.location.replace を使用して、ブラウザの履歴に残さない
          // リダイレクトを確実に実行するため、try-catchで囲む
          try {
            window.location.replace(redirectTo)
            // リダイレクトが実行されない場合に備えて、フォールバック処理
            setTimeout(() => {
              if (window.location.pathname !== redirectTo) {
                console.warn('Redirect may have failed, trying again...')
                window.location.href = redirectTo
              }
            }, 1000)
          } catch (err) {
            console.error('Redirect error:', err)
            window.location.href = redirectTo
          }
        } else {
          console.warn('No session found after wait, but proceeding with redirect anyway')
          // セッションが取得できなくても、signInWithPasswordのレスポンスにセッションがあるので
          // リダイレクトを試みる（クッキーは既に設定されている可能性が高い）
          // セッションが確立されるまで少し待機
          await new Promise((resolve) => setTimeout(resolve, 200))
          try {
            window.location.replace(redirectTo)
            setTimeout(() => {
              if (window.location.pathname !== redirectTo) {
                console.warn('Redirect may have failed, trying again...')
                window.location.href = redirectTo
              }
            }, 1000)
          } catch (err) {
            console.error('Redirect error:', err)
            window.location.href = redirectTo
          }
        }
      } else {
        console.error('No session in response')
        setErrorMessage('ログインに失敗しました。セッションが確立されませんでした。')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login exception:', err)
      setErrorMessage('予期しないエラーが発生しました: ' + (err instanceof Error ? err.message : String(err)))
      setLoading(false)
    }
  }

  // 認証確認中の場合はローディング画面を表示
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-8 text-center">
              <Logo />
              <p className="mt-4 text-gray-600">アカウント確認中...</p>
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
            <p className="mt-4 text-gray-600">介護・福祉向け情報共有アプリ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="••••••••"
              />
              <div className="mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="showPassword"
                    name="showPassword"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">パスワードを表示する</span>
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <div>
              <a href="/auth/forgot-password" className="text-primary hover:underline text-sm">
                パスワードを忘れた方
              </a>
            </div>
            <div>
              <a href="/signup" className="text-primary hover:underline text-sm">
                新規登録はこちら
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-8 text-center">
              <Logo />
              <p className="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

