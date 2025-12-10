'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Copy, Check } from 'lucide-react'
import { ROLES, ROLE_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

function InviteCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const facilityId = searchParams.get('facility_id')

  const [role, setRole] = useState<'admin' | 'staff'>(ROLES.STAFF)
  const [message, setMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'staff' | null>(null)

  useEffect(() => {
    const checkUserRole = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // ユーザーのロールを取得
      const { data: userFacilities } = await supabase
        .from('user_facility_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('facility_id', facilityId)
        .eq('deleted', false)
        .maybeSingle()

      if (userFacilities) {
        const role = userFacilities.role as 'admin' | 'staff'
        setUserRole(role)

        // staffユーザーはadminロールを選択できない
        if (role === ROLES.STAFF) {
          setRole(ROLES.STAFF)
        }
      } else {
        router.push('/home')
      }
    }

    if (facilityId) {
      checkUserRole()
    } else {
      router.push('/settings/facility')
    }
  }, [facilityId, router])

  const handleCreateInvite = async () => {
    if (!facilityId) return

    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()

      // ユーザーがadminかどうか確認
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('ログインが必要です')
      }

      const { data: userFacility } = await supabase
        .from('user_facility_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('facility_id', facilityId)
        .eq('deleted', false)
        .maybeSingle()

      if (!userFacility || userFacility.role !== ROLES.ADMIN) {
        throw new Error('管理者のみ招待リンクを作成できます')
      }

      // staffユーザーがadminロールを選択できないように制御
      if (userFacility.role === ROLES.STAFF && role === ROLES.ADMIN) {
        throw new Error('一般職員は管理者ロールの招待リンクを作成できません')
      }

      // 招待コードを生成（UUIDをベースにしたランダム文字列）
      const code = crypto.randomUUID()

      // 48時間後の有効期限を計算
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 48)

      // invite_codesにinsert
      const { data: inviteData, error: inviteError } = await supabase
        .from('invite_codes')
        .insert({
          facility_id: facilityId,
          code: code,
          role: role, // adminが作る場合のみ'admin'許可、staffが作る場合は常に'staff'
          expires_at: expiresAt.toISOString(),
          used: false,
          message: message.trim() || null,
          created_by: user.id,
          cancelled: false,
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // 招待リンクを生成（現在のブラウザのURLを使用）
      // 'use client'コンポーネントなので、window.locationは常に利用可能
      // より確実にoriginを取得するため、複数の方法を試す
      let appUrl: string
      if (typeof window !== 'undefined') {
        appUrl = window.location.origin || `${window.location.protocol}//${window.location.host}`
      } else {
        // フォールバック（通常は実行されない）
        appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://carebridge-hub.vercel.app'
      }
      
      const inviteLink = `${appUrl}/invite/${code}`
      
      // デバッグ用（本番環境では削除可能）
      console.log('[Invite] Generated invite link:', {
        origin: window.location.origin,
        protocol: window.location.protocol,
        host: window.location.host,
        appUrl,
        inviteLink
      })

      setInviteCode(inviteLink)
    } catch (err: any) {
      console.error('Failed to create invite:', err)
      setError(err.message || '招待リンクの作成に失敗しました。')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteCode) return

    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!facilityId || userRole === null) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  if (userRole !== ROLES.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">管理者のみ招待リンクを作成できます。</p>
          <Link
            href="/settings/facility"
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
          >
            施設設定へ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* PageHeader */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link
              href="/settings/facility"
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={20} className="inline-block mr-1" />
              <span className="text-sm">施設設定へ</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center -ml-8">
              スタッフを招待
            </h1>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {inviteCode ? (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">招待リンクが作成されました</h2>
            <div className="space-y-2">
              <label className="block text-sm text-gray-500">招待リンク</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="コピー"
                >
                  {copied ? (
                    <Check size={20} className="text-green-600" />
                  ) : (
                    <Copy size={20} className="text-gray-600" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                このリンクを共有すると、スタッフが施設に参加できます。
              </p>
            </div>
            <Link
              href="/settings/facility"
              className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
            >
              施設設定へ戻る
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">招待情報</h2>

            <div>
              <label htmlFor="role" className="block text-sm text-gray-500 mb-2">
                招待ロール
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'staff')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
              >
                <option value={ROLES.STAFF}>{ROLE_LABELS[ROLES.STAFF]}</option>
                <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                招待されたユーザーは、このロールで施設に参加します。
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm text-gray-500 mb-2">
                招待メッセージ（任意）
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="招待メッセージを入力してください（任意）"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
            </div>

            <button
              onClick={handleCreateInvite}
              disabled={isCreating}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? '作成中...' : '招待リンクを作成'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InviteCreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    }>
      <InviteCreateContent />
    </Suspense>
  )
}
