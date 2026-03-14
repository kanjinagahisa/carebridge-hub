'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Bell, Users, UserPlus, LogOut } from 'lucide-react'

/**
 * グループメニュー画面（/groups/[id]/menu）
 * フェーズA: 見た目・遷移・退会確認モーダルのみ。実データ変更なし。
 */
export default function GroupMenuPage() {
  const params = useParams()
  const id = params.id as string

  const [showLeaveModal, setShowLeaveModal] = useState(false)

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
        {/* 通知オフ（フェーズAは見た目のみ） */}
        <div className="bg-white rounded-xl shadow-sm">
          <button className="w-full flex items-center gap-3 px-4 py-4 text-left">
            <Bell size={20} className="text-gray-500" />
            <span className="text-sm text-gray-900">通知オフ</span>
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
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700"
                onClick={() => setShowLeaveModal(false)}
              >
                キャンセル
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
                onClick={() => setShowLeaveModal(false)}
              >
                退会
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
