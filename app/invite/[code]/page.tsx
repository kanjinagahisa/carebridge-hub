'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/constants'

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inviteData, setInviteData] = useState<{
    facility_id: string
    facility_name: string
    code: string
    role: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAlreadyMember, setIsAlreadyMember] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkInvite = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // ログイン状態を確認
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        setUser(currentUser)

        // 招待コードを検証
        // まず招待コードのみを取得（facilities のJOINは後で行う）
        console.log('[InviteAcceptPage] Checking invite code:', code)
        const { data: invite, error: inviteError } = await supabase
          .from('invite_codes')
          .select('id, facility_id, code, role, expires_at, used, cancelled')
          .eq('code', code)
          .single()

        if (inviteError) {
          console.error('[InviteAcceptPage] Error fetching invite code:', inviteError)
          console.error('[InviteAcceptPage] Error details:', {
            code: inviteError.code,
            message: inviteError.message,
            details: inviteError.details,
            hint: inviteError.hint,
            status: (inviteError as any).status,
            statusText: (inviteError as any).statusText,
          })
          // エラーオブジェクト全体をJSON形式で出力（デバッグ用）
          try {
            console.error('[InviteAcceptPage] Full error object:', JSON.stringify(inviteError, null, 2))
          } catch (e) {
            console.error('[InviteAcceptPage] Could not stringify error:', e)
          }
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        if (!invite) {
          console.error('[InviteAcceptPage] Invite code not found:', code)
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        console.log('[InviteAcceptPage] Invite code found:', {
          id: invite.id,
          facility_id: invite.facility_id,
          code: invite.code,
          role: invite.role,
          expires_at: invite.expires_at,
          used: invite.used,
          cancelled: invite.cancelled,
        })

        // 施設情報を別途取得（匿名ユーザーでも読み取れるようにする必要がある）
        // まず、招待コードから facility_id を取得したので、それを使って施設情報を取得
        console.log('[InviteAcceptPage] Fetching facility:', invite.facility_id)
        const { data: facility, error: facilityError } = await supabase
          .from('facilities')
          .select('name, deleted')
          .eq('id', invite.facility_id)
          .single()

        if (facilityError) {
          // PGRST116エラー（0 rows）の場合は、RLSポリシーの問題の可能性がある
          // 詳細なエラー情報をログに出力（デバッグ用）
          if (facilityError.code === 'PGRST116') {
            console.warn('[InviteAcceptPage] RLS policy may be blocking facility access:', {
              code: facilityError.code,
              message: facilityError.message,
              details: facilityError.details,
              facility_id: invite.facility_id,
            })
          } else {
            console.error('[InviteAcceptPage] Error fetching facility:', {
              error: facilityError,
              code: facilityError.code,
              message: facilityError.message,
              details: facilityError.details,
              hint: facilityError.hint,
              facility_id: invite.facility_id,
            })
          }
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        if (!facility) {
          console.error('[InviteAcceptPage] Facility not found:', invite.facility_id)
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        console.log('[InviteAcceptPage] Facility found:', {
          name: facility.name,
          deleted: facility.deleted,
        })

        // 施設が削除されていないか確認
        if (facility.deleted) {
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        // 有効期限をチェック
        if (invite.expires_at) {
          const expiresAt = new Date(invite.expires_at)
          const now = new Date()
          if (expiresAt < now) {
            setError('この招待リンクは期限切れです。')
            setIsLoading(false)
            return
          }
        }

        // 使用済みかチェック
        if (invite.used) {
          setError('この招待リンクは既に使用されています。')
          setIsLoading(false)
          return
        }

        // キャンセルされているかチェック
        if (invite.cancelled) {
          setError('この招待リンクは無効になっています。')
          setIsLoading(false)
          return
        }

        // ログイン済みユーザーの場合、すでに所属しているか確認
        if (currentUser) {
          const { data: existingRole } = await supabase
            .from('user_facility_roles')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('facility_id', invite.facility_id)
            .eq('deleted', false)
            .maybeSingle()

          if (existingRole) {
            setIsAlreadyMember(true)
            setIsLoading(false)
            return
          }
        }

        setInviteData({
          facility_id: invite.facility_id,
          facility_name: facility.name || '不明な施設',
          code: invite.code,
          role: invite.role || 'staff', // デフォルトはstaff
        })
      } catch (err: any) {
        console.error('Failed to check invite:', err)
        setError('招待リンクの確認に失敗しました。')
      } finally {
        setIsLoading(false)
      }
    }

    if (code) {
      checkInvite()
    }
  }, [code])

  const handleAccept = async () => {
    if (!inviteData || !user) return

    setIsProcessing(true)
    setError(null)

    try {
      const supabase = createClient()

      // 再度、すでに所属しているか確認（重複防止）
      const { data: existingRole } = await supabase
        .from('user_facility_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('facility_id', inviteData.facility_id)
        .eq('deleted', false)
        .maybeSingle()

      if (existingRole) {
        setIsAlreadyMember(true)
        setIsProcessing(false)
        return
      }

      // user_facility_rolesに追加（roleはinvite_codesから取得）
      const { error: insertError } = await supabase
        .from('user_facility_roles')
        .insert({
          user_id: user.id,
          facility_id: inviteData.facility_id,
          role: inviteData.role || ROLES.STAFF, // invite_codesから取得したroleを使用
        })

      if (insertError) {
        // 重複エラーの場合は既に所属しているとみなす
        if (insertError.code === '23505') {
          setIsAlreadyMember(true)
          setIsProcessing(false)
          return
        }
        throw insertError
      }

      // 招待コードを使用済みにする
      const { error: updateError } = await supabase
        .from('invite_codes')
        .update({ used: true })
        .eq('code', code)

      if (updateError) {
        console.error('Failed to mark invite as used:', updateError)
        // エラーが発生しても、user_facility_rolesへの追加は成功しているので続行
      }

      setIsAccepted(true)
    } catch (err: any) {
      console.error('Failed to accept invite:', err)
      setError(err.message || '承認処理に失敗しました。')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    )
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4 max-w-md mx-4">
          <XCircle size={48} className="mx-auto text-red-500" />
          <div>
            <p className="text-gray-900 font-semibold mb-2">この招待リンクは無効になっています。</p>
            <p className="text-sm text-gray-600 mb-4">
              ・期限切れ
              <br />
              ・使用済み
              <br />
              ・存在しないコード
              <br />
              <br />
              管理者の方に再度招待を依頼してください。
            </p>
          </div>
          <Link
            href="/home"
            className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームへ
          </Link>
        </div>
      </div>
    )
  }

  if (isAlreadyMember) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4 max-w-md mx-4">
          <CheckCircle size={48} className="mx-auto text-blue-500" />
          <div>
            <p className="text-gray-900 font-semibold mb-2">
              あなたはすでにこの施設に所属しています。
            </p>
          </div>
          <Link
            href="/home"
            className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームへ戻る
          </Link>
        </div>
      </div>
    )
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4 max-w-md mx-4">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <div>
            <p className="text-gray-900 font-semibold mb-2">参加が完了しました！</p>
            <p className="text-sm text-gray-600 mb-4">
              ホーム画面からグループや利用者の情報を確認できます。
            </p>
          </div>
          <Link
            href="/home"
            className="block w-full px-4 py-2 text-sm font-medium text-center text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームへ
          </Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4 max-w-md mx-4">
          <div>
            <p className="text-gray-900 font-semibold mb-2">
              {inviteData?.facility_name} への招待
            </p>
            <p className="text-sm text-gray-600 mb-4">
              この施設に参加するには、ログインが必要です。
            </p>
          </div>
          <Link
            href={`/login?redirect=/invite/${code}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors"
          >
            <LogIn size={18} />
            <span>ログインして承認する</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-4 max-w-md mx-4">
        <div>
          <p className="text-gray-900 font-semibold mb-2">
            {inviteData?.facility_name} への招待
          </p>
          <p className="text-sm text-gray-600 mb-4">
            この施設に参加しますか？
          </p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Link
            href="/home"
            className="flex-1 px-4 py-2 text-sm font-medium text-center text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            キャンセル
          </Link>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '処理中...' : '参加する'}
          </button>
        </div>
      </div>
    </div>
  )
}


