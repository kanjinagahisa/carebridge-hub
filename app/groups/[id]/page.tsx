import Link from 'next/link'

/**
 * グループ詳細ページ（/groups/[id]）
 * 500回避のため最小構成で表示
 */
export default async function GroupDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <Link href="/groups" className="text-sm text-gray-600 hover:text-gray-900">
            ← 戻る
          </Link>
          <h1 className="mt-2 text-lg font-semibold text-gray-900">グループ詳細</h1>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">groupId: {params.id}</p>
        <p className="text-sm text-gray-500">
          この画面は準備中です（投稿機能は次フェーズで実装）
        </p>
      </div>
    </div>
  )
}
