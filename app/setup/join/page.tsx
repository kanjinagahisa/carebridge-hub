'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function SetupJoinPage() {
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  const extractInviteCode = (url: string): string | null => {
    const trimmed = url.trim()
    
    // 空文字列チェック
    if (!trimmed) return null

    // URLの形式をチェック（/invite/{code} の形式を抽出）
    // 例: https://carebridge-hub.vercel.app/invite/e543d586-59ee-4967-ae3d-7b64c586c86d
    // または: /invite/e543d586-59ee-4967-ae3d-7b64c586c86d
    // または: invite/e543d586-59ee-4967-ae3d-7b64c586c86d
    // または: e543d586-59ee-4967-ae3d-7b64c586c86d (直接コード)
    
    // 直接コードが入力された場合（UUID形式）
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidPattern.test(trimmed)) {
      return trimmed
    }

    // URL形式からコードを抽出
    const match = trimmed.match(/\/invite\/([0-9a-f-]+)/i)
    if (match && match[1]) {
      return match[1]
    }

    // invite/で始まる場合
    const simpleMatch = trimmed.match(/invite\/([0-9a-f-]+)/i)
    if (simpleMatch && simpleMatch[1]) {
      return simpleMatch[1]
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return

    if (!inviteUrl.trim()) {
      setErrorMessage('招待リンクを入力してください。')
      return
    }

    setErrorMessage('')
    setLoading(true)

    try {
      // URLから招待コードを抽出
      const inviteCode = extractInviteCode(inviteUrl.trim())

      if (!inviteCode) {
        setErrorMessage('有効な招待リンクまたは招待コードを入力してください。')
        setLoading(false)
        return
      }

      // 招待ページにリダイレクト
      router.push(`/invite/${inviteCode}`)
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
            <p className="mt-4 text-gray-600">招待リンクで参加</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="inviteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                招待リンク
              </label>
              <input
                id="inviteUrl"
                type="text"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="例：https://carebridge-hub.vercel.app/invite/e543d586-59ee-4967-ae3d-7b64c586c86d"
              />
              <p className="mt-1 text-xs text-gray-500">
                招待リンク（URL）または招待コードを入力してください
              </p>
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

