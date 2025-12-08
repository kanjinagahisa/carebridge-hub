import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MoreVertical } from 'lucide-react'
import type { Group, Post } from '@/types/carebridge'
import GroupTimeline from '@/components/groups/GroupTimeline'
import { ROLES } from '@/lib/constants'

/**
 * グループタイムラインページ（/groups/[id]）
 * Server Component として実装
 */
export default async function GroupTimelinePage({
  params,
}: {
  params: { id: string }
}) {
  console.log('[GroupTimelinePage] Starting for group ID:', params.id)

  try {
    const supabase = await createClient()
    console.log('[GroupTimelinePage] Supabase client created')

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
            console.log('[GroupTimelinePage] Cookie value URL decoded')
          }

          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[GroupTimelinePage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
              if (setSessionError) {
                console.error(
                  '[GroupTimelinePage] Error setting session from cookie:',
                  setSessionError.message
                )
              } else if (setSessionData?.user) {
                console.log(
                  '[GroupTimelinePage] Session set from cookie successfully, user:',
                  setSessionData.user.email
                )
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[GroupTimelinePage] Error processing cookie value:', err)
        }
      }
    }

    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[GroupTimelinePage] getUser result (fallback):', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserResult) {
        user = getUserResult
      }
    }

    if (!user) {
      console.log('[GroupTimelinePage] No user found, redirecting to login')
      redirect('/login')
    }

    console.log('[GroupTimelinePage] User authenticated:', user.id, user.email)

    // ユーザーのロールを取得 (admin client を使用して RLS をバイパス)
    console.log('[GroupTimelinePage] Fetching user role with admin client...')
    const adminSupabase = createAdminClient()
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('role, facility_id, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .limit(1) // 任意の1つのロールで十分

    if (facilitiesError) {
      console.error('[GroupTimelinePage] Error fetching user facilities:', facilitiesError)
    }

    const userRole = userFacilities && userFacilities.length > 0
      ? (userFacilities[0].role as 'admin' | 'staff')
      : null
    const isAdmin = userRole === ROLES.ADMIN
    console.log('[GroupTimelinePage] User role:', userRole, 'isAdmin:', isAdmin)

    const firstFacility = userFacilities?.[0]?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(firstFacility)
      ? firstFacility[0]?.name
      : (firstFacility as { name?: string } | null | undefined)?.name

    // グループ情報を取得 (admin client を使用して RLS をバイパス)
    console.log('[GroupTimelinePage] Fetching group with admin client for group ID:', params.id)
    const { data: group, error: groupError } = await adminSupabase
      .from('groups')
      .select('*, clients(name), facilities(name)')
      .eq('id', params.id)
      .eq('deleted', false)
      .single()

    if (groupError) {
      console.error('[GroupTimelinePage] Error fetching group:', groupError)
      notFound()
    }
    if (!group) {
      console.log('[GroupTimelinePage] Group not found for ID:', params.id)
      notFound()
    }
    console.log('[GroupTimelinePage] Fetched group:', group.name)

    // 投稿を取得 (admin client を使用して RLS をバイパス)
    console.log('[GroupTimelinePage] Fetching posts with admin client for group ID:', params.id)
    const { data: posts, error: postsError } = await adminSupabase
      .from('posts')
      .select(`
        *,
        author:users(display_name, profession),
        reactions:post_reactions(*),
        reads:post_reads(user_id),
        attachments(*)
      `)
      .eq('group_id', params.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (postsError) {
      console.error('[GroupTimelinePage] Error fetching posts:', postsError)
    }
    console.log('[GroupTimelinePage] Fetched posts count:', posts?.length || 0)

    // タイムラインを開いた時点で既読を登録 (Server Componentで実行)
    if (posts && posts.length > 0) {
      const postsToMarkRead = posts
        .filter((post) => !post.reads?.some((r: any) => r.user_id === user.id))
        .map((post) => ({
          post_id: post.id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        }))

      if (postsToMarkRead.length > 0) {
        console.log('[GroupTimelinePage] Marking posts as read:', postsToMarkRead.length)
        const { error: readError } = await supabase.from('post_reads').insert(postsToMarkRead)
        if (readError) {
          console.error('[GroupTimelinePage] Error marking posts as read:', readError)
        }
      }
    }

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* ヘッダー */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2">
            {facilityName && (
              <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
            )}
            <div className="flex items-center justify-between">
              <Link href="/groups" className="p-2 -ml-2 flex items-center gap-1">
                <ChevronLeft size={20} className="text-gray-600" />
                <span className="text-sm text-gray-600">グループ一覧へ</span>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center -ml-8">
                {group.name}
              </h1>
              {/* 右（adminのみ）：グループ編集・メンバー管理（将来用、v1では未実装） */}
              {isAdmin ? (
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              ) : (
                <div className="w-10" />
              )}
            </div>
          </div>
        </div>

        <div className="p-4">
          <GroupTimeline
            groupId={params.id}
            currentUserId={user.id}
            initialPosts={posts as Post[] || []}
            userRole={userRole}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('[GroupTimelinePage] Unexpected error:', error)
    redirect('/login')
  }
}
