import Link from 'next/link'

/**
 * 新しい利用者を追加するページ（プレースホルダー）
 * 将来的に実装予定
 */
export default function NewClientPage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/clients" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">新しい利用者を追加</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-gray-600 mb-4">
            利用者追加機能は現在開発中です。
          </p>
          <Link
            href="/clients"
            className="inline-block px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            利用者一覧に戻る
          </Link>
        </div>
      </div>
    </div>
  )
}








