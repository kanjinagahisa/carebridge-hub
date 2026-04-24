import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, Bookmark, Eye } from 'lucide-react'
import type { Post } from '@/types/carebridge'
import NewPostSummaryCard from '@/components/home/NewPostSummaryCard'
import Header from '@/components/Header'
import PushNotificationToggle from '@/components/PushNotificationToggle'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

/**
 * ホームページ（/home）
 * Server Component として実装
 * 最新投稿のまとめを表示（グループ投稿と利用者投稿の両方）
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ facility_id?: string }> | { facility_id?: string }
}) {
  console.log('[HomePage] Starting...')
  // searchParamsがPromiseの場合は解決する（Next.js 15対応）
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams
  const requestedFacilityId = resolvedSearchParams?.facility_id
  if (requestedFacilityId) {
    console.log('[HomePage] Facility ID from query parameter:', requestedFacilityId)
  }

  try {
    const supabase = await createClient()
    console.log('[HomePage] Supabase client created')

    let user: any = null
    // Cookieからセッションを明示的に設定を試みる（ミドルウェアと同じ処理）
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const authCookies = cookieStore.getAll().filter((cookie) =>
      cookie.name.includes('sb-') || cookie.name.includes('auth-token')
    )

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
                console.log('[HomePage] Session set from cookie successfully', { hasUser: true })
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

    console.log('[HomePage] User authenticated', { hasUser: true })

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

    // users.current_facility_id を取得し、所属施設に含まれていればそれを selectedFacilityId にする
    const { data: userRow } = await adminSupabase
      .from('users')
      .select('current_facility_id')
      .eq('id', user.id)
      .maybeSingle()
    const currentFacilityId = userRow?.current_facility_id ?? null
    const selectedFacilityId =
      requestedFacilityId && facilityIds.includes(requestedFacilityId)
        ? requestedFacilityId
        : currentFacilityId && facilityIds.includes(currentFacilityId)
        ? currentFacilityId
        : userFacilities?.[0]?.facility_id

    // selectedFacilityId に対応する施設情報を取得
    const selectedFacilityRow = userFacilities?.find((uf) => uf.facility_id === selectedFacilityId)
    const selectedFacilityData = selectedFacilityRow?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(selectedFacilityData)
      ? selectedFacilityData[0]?.name
      : (selectedFacilityData as { name?: string } | null | undefined)?.name

    console.log('[HomePage] Selected facility', { selectedFacilityId })
    console.log('[HomePage] facilities', { facilitiesCount: userFacilities?.length ?? 0 })

    if (!selectedFacilityId) {
      console.log('[HomePage] User has no facilities, redirecting to setup')
      redirect('/setup/choose')
    }

    // current_facility_id が未設定の場合のみ補完する（FacilitySwitcher の状態を壊さないため）
    if (!currentFacilityId && selectedFacilityId) {
      try {
        const { error: updErr } = await adminSupabase
          .from('users')
          .update({ current_facility_id: selectedFacilityId })
          .eq('id', user.id)
        if (updErr) {
          console.warn('[HomePage] Failed to initialize current_facility_id:', updErr)
        } else {
          console.log('[HomePage] current_facility_id initialized:', selectedFacilityId)
        }
      } catch (e) {
        console.warn('[HomePage] current_facility_id init exception:', e)
      }
    }

    // ログインユーザーが所属しているグループIDを取得（group_members ベース）
    console.log('[HomePage] Fetching group memberships for user:', user.id)
    const { data: memberRows, error: memberRowsError } = await adminSupabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .eq('deleted', false)
    if (memberRowsError) {
      console.error('[HomePage] Error fetching group memberships:', memberRowsError)
    }
    const myGroupIds = (memberRows ?? []).map((m: any) => m.group_id as string).filter(Boolean)

    let groupIds: string[] = []
    if (myGroupIds.length > 0) {
      const { data: groups, error: groupsError } = await adminSupabase
        .from('groups')
        .select('id')
        .in('id', myGroupIds)
        .eq('facility_id', selectedFacilityId)
        .eq('deleted', false)
      if (groupsError) {
        console.error('[HomePage] Error fetching groups with admin client:', groupsError)
      }
      groupIds = groups?.map((g) => g.id) || []
    }

    // 自施設の全クライアントを取得（最新の施設のクライアントのみ）
    console.log('[HomePage] Fetching clients for latest facility:', selectedFacilityId)
    const { data: clients, error: clientsError } = await adminSupabase
      .from('clients')
      .select('id, name')
      .eq('facility_id', selectedFacilityId)
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
          const [reactionsRes, readsRes] = await Promise.all([
            adminSupabase.from('post_reactions').select('post_id, type').in('post_id', postIds),
            adminSupabase.from('post_reads').select('post_id, user_id').in('post_id', postIds),
          ])
          const reactions = reactionsRes.data
          const reads = readsRes.data

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
      const [unreadGroupRes, unreadClientRes] = await Promise.all([
        adminSupabase
          .from('posts')
          .select('id')
          .in('group_id', groupIds)
          .eq('deleted', false)
          .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`),
        adminSupabase
          .from('posts')
          .select('id')
          .in('client_id', clientIds)
          .eq('deleted', false)
          .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`),
      ])
      unreadCount = (unreadGroupRes.data?.length || 0) + (unreadClientRes.data?.length || 0)
    }

    console.log('[HomePage] Rendering with:', {
      groupsCount: groupIds.length,
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

          {/* プッシュ通知設定 */}
          {process.env.NODE_ENV !== "production" && (
            <div className="bg-yellow-100 border-2 border-yellow-500 p-2 mb-2">
              <p className="text-xs text-yellow-800">デバッグ: PushNotificationToggle の前に到達</p>
            </div>
          )}
          <PushNotificationToggle />
          {process.env.NODE_ENV !== "production" && (
            <div className="bg-yellow-100 border-2 border-yellow-500 p-2 mt-2">
              <p className="text-xs text-yellow-800">デバッグ: PushNotificationToggle の後に到達</p>
            </div>
          )}

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

