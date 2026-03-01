import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ClientsListClient from './ClientsListClient'
import type { Client } from '@/types/carebridge'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

/**
 * 利用者一覧ページ（Server Component）
 * データ取得を行い、Client Component に渡す
 */
export default async function ClientsPage() {
  if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Starting...')
  const perf = process.env.PERF_LOG === '1'
  const t = (label: string) => perf && console.time(label)
  const te = (label: string) => perf && console.timeEnd(label)
  t('[perf][clients] total')

  try {
    t('[perf][clients] createClient')
    const supabase = await createClient()
    te('[perf][clients] createClient')
    if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Supabase client created')
    
    t('[perf][clients] auth')
    // Cookieからセッションを明示的に設定を試みる（ミドルウェアと同じ処理）
    t('[perf][clients] auth.cookies_import')
    const { cookies } = await import('next/headers')
    te('[perf][clients] auth.cookies_import')
    t('[perf][clients] auth.cookies_read')
    const cookieStore = await cookies()
    te('[perf][clients] auth.cookies_read')
    t('[perf][clients] auth.cookies_filter')
    const authCookies = cookieStore.getAll().filter((cookie) => 
      cookie.name.includes('sb-') || cookie.name.includes('auth-token')
    )
    te('[perf][clients] auth.cookies_filter')
    
    let user: any = null
    
    if (authCookies.length > 0) {
      const authTokenCookie = authCookies.find(c => c.name.includes('auth-token'))
      if (authTokenCookie && authTokenCookie.value) {
        try {
          // Cookieの値をURLデコード
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Cookie value URL decoded')
          }

          // JSON文字列として解析
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Attempting to set session from cookie')
              t('[perf][clients] auth.setSession')
              const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              })
              te('[perf][clients] auth.setSession')
              if (setSessionError) {
                console.error('[ClientsPage] Error setting session from cookie:', setSessionError.message)
              } else if (setSessionData?.user) {
                if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Session set from cookie successfully, user:', setSessionData.user.email)
                // setSession()の結果から直接userを取得
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[ClientsPage] Error processing cookie value:', err)
        }
      }
    }
    
    // setSession()でuserが取得できなかった場合のみgetUser()を試みる
    if (!user && authCookies.length === 0) {
      t('[perf][clients] auth.getUser_fallback')
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()
      te('[perf][clients] auth.getUser_fallback')

      if (process.env.NODE_ENV !== 'production') {
        console.log('[ClientsPage] getUser result:', {
          hasUser: !!getUserResult,
          userId: getUserResult?.id,
          getUserError: getUserError?.message,
        })
      }

      if (getUserResult) {
        user = getUserResult
      }
    }
    te('[perf][clients] auth')

    if (!user) {
      if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] No user found, returning null')
      return (
        <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
          <p className="text-gray-600">ログインが必要です。</p>
        </div>
      )
    }

    if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] User authenticated:', user.id, user.email)

    // Server ComponentではCookieの書き込みが制限されているため、
    // setSession()で設定したセッションがCookieに保存されず、
    // その後のクエリで使用できない
    // そのため、adminSupabaseを使用してRLSをバイパスする
    // （ミドルウェアと同じ方法）
    const adminSupabase = createAdminClient()
    
    // ユーザーの所属施設を取得（最新の施設を優先的に表示するため、created_atで降順にソート）
    if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Fetching user facilities with admin client...')
    t('[perf][clients] ufr')
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id, created_at, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false }) // 最新の施設を最初に取得

    te('[perf][clients] ufr')
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ClientsPage] User facilities result:', {
        hasError: !!facilitiesError,
        error: facilitiesError?.message,
        facilitiesCount: userFacilities?.length || 0,
      })
    }

    if (facilitiesError) {
      console.error('[ClientsPage] Error fetching user facilities:', facilitiesError)
    }

    // 最新の施設（最後に参加した施設）を表示
    const latestFacility = userFacilities?.[0]?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(latestFacility)
      ? latestFacility[0]?.name
      : (latestFacility as { name?: string } | null | undefined)?.name
    
    // 最新の施設IDのみを取得（表示されている施設名に対応する施設）
    const latestFacilityId = userFacilities?.[0]?.facility_id

    if (process.env.NODE_ENV !== 'production') {
      console.log('[ClientsPage] Facility info:', {
        latestFacilityId,
        facilityName,
        allFacilities: userFacilities?.map((uf) => ({
          facility_id: uf.facility_id,
          created_at: uf.created_at,
          name: Array.isArray(uf.facilities) ? uf.facilities[0]?.name : (uf.facilities as { name?: string } | null | undefined)?.name
        }))
      })
    }

    // 利用者を取得（最新の施設の利用者のみ）
    let clients: Client[] = []
    let clientsError: any = null

    if (latestFacilityId) {
      t('[perf][clients] clients_select')
      if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Fetching clients for latest facility:', latestFacilityId)
      // adminSupabaseを使用してRLSをバイパス
      const { data, error } = await adminSupabase
        .from('clients')
        .select('*')
        .eq('facility_id', latestFacilityId)
        .eq('deleted', false)
        .order('name', { ascending: true })

      if (error) {
        console.error('[ClientsPage] Error fetching clients:', error)
        clientsError = error
      } else {
        clients = (data as Client[]) || []
        if (process.env.NODE_ENV !== 'production') {
          console.log('[ClientsPage] Fetched clients:', {
            count: clients.length,
            facilityId: latestFacilityId,
            facilityName,
          })
        }
      }
      te('[perf][clients] clients_select')
    } else {
      if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] No latest facility ID found, skipping clients fetch')
    }

    // 利用者ごとの最新投稿と未読数を取得
    const clientIds = clients.map((c) => c.id)
    let clientPostsMap: Record<string, any> = {}
    let unreadCountsMap: Record<string, number> = {}

    if (clientIds.length > 0 && user) {
      t('[perf][clients] latest_posts')
      if (process.env.NODE_ENV !== 'production') console.log('[ClientsPage] Fetching latest posts and unread counts for clients')
      
      // 各利用者の最新投稿を取得
      const { data: latestPosts } = await adminSupabase
        .from('posts')
        .select(`
          id,
          client_id,
          body,
          created_at,
          author:users(display_name)
        `)
        .in('client_id', clientIds)
        .eq('deleted', false)
        .order('created_at', { ascending: false })

      // 利用者ごとに最新投稿をグループ化
      if (latestPosts) {
        const postsByClient: Record<string, any> = {}
        latestPosts.forEach((post: any) => {
          if (post.client_id && !postsByClient[post.client_id]) {
            postsByClient[post.client_id] = post
          }
        })
        clientPostsMap = postsByClient
      }
      te('[perf][clients] latest_posts')

      // 未読数を取得
      t('[perf][clients] unread_posts')
      const { data: unreadPosts } = await adminSupabase
        .from('posts')
        .select('id, client_id')
        .in('client_id', clientIds)
        .eq('deleted', false)
        .not('id', 'in', `(SELECT post_id FROM post_reads WHERE user_id = '${user.id}')`)

      // 利用者ごとに未読数を集計
      if (unreadPosts) {
        const counts: Record<string, number> = {}
        unreadPosts.forEach((post: any) => {
          if (post.client_id) {
            counts[post.client_id] = (counts[post.client_id] || 0) + 1
          }
        })
        unreadCountsMap = counts
      }
      te('[perf][clients] unread_posts')
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[ClientsPage] Rendering ClientsListClient with:', {
        clientsCount: clients.length,
        facilityName,
        hasError: !!clientsError,
        postsMapSize: Object.keys(clientPostsMap).length,
        unreadCountsSize: Object.keys(unreadCountsMap).length,
      })
    }

    te('[perf][clients] total')
    return (
      <ClientsListClient
        initialClients={clients}
        facilityName={facilityName || undefined}
        error={clientsError}
        clientPostsMap={clientPostsMap}
        unreadCountsMap={unreadCountsMap}
        currentUserId={user.id}
      />
    )
  } catch (error) {
    console.error('[ClientsPage] Unexpected error:', error)
    return (
      <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
          <p className="text-gray-600">エラーが発生しました。</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : '予期しないエラー'}
          </p>
        </div>
      </div>
    )
  }
}
