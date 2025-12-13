import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, Bookmark, Eye } from 'lucide-react'
import type { Post } from '@/types/carebridge'
import NewPostSummaryCard from '@/components/home/NewPostSummaryCard'
import Header from '@/components/Header'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

/**
 * ホームページ（/home）
 * Server Component として実装
 * 最新投稿のまとめを表示（グループ投稿と利用者投稿の両方）
 */
export default async function HomePage() {
  console.log('[HomePage] Starting...')

  try {
    const supabase = await createClient()
    console.log('[HomePage] Supabase client created')

    // Cookieからセッションを明示的に設定を試みる（ミドルウェアと同じ処理）
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const authCookies = cookieStore.getAll().filter((cookie) =>
      cookie.name.includes('sb-') || cookie.name.includes('auth-token')
    )

    let user: any = null

    if (authCookies.length > 0) {
      const authTokenCookie = authCookies.find((c) => c.name.includes('auth-token'))
      if (authTokenCookie && authTokenCookie.value) {
        try {
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            console.log('[HomePage] Cookie value URL decoded')
          }

          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[HomePage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
              if (setSessionError) {
                console.error(
                  '[HomePage] Error setting session from cookie:',
                  setSessionError.message
                )
              } else if (setSessionData?.user) {
                console.log(
                  '[HomePage] Session set from cookie successfully, user:',
                  setSessionData.user.email
                )
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[HomePage] Error processing cookie value:', err)
        }
      }
    }

    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      if (getUserError || !getUserResult) {
        console.log('[HomePage] No user found, redirecting to login')
        redirect('/login')
      }

      user = getUserResult
    }

    console.log('[HomePage] User authenticated:', user.id, user.email)

    // adminSupabaseクライアントを使用してRLSをバイパス
    const adminSupabase = createAdminClient()

    // ユーザーの所属施設を取得（最新の施設を優先的に表示するため、created_atで降順にソート）
    console.log('[HomePage] Fetching user facilities with admin client...')
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id, created_at, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false }) // 最新の施設を最初に取得

    if (facilitiesError) {
      console.error('[HomePage] Error fetching user facilities with admin client:', facilitiesError)
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []
    // 最新の施設（最初に参加した施設）を表示
    const latestFacility = userFacilities?.[0]?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(latestFacility)
      ? latestFacility[0]?.name
      : (latestFacility as { name?: string } | null | undefined)?.name
    console.log('[HomePage] User facility IDs:', facilityIds)
    console.log('[HomePage] Latest facility name:', facilityName)
    console.log('[HomePage] All facilities:', userFacilities?.map((uf) => ({
      facility_id: uf.facility_id,
      created_at: uf.created_at,
      name: Array.isArray(uf.facilities) ? uf.facilities[0]?.name : (uf.facilities as { name?: string } | null | undefined)?.name
    })))

    if (facilityIds.length === 0) {
      console.log('[HomePage] User has no facilities, redirecting to setup')
      redirect('/setup/choose')
    }

    // 自施設の全グループを取得
    console.log('[HomePage] Fetching groups for facilities:', facilityIds)
    const { data: groups, error: groupsError } = await adminSupabase
      .from('groups')
      .select('id')
      .in('facility_id', facilityIds)
      .eq('deleted', false)

    if (groupsError) {
      console.error('[HomePage] Error fetching groups with admin client:', groupsError)
    }
    const groupIds = groups?.map((g) => g.id) || []

    // 自施設の全クライアントを取得
    console.log('[HomePage] Fetching clients for facilities:', facilityIds)
    const { data: clients, error: clientsError } = await adminSupabase
      .from('clients')
      .select('id, name')
      .in('facility_id', facilityIds)
      .eq('deleted', false)

    if (clientsError) {
      console.error('[HomePage] Error fetching clients with admin client:', clientsError)
    }
    const clientIds = clients?.map((c) => c.id) || []

    // グループIDとクライアントIDリストから最新投稿を取得
    let recentPosts: (Post & {
      groups?: { name: string } | null
      clients?: { name: string } | null
      author?: { display_name: string } | null
      type_label?: string
      link_path?: string
      isUnread?: boolean
    })[] = []

    if (groupIds.length > 0 || clientIds.length > 0) {
      console.log('[HomePage] Fetching recent posts for groups and clients...')
      const { data: posts, error: postsError } = await adminSupabase
        .from('posts')
        .select(`
          *,
          groups(name),
          clients(name),
          author:users(display_name)
        `)
        .or(`group_id.in.(${groupIds.join(',')}),client_id.in.(${clientIds.join(',')})`)
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .limit(30)

      if (postsError) {
        console.error('[HomePage] Error fetching posts with admin client:', postsError)
      } else {
        recentPosts = (posts as any[]).map((post) => ({
          ...post,
          postType: post.group_id ? 'group' : 'client',
        })) || []

        // いいね数と既読数を取得
        if (recentPosts.length > 0) {
          const postIds = recentPosts.map((p) => p.id)
          const { data: reactions } = await adminSupabase
            .from('post_reactions')
            .select('post_id, type')
            .in('post_id', postIds)

          const { data: reads } = await adminSupabase
            .from('post_reads')
            .select('post_id, user_id')
            .in('post_id', postIds)

          // 投稿にリアクションと既読情報を追加
          recentPosts = recentPosts.map((post) => {
            const postReads = reads?.filter((r) => r.post_id === post.id) || []
            const isReadByCurrentUser = postReads.some((r) => r.user_id === user.id)
            return {
              ...post,
              reactions: (reactions?.filter((r) => r.post_id === post.id) || []) as any,
              reads: postReads as any,
              isUnread: !isReadByCurrentUser,
            }
          })
        }
      }
    }

    // 未読メッセージ数を取得
    let unreadCount = 0
    if (groupIds.length > 0 || clientIds.length > 0) {
      const { data: unreadGroupPosts } = await adminSupabase
        .from('posts')
        .select('id')
        .in('group_id', groupIds)
        .eq('deleted', false)
        .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`)

      const { data: unreadClientPosts } = await adminSupabase
        .from('posts')
        .select('id')
        .in('client_id', clientIds)
        .eq('deleted', false)
        .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`)

      unreadCount = (unreadGroupPosts?.length || 0) + (unreadClientPosts?.length || 0)
    }

    console.log('[HomePage] Rendering with:', {
      groupsCount: groups?.length || 0,
      clientsCount: clients?.length || 0,
      recentPostsCount: recentPosts.length,
      unreadCount,
    })

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <Header title="ホーム" facilityName={facilityName || undefined} />

        <div className="p-4 space-y-4">
          {/* お知らせ */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-900 mb-2">お知らせ</h2>
            <p className="text-sm text-gray-600">
              現在、お知らせはありません。
            </p>
          </div>

          {/* 未読・しおりボタン */}
          <div className="flex gap-3">
            <Link
              href="/home/unread"
              className="flex-1 bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">未読</p>
                  <p className="text-xs text-gray-500">未読のメッセージ</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-sm px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/home/bookmarks"
              className="flex-1 bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Bookmark size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">しおり</p>
                <p className="text-xs text-gray-500">保存した投稿</p>
              </div>
            </Link>
          </div>

          {/* 新着投稿まとめリスト */}
          {recentPosts.length > 0 ? (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900 px-1">新着投稿</h2>
              {recentPosts.map((post) => (
                <NewPostSummaryCard 
                  key={post.id} 
                  post={post} 
                  currentUserId={user.id}
                  isUnread={post.isUnread}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-gray-600">まだ投稿がありません。</p>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('[HomePage] Unexpected error:', error)
    redirect('/login')
  }
}

