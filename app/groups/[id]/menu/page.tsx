'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Bell, BellOff, Users, UserPlus, LogOut } from 'lucide-react'

/**
 * グループメニュー画面（/groups/[id]/menu）
 * Phase B: 通知ミュートトグル・退会を本実装
 */
export default function GroupMenuPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [muted, setMuted] = useState(false)
  const [muteLoading, setMuteLoading] = useState(true)
  const [muteError, setMuteError] = useState<string | null>(null)

  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)

  // 初期表示時にミュート状態を取得
  useEffect(() => {
    fetch(`/api/groups/notification-mute?groupId=${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.muted === 'boolean') setMuted(d.muted)
      })
      .catch(() => {/* ネットワークエラー時は初期値のまま */})
      .finally(() => setMuteLoading(false))
  }, [id])

  // 通知ミュートトグル
  const toggleMute = async () => {
    const next = !muted
    setMuted(next) // 楽観的更新
    setMuteError(null)
    try {
      const res = await fetch('/api/groups/notification-mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: id, mute: next }),
        credentials: 'include',
      })
      if (!res.ok) {
        setMuted(!next) // ロールバック
        setMuteError('通知設定の変更に失敗しました')
      }
    } catch {
      setMuted(!next) // ロールバック
      setMuteError('通知設定の変更に失敗しました')
    }
  }

  // 退会実行
  const handleLeave = async () => {
    setLeaveLoading(true)
    setLeaveError(null)
    try {
      const res = await fetch('/api/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: id }),
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json()
        setLeaveError(j.error ?? '退会に失敗しました')
        return
      }
      router.push('/groups')
    } finally {
      setLeaveLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link href={`/groups/${id}`} className="p-2 -ml-2 flex items-center gap-1">
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">グループ設定</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {muteError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {muteError}
          </div>
        )}

        {/* 通知オフ / 通知オン */}
        <div className="bg-white rounded-xl shadow-sm">
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-left disabled:opacity-50"
            onClick={toggleMute}
            disabled={muteLoading}
          >
            {muted ? (
              <BellOff size={20} className="text-gray-400" />
            ) : (
              <Bell size={20} className="text-gray-500" />
            )}
            <span className={`text-sm ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
              {muted ? '通知オン' : '通知オフ'}
            </span>
          </button>
        </div>

        {/* メンバー */}
        <div className="bg-white rounded-xl shadow-sm">
          <Link href={`/groups/${id}/menu/members`} className="flex items-center gap-3 px-4 py-4">
            <Users size={20} className="text-gray-500" />
            <span className="text-sm text-gray-900">メンバー</span>
          </Link>
        </div>

        {/* 招待 */}
        <div className="bg-white rounded-xl shadow-sm">
          <Link href={`/groups/${id}/menu/invite`} className="flex items-center gap-3 px-4 py-4">
            <UserPlus size={20} className="text-gray-500" />
            <span className="text-sm text-gray-900">招待</span>
          </Link>
        </div>

        {/* 退会 */}
        <div className="bg-white rounded-xl shadow-sm">
          <button
            className="w-full flex items-center gap-3 px-4 py-4 text-left"
            onClick={() => setShowLeaveModal(true)}
          >
            <LogOut size={20} className="text-red-500" />
            <span className="text-sm text-red-500">退会</span>
          </button>
        </div>
      </div>

      {/* 退会確認モーダル */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-lg mx-4 p-6 w-full max-w-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              このグループから退会しますか？
            </h2>
            <p className="text-sm text-gray-600">
              退会すると、このグループの投稿やメンバー一覧にアクセスできなくなります。
            </p>
            {leaveError && (
              <p className="text-sm text-red-600">{leaveError}</p>
            )}
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50"
                onClick={() => {
                  setShowLeaveModal(false)
                  setLeaveError(null)
                }}
                disabled={leaveLoading}
              >
                キャンセル
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                onClick={handleLeave}
                disabled={leaveLoading}
              >
                {leaveLoading ? '処理中...' : '退会'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
