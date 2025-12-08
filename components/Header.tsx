import Logo from './Logo'
import { User } from 'lucide-react'
import Link from 'next/link'

/**
 * 全ページ共通Headerコンポーネント
 * - facilityNameが提供されている場合: 施設名を表示（ロゴは表示しない）
 * - facilityNameが提供されていない場合: 左上にロゴを表示
 * - ロゴをクリック → /home に戻る
 * - iPhoneノッチ対応（safe-area-inset）
 */
export default function Header({ title, facilityName }: { title?: string; facilityName?: string }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>
      {facilityName ? (
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
          <div className="flex items-center justify-between">
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
            <Link href="/menu" className="p-2">
              <User size={24} className="text-gray-600" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center">
              <Logo variant="medium" />
            </Link>
            {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
          </div>
          <Link href="/menu" className="p-2">
            <User size={24} className="text-gray-600" />
          </Link>
        </div>
      )}
    </header>
  )
}


