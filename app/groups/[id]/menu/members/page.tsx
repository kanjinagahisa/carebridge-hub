import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import MembersSearch from './MembersSearch'

export const dynamic = 'force-dynamic'

/**
 * グループメンバー一覧（/groups/[id]/menu/members）
 * Server Component。実データを表示する。
 */
export default async function GroupMembersPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // 呼び出しユーザーがこのグループの active member であることを確認
  const { data: membership } = await admin
    .from('group_members')
    .select('id')
    .eq('group_id', params.id)
    .eq('user_id', user.id)
    .eq('deleted', false)
    .maybeSingle()

  if (!membership) notFound()

  const { data: members, error } = await admin
    .from('group_members')
    .select('role, user:users(id, display_name, profession)')
    .eq('group_id', params.id)
    .eq('deleted', false)

  if (error) {
    console.error('[GroupMembersPage] Error fetching members:', error)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <Link
              href={`/groups/${params.id}/menu`}
              className="p-2 -ml-2 flex items-center gap-1"
            >
              <ChevronLeft size={20} className="text-gray-600" />
              <span className="text-sm text-gray-600">戻る</span>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">メンバー</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <MembersSearch members={(members ?? []) as any} />
    </div>
  )
}
