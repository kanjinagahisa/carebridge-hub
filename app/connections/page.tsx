import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function ConnectionsPage() {
  const supabase = await createClient()
  
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
        }

        if (cookieValue.startsWith('{')) {
          const sessionData = JSON.parse(cookieValue)
          if (sessionData.access_token && sessionData.refresh_token) {
            const { data: setSessionData, error: setSessionError } =
              await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              })
            if (!setSessionError && setSessionData?.user) {
              user = setSessionData.user
            }
          }
        }
      } catch (err) {
        console.error('[ConnectionsPage] Error processing cookie value:', err)
      }
    }
  }

  if (!user) {
    const {
      data: { user: getUserResult },
      error: getUserError,
    } = await supabase.auth.getUser()

    if (getUserError || !getUserResult) {
      redirect('/login')
    }

    user = getUserResult
  }

  // adminSupabaseクライアントを使用してRLSをバイパス
  const adminSupabase = createAdminClient()
  
  // ユーザーの所属施設を取得
  const { data: userFacilities } = await adminSupabase
    .from('user_facility_roles')
    .select('facility_id, facilities(name)')
    .eq('user_id', user.id)
    .eq('deleted', false)

  const firstFacility = userFacilities?.[0]?.facilities
  const facilityName = Array.isArray(firstFacility)
    ? firstFacility[0]?.name
    : firstFacility?.name

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <Header title="つながり" facilityName={facilityName || undefined} />
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <p className="text-gray-600">つながり機能は今後実装予定です。</p>
        </div>
      </div>
    </div>
  )
}


