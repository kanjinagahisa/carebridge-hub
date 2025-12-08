'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function SetupJoinPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    if (!inviteCode.trim()) {
      setErrorMessage('招待コードを入力してください。')
      return
    }

    setErrorMessage('')
    setLoading(true)

    try {
      const supabase = createClient()

      // 招待コードから施設IDを取得
      const { data: found, error: codeError } = await supabase
        .from('invite_codes')
        .select('facility_id')
        .eq('code', inviteCode.trim())
        .single()

      if (codeError || !found) {
        setErrorMessage('招待コードが無効です。')
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setErrorMessage('ログイン情報を確認できません。')
        setLoading(false)
        return
      }

      // ユーザーを施設のメンバーとして追加
      const { error: roleError } = await supabase.from('user_facility_roles').insert({
        user_id: user.id,
        facility_id: found.facility_id,
        role: 'member',
      })

      if (roleError) {
        console.error('Role creation error:', roleError)
        setErrorMessage('施設への参加に失敗しました。')
        setLoading(false)
        return
      }

      // ホームにリダイレクト
      window.location.href = '/home'
    } catch (err) {
      console.error('Setup join exception:', err)
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
            <p className="mt-4 text-gray-600">招待コードで参加</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                招待コード
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="例：ABC12345"
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
              {loading ? '参加中...' : '施設に参加する'}
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

