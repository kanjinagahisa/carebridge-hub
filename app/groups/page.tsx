import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ROLES } from '@/lib/constants'
import GroupsListClient from './GroupsListClient'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

/**
 * グループ一覧ページ（Server Component）
 * データ取得を行い、Client Component に渡す
 */
export default async function GroupsPage() {
  console.log('[GroupsPage] Starting...')

  try {
    const supabase = await createClient()
    console.log('[GroupsPage] Supabase client created')

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
            console.log('[GroupsPage] Cookie value URL decoded')
          }

          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[GroupsPage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
              if (setSessionError) {
                console.error(
                  '[GroupsPage] Error setting session from cookie:',
                  setSessionError.message
                )
              } else if (setSessionData?.user) {
                console.log(
                  '[GroupsPage] Session set from cookie successfully, user:',
                  setSessionData.user.email
                )
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[GroupsPage] Error processing cookie value:', err)
        }
      }
    }

    // setSession()でuserが取得できなかった場合のみgetUser()を試みる
    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[GroupsPage] getUser result (fallback):', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserResult) {
        user = getUserResult
      }
    }

    if (!user) {
      console.log('[GroupsPage] No user found, returning login required message')
      return (
        <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
          <p className="text-gray-600">ログインが必要です。</p>
        </div>
      )
    }

    console.log('[GroupsPage] User authenticated:', user.id, user.email)

    // adminSupabaseクライアントを使用してRLSをバイパスし、確実に施設情報を取得
    const adminSupabase = createAdminClient()
    console.log('[GroupsPage] Fetching user facilities with admin client...')
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id, role, created_at, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false }) // 最新の施設を最初に取得

    console.log('[GroupsPage] User facilities result:', {
      hasError: !!facilitiesError,
      error: facilitiesError?.message,
      facilitiesCount: userFacilities?.length || 0,
    })

    if (facilitiesError) {
      console.error(
        '[GroupsPage] Error fetching user facilities with admin client:',
        facilitiesError
      )
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []
    // 最新の施設（最後に参加した施設）を表示
    const latestFacility = userFacilities?.[0]?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(latestFacility)
      ? latestFacility[0]?.name
      : (latestFacility as { name?: string } | null | undefined)?.name

    // ユーザーのロールを取得（admin かどうか）- 最新の施設のロールを使用
    const userRole = userFacilities?.[0]?.role
    const isAdmin = userRole === ROLES.ADMIN

    console.log('[GroupsPage] Facility info:', {
      facilityIdsCount: facilityIds.length,
      facilityName,
      isAdmin,
    })

    console.log('[GroupsPage] Rendering GroupsListClient with:', {
      facilityName,
      isAdmin,
    })

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* ページヘッダー */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2">
            {facilityName && (
              <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
            )}
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">グループ</h1>
              {/* 将来的なメニュー用のスペース（adminのみ、v1では未実装） */}
              {isAdmin && <div className="w-10" />}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">
            所属グループの一覧を確認できます。
          </p>
          <GroupsListClient />
        </div>
      </div>
    )
  } catch (error) {
    console.error('[GroupsPage] Unexpected error in Server Component:', error)
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
