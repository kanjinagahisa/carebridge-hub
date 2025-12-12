'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, Users, UsersRound, Network, Menu } from 'lucide-react'

const tabs = [
  { href: '/home', label: 'ホーム', icon: Home },
  { href: '/clients', label: '利用者', icon: Users },
  { href: '/groups', label: 'グループ', icon: UsersRound },
  { href: '/connections', label: 'つながり', icon: Network },
  { href: '/menu', label: 'メニュー', icon: Menu },
]

export default function TabBar() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // クライアントサイドでのみマウント状態を管理（ハイドレーションエラー対策）
  useEffect(() => {
    setMounted(true)
  }, [])

  // マウント前はpathnameを使用しない（サーバーとクライアントで一致させる）
  const getIsActive = (tabHref: string) => {
    if (!mounted || !pathname) return false
    return pathname === tabHref || pathname.startsWith(tabHref + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = getIsActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive ? 'text-primary' : 'text-gray-500'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs mt-1">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}


