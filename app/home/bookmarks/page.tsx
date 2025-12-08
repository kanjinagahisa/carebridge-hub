import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import { PROFESSION_LABELS } from '@/lib/constants'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // しおり登録された投稿を取得
  const { data: bookmarks } = await supabase
    .from('post_bookmarks')
    .select(`
      *,
      posts(
        *,
        author:users(display_name, profession),
        groups(id, name, clients(name))
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const posts = bookmarks
    ?.map((b) => b.posts)
    .filter((p) => p && !p.deleted)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/home" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">しおり</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {posts.length > 0 ? (
          posts.map((post: any) => (
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
              <p className="text-sm text-gray-700 mb-2 line-clamp-3">{post.body}</p>
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
            <p className="text-gray-600">しおり登録されたメッセージはありません。</p>
          </div>
        )}
      </div>
    </div>
  )
}

