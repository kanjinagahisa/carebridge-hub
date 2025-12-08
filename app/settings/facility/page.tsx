import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ROLES } from '@/lib/constants'
import { getUserRole } from '@/lib/utils/auth-server'
import FacilityBasicInfoCard from '@/components/settings/FacilityBasicInfoCard'
import StaffManagementCard from '@/components/settings/StaffManagementCard'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function FacilitySettingsPage() {
  console.log('[FacilitySettingsPage] Starting...')

  try {
    const supabase = await createClient()
    console.log('[FacilitySettingsPage] Supabase client created')

    // クッキーからセッションを設定する（ミドルウェアと同じ処理）
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
          // URLデコード
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            console.log('[FacilitySettingsPage] Cookie value URL decoded')
          }

          // JSON形式の場合、パースしてセッションを設定
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[FacilitySettingsPage] Found JSON session data in cookie, setting session...')
              try {
                const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
                if (setSessionError) {
                  console.error('[FacilitySettingsPage] Error setting session from cookie:', setSessionError.message)
                } else if (setSessionData?.user) {
                  console.log('[FacilitySettingsPage] Session set from cookie successfully, user:', setSessionData.user.email)
                  user = setSessionData.user
                }
              } catch (setSessionErr: any) {
                console.error('[FacilitySettingsPage] Exception setting session:', setSessionErr.message)
                // 接続タイムアウトなどのエラーが発生した場合、getUser()を試す
              }
            }
          }
        } catch (err) {
          console.error('[FacilitySettingsPage] Error processing cookie value:', err)
        }
      }
    }

    // セッションが設定できなかった場合、getUser()を試す
    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[FacilitySettingsPage] getUser result:', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserResult) {
        user = getUserResult
      }
    }

    if (!user) {
      console.log('[FacilitySettingsPage] No user found, redirecting to login')
      redirect('/login')
    }

    console.log('[FacilitySettingsPage] User authenticated:', user.id, user.email)

    // adminSupabaseクライアントを使用してRLSをバイパスし、確実に施設情報を取得
    const adminSupabase = createAdminClient()
    console.log('[FacilitySettingsPage] Fetching user facilities with admin client...')
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id, role, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)

    console.log('[FacilitySettingsPage] User facilities result:', {
      hasError: !!facilitiesError,
      error: facilitiesError?.message,
      facilitiesCount: userFacilities?.length || 0,
    })

    if (facilitiesError) {
      console.error(
        '[FacilitySettingsPage] Error fetching user facilities with admin client:',
        facilitiesError
      )
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []

    if (facilityIds.length === 0) {
      return (
        <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-gray-600">施設に所属していません。管理者に連絡してください。</p>
            <Link
              href="/home"
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      )
    }

    // ユーザーのロールを取得（admin/staff判定用）
    const userRole = await getUserRole(user.id, facilityIds[0])
    const isAdminUser = userRole === ROLES.ADMIN

    // staffユーザーはアクセス不可
    if (!isAdminUser) {
      console.log('[FacilitySettingsPage] User is not admin, redirecting to home')
      redirect('/home')
    }

    // 最初の施設を取得（複数施設の場合は最初の施設を表示）
    const firstFacilityId = facilityIds[0]
    const firstFacility = userFacilities?.[0]?.facilities as { name: string } | { name: string }[] | null | undefined
    const facilityName = Array.isArray(firstFacility)
      ? firstFacility[0]?.name
      : (firstFacility as { name: string } | null | undefined)?.name

    // 施設情報を取得
    console.log('[FacilitySettingsPage] Fetching facility info for:', firstFacilityId)
    const { data: facility, error: facilityError } = await adminSupabase
      .from('facilities')
      .select('*')
      .eq('id', firstFacilityId)
      .eq('deleted', false)
      .single()

    if (facilityError) {
      console.error('[FacilitySettingsPage] Error fetching facility:', facilityError)
      return (
        <div className="min-h-screen bg-gray-100 pb-20 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
            <p className="text-red-600">施設情報の取得に失敗しました。</p>
            <Link
              href="/home"
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      )
    }

    // スタッフ一覧を取得
    console.log('[FacilitySettingsPage] Fetching staff members for facility:', firstFacilityId)
    const { data: staffMembersData, error: staffError } = await adminSupabase
      .from('user_facility_roles')
      .select('user_id, role, users(display_name, email)')
      .eq('facility_id', firstFacilityId)
      .eq('deleted', false)

    // データをStaffMember型に変換（usersが配列の場合、最初の要素を使用）
    const staffMembers = (staffMembersData || []).map((member: any) => ({
      user_id: member.user_id,
      role: member.role,
      users: Array.isArray(member.users) ? member.users[0] : member.users,
    }))

    if (staffError) {
      console.error('[FacilitySettingsPage] Error fetching staff members:', staffError)
    }

    console.log('[FacilitySettingsPage] Rendering with:', {
      facilityId: firstFacilityId,
      facilityName,
      staffCount: staffMembers?.length || 0,
    })

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* PageHeader */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2">
            {facilityName && (
              <p className="text-xs text-gray-500 mb-1">{facilityName}</p>
            )}
            <div className="flex items-center justify-between">
              <Link
                href="/home"
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={20} className="inline-block mr-1" />
                <span className="text-sm">ホームへ</span>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center -ml-8">
                施設設定
              </h1>
              <div className="w-10" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <FacilityBasicInfoCard
            facility={facility}
          />
          <StaffManagementCard
            staffMembers={staffMembers || []}
            facilityId={firstFacilityId}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('[FacilitySettingsPage] Unexpected error:', error)
    redirect('/login')
  }
}


