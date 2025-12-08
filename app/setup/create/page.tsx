'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function SetupCreatePage() {
  const [facilityName, setFacilityName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    if (!facilityName.trim()) {
      setErrorMessage('施設名を入力してください。')
      return
    }

    setErrorMessage('')
    setLoading(true)

    try {
      const supabase = createClient()

      // セッションを確認
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      console.log('Session check:', { session: session ? 'exists' : 'null', sessionError })

      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('User check:', { user: user ? { id: user.id, email: user.email } : 'null', getUserError })

      if (!user) {
        console.error('No user found:', { sessionError, getUserError })
        setErrorMessage('ログイン情報を確認できません。')
        setLoading(false)
        return
      }

      // セッションとユーザーが正しく取得できていることを確認
      if (!session || !user) {
        console.error('No valid session or user:', { sessionError, getUserError })
        setErrorMessage('セッションまたはユーザー情報が無効です。再度ログインしてください。')
        setLoading(false)
        return
      }

      // JWTトークンの内容をデコードして確認（デバッグ用）
      let jwtPayload: any = null
      if (session.access_token) {
        try {
          // JWTは base64url エンコードされた3つの部分（header.payload.signature）で構成される
          const parts = session.access_token.split('.')
          if (parts.length === 3) {
            // payload部分をデコード（ブラウザ環境用）
            const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
            // base64デコード（ブラウザ環境）
            const payloadJson = atob(payloadBase64)
            jwtPayload = JSON.parse(payloadJson)
          }
        } catch (err) {
          console.error('Error decoding JWT:', err)
        }
      }

      console.log('Ready to create facility:', {
        userId: user.id,
        email: user.email,
        hasAccessToken: !!session.access_token,
        accessTokenPreview: session.access_token ? session.access_token.substring(0, 30) + '...' : 'missing',
        jwtPayload: jwtPayload ? {
          sub: jwtPayload.sub,
          role: jwtPayload.role,
          exp: jwtPayload.exp,
          expDate: jwtPayload.exp ? new Date(jwtPayload.exp * 1000).toISOString() : null,
          now: new Date().toISOString(),
          isExpired: jwtPayload.exp ? Date.now() > jwtPayload.exp * 1000 : null,
        } : null,
      })

      // サーバーサイドAPI Routeを使用して施設を作成
      // これにより、RLSポリシーの問題を回避できます
      console.log('Calling server-side API to create facility...')
      
      const response = await fetch('/api/facilities/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: facilityName.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API error:', errorData)
        setErrorMessage(`施設の作成に失敗しました: ${errorData.error || response.statusText}`)
        setLoading(false)
        return
      }

      const { facility } = await response.json()

      if (!facility) {
        setErrorMessage('施設の作成に失敗しました。')
        setLoading(false)
        return
      }

      // データベースの更新が反映されるまで少し待つ
      // その後、ホームにリダイレクト
      console.log('Facility created successfully, waiting before redirect...')
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // 完全なページリロードでホームにリダイレクト
      // これにより、ミドルウェアが最新のuser_facility_rolesを確認できる
      window.location.href = '/home'
    } catch (err) {
      console.error('Setup create exception:', err)
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
            <p className="mt-4 text-gray-600">新しい施設を作成</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="facilityName" className="block text-sm font-medium text-gray-700 mb-2">
                施設名
              </label>
              <input
                id="facilityName"
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="例：○○放課後デイサービス"
              />
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '作成中...' : '施設を作成する'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/setup/choose" className="text-primary hover:underline text-sm">
              戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

