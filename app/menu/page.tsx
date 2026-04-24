import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, FileText, Shield, UserPlus, Settings, Bell } from 'lucide-react'
import { PROFESSION_LABELS, ROLES } from '@/lib/constants'
import LogoutButton from '@/components/LogoutButton'
import FacilitySwitcher from '@/components/menu/FacilitySwitcher'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  console.log('[MenuPage] Starting...')
  
  try {
    const supabase = await createClient()
    console.log('[MenuPage] Supabase client created')
    
    // Cookieからセッションを明示的に設定を試みる（ミドルウェアと同じ処理）
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const authCookies = cookieStore.getAll().filter((cookie) => 
      cookie.name.includes('sb-') || cookie.name.includes('auth-token')
    )
    
    let user: any = null
    
    if (authCookies.length > 0) {
      const authTokenCookie = authCookies.find(c => c.name.includes('auth-token'))
      if (authTokenCookie && authTokenCookie.value) {
        try {
          // Cookieの値をURLデコード
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            console.log('[MenuPage] Cookie value URL decoded')
          }

          // JSON文字列として解析
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[MenuPage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              })
              if (setSessionError) {
                console.error('[MenuPage] Error setting session from cookie:', setSessionError.message)
              } else if (setSessionData?.user) {
                console.log('[MenuPage] Session set from cookie successfully', { hasUser: true })
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[MenuPage] Error processing cookie value:', err)
        }
      }
    }
    
    // setSession()でuserが取得できなかった場合のみgetUser()を試みる
    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[MenuPage] getUser result (fallback):', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserResult) {
        user = getUserResult
      }
    }

    if (!user) {
      console.log('[MenuPage] No user found, redirecting to login')
      redirect('/login')
    }

    console.log('[MenuPage] User authenticated', { hasUser: true })

    // プロフィール取得と管理者判定のため、adminSupabaseを使用してRLSをバイパス
    console.log('[MenuPage] Fetching profile and user role with admin client...')
    const adminSupabase = createAdminClient()
    
    // プロフィールを取得（adminSupabaseを使用してRLSをバイパス）
    const { data: profile, error: profileError } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('deleted', false)
      .single()

    if (profileError) {
      console.error('[MenuPage] Error fetching profile:', profileError)
      console.error('[MenuPage] Profile error details:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
      })
    } else {
      console.log('[MenuPage] Profile fetched successfully:', {
        display_name: profile?.display_name,
        profession: profile?.profession,
      })
    }
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('role, facility_id, created_at, facilities(name)')
      .eq('user_id', user.id)
      .eq('deleted', false)
      .order('created_at', { ascending: false }) // 最新の施設を最初に取得

    if (facilitiesError) {
      console.error('[MenuPage] Error fetching user facilities:', facilitiesError)
      console.error('[MenuPage] Error details:', {
        message: facilitiesError.message,
        code: facilitiesError.code,
        details: facilitiesError.details,
        hint: facilitiesError.hint,
      })
    }

    // current_facility_id を取得し、所属施設に含まれていれば selectedFacilityId にする
    const currentFacilityId = profile?.current_facility_id || null
    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []
    const selectedFacilityId =
      currentFacilityId && facilityIds.includes(currentFacilityId)
        ? currentFacilityId
        : userFacilities?.[0]?.facility_id ?? null

    // selectedFacilityId に対応する施設情報を取得
    const selectedFacilityRow = userFacilities?.find((uf) => uf.facility_id === selectedFacilityId)
    const selectedFacilityData = selectedFacilityRow?.facilities as { name?: string } | { name?: string }[] | null | undefined
    const facilityName = Array.isArray(selectedFacilityData)
      ? selectedFacilityData[0]?.name
      : (selectedFacilityData as { name?: string } | null | undefined)?.name

    // isAdmin は selectedFacilityId に対応するロールで判定
    const isAdmin = selectedFacilityRow?.role === ROLES.ADMIN

    console.log('[MenuPage] User facilities count:', userFacilities?.length || 0)
    console.log('[MenuPage] User roles:', userFacilities?.map((uf) => uf.role) || [])
    console.log('[MenuPage] User is admin:', isAdmin)
    console.log('[MenuPage] Selected facility ID:', selectedFacilityId)

    // 施設切り替えUI用のデータを準備
    const facilitiesForSwitcher = userFacilities?.map((uf) => {
      const facility = uf.facilities as { name?: string } | { name?: string }[] | null | undefined
      const facilityName = Array.isArray(facility)
        ? facility[0]?.name
        : (facility as { name?: string } | null | undefined)?.name
      return {
        facility_id: uf.facility_id,
        name: facilityName || '施設名不明',
        role: uf.role === ROLES.ADMIN ? '管理者' : 'スタッフ',
        isCurrent: uf.facility_id === currentFacilityId,
      }
    }) || []

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        <Header title="メニュー" facilityName={facilityName || undefined} />

        <div className="p-4 space-y-4">
          {/* プロフィール */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-4 mb-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={32} className="text-gray-400" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-gray-900">{profile?.display_name || 'ユーザー'}</h2>
                <p className="text-sm text-gray-500">
                  {profile?.profession ? PROFESSION_LABELS[profile.profession] : ''}
                </p>
              </div>
            </div>
            <Link
              href="/menu/profile"
              className="block w-full text-center py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              プロフィール編集
            </Link>
          </div>

          {/* 施設切り替え */}
          {facilitiesForSwitcher.length > 1 && (
            <FacilitySwitcher
              facilities={facilitiesForSwitcher}
              currentUserId={user.id}
            />
          )}

          {/* メニュー項目 */}
          <div className="bg-white rounded-xl shadow-sm">
            {isAdmin && selectedFacilityId && (
              <>
                <Link
                  href={`/settings/facility/invite?facility_id=${selectedFacilityId}`}
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50"
                >
                  <UserPlus size={20} className="text-gray-600" />
                  <span className="text-gray-900">招待</span>
                </Link>
              </>
            )}
            {selectedFacilityId && (
              <Link
                href={`/settings/facility?facility_id=${selectedFacilityId}`}
                className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50"
              >
                <Settings size={20} className="text-gray-600" />
                <span className="text-gray-900">施設設定</span>
              </Link>
            )}
            <Link
              href="/settings/notifications"
              className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="text-gray-900">通知設定</span>
            </Link>
            <Link
              href="/terms"
              className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50"
            >
              <FileText size={20} className="text-gray-600" />
              <span className="text-gray-900">利用規約</span>
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-3 p-4 hover:bg-gray-50"
            >
              <Shield size={20} className="text-gray-600" />
              <span className="text-gray-900">プライバシーポリシー</span>
            </Link>
          </div>

          {/* ログアウト */}
          <LogoutButton />
        </div>
      </div>
    )
  } catch (error) {
    console.error('[MenuPage] Unexpected error in Server Component:', error)
    redirect('/login')
  }
}


