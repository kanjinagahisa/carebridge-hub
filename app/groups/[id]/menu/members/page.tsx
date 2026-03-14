import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/**
 * グループメンバー一覧（/groups/[id]/menu/members）
 * フェーズA: 仮画面。実データ表示は次フェーズで実装。
 */
export default async function GroupMembersPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link href={`/groups/${params.id}/menu`} className="p-2 -ml-2 flex items-center gap-1">
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">メンバー</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500 text-center py-8">
            メンバー一覧は今後実装予定です。
          </p>
        </div>
      </div>
    </div>
  )
}
