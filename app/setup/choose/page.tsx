'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'

export default function SetupChoosePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="mb-8 text-center">
            <Logo />
            <p className="mt-4 text-gray-600">施設のセットアップ</p>
          </div>

          <div className="space-y-4">
            <Link href="/setup/create">
              <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                新しい施設を作成する
              </button>
            </Link>

            <div className="flex items-center justify-center">
              <span className="h-px w-full bg-gray-200" />
              <span className="px-3 text-xs text-gray-500">または</span>
              <span className="h-px w-full bg-gray-200" />
            </div>

            <Link href="/setup/join">
              <button className="w-full border border-gray-300 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                招待リンクで既存施設に参加する
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


