'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-gray-50"
    >
      <LogOut size={20} className="text-red-600" />
      <span className="text-red-600 font-medium">ログアウト</span>
    </button>
  )
}


