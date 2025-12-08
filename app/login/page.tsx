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
          window.location.href = redirectTo
        } else {
          console.warn('No session found after wait, but proceeding with redirect anyway')
          // セッションが取得できなくても、signInWithPasswordのレスポンスにセッションがあるので
          // リダイレクトを試みる（クッキーは既に設定されている可能性が高い）
          // セッションが確立されるまで少し待機
          await new Promise((resolve) => setTimeout(resolve, 200))
          window.location.href = redirectTo
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

