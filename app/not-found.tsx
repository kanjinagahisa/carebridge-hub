import Link from 'next/link'
import Logo from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-gray-600 mb-8">ページが見つかりませんでした</p>
        <Link
          href="/home"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}


