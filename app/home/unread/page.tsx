import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import { PROFESSION_LABELS } from '@/lib/constants'

export default async function UnreadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // ユーザーの所属施設を取得
  const { data: userFacilities } = await supabase
    .from('user_facility_roles')
    .select('facility_id')
    .eq('user_id', user.id)
    .eq('deleted', false)

  const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []

  // グループを取得
  const { data: groups } = await supabase
    .from('groups')
    .select('id')
    .in('facility_id', facilityIds)
    .eq('deleted', false)

  const groupIds = groups?.map((g) => g.id) || []

  // 未読の投稿を取得
  const { data: unreadPosts } = await supabase
    .from('posts')
    .select(`
      *,
      author:users(display_name, profession),
      groups(id, name, clients(name))
    `)
    .in('group_id', groupIds)
    .eq('deleted', false)
    .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/home" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">未読</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {unreadPosts && unreadPosts.length > 0 ? (
          unreadPosts.map((post) => (
            <Link
              key={post.id}
              href={`/groups/${post.groups?.id}`}
              className="block bg-white rounded-xl shadow-sm p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {post.groups?.name || 'グループ'}
                  </p>
                  {post.groups?.clients && (
                    <p className="text-sm text-gray-500">
                      {Array.isArray(post.groups.clients) ? post.groups.clients[0]?.name : post.groups.clients.name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(post.created_at), 'MM/dd HH:mm', { locale: ja })}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-2 line-clamp-2">{post.body}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{post.author?.display_name || '不明'}</span>
                {post.author?.profession && (
                  <>
                    <span>•</span>
                    <span>{PROFESSION_LABELS[post.author.profession]}</span>
                  </>
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <p className="text-gray-600">未読のメッセージはありません。</p>
          </div>
        )}
      </div>
    </div>
  )
}

