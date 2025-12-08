'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import { PROFESSIONS, PROFESSION_LABELS } from '@/lib/constants'
import { validatePasswordStrength, getPasswordStrengthDescription } from '@/lib/validators'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    profession: '',
  })
  const [error, setError] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPasswordErrors([])
    
    // パスワード強度チェック
    const validation = validatePasswordStrength(formData.password)
    if (!validation.isValid) {
      setPasswordErrors(validation.errors)
      setLoading(false)
      return
    }
    
    setLoading(true)

    const supabase = createClient()

    // 1. 認証ユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          display_name: formData.displayName,
          profession: formData.profession,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('ユーザー作成に失敗しました')
      setLoading(false)
      return
    }

    // 2. Database Triggerが自動的にusersテーブルにレコードを作成するため、
    //    手動でのINSERTは不要です。セッションが確立されている場合はホームに遷移
    if (authData.session) {
      router.push('/home')
      router.refresh()
    } else {
      // メール確認が必要な場合
      // Database Triggerによりusersテーブルには既にレコードが作成されています
      setError('success')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-8 text-center">
            <Logo />
            <p className="mt-4 text-gray-600">新規登録</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                表示名
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                autoComplete="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-2">
                職種
              </label>
              <select
                id="profession"
                name="profession"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                autoComplete="organization-title"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">選択してください</option>
                {Object.entries(PROFESSION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  setPasswordErrors([])
                }}
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="パスワードを入力"
              />
              <p className="mt-1 text-xs text-gray-500">
                {getPasswordStrengthDescription()}
              </p>
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

            {error && error === 'success' && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                確認メール送信。メールに記載のURLをクリックしていただき、アカウント登録を完了させてください。
              </div>
            )}
            {error && error !== 'success' && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登録中...' : '新規登録'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-primary hover:underline text-sm">
              ログインはこちら
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

