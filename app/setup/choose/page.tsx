import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function SetupChoosePage() {
  // ログを同期的に出力するために、エラーハンドリングの前に出力
  try {
    console.log('[SetupChoosePage] ========================================')
    console.log('[SetupChoosePage] Starting...')
    const supabase = await createClient()
    console.log('[SetupChoosePage] Supabase client created')

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
            console.log('[SetupChoosePage] Cookie value URL decoded')
          }

          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[SetupChoosePage] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } =
                await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
              if (setSessionError) {
                console.error(
                  '[SetupChoosePage] Error setting session from cookie:',
                  setSessionError.message
                )
              } else if (setSessionData?.user) {
                console.log(
                  '[SetupChoosePage] Session set from cookie successfully, user:',
                  setSessionData.user.email
                )
                user = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[SetupChoosePage] Error processing cookie value:', err)
        }
      }
    }

    // セッションが設定できなかった場合、getUser()を試す
    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[SetupChoosePage] getUser result:', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserError || !getUserResult) {
        console.log('[SetupChoosePage] No user found, showing setup page')
        // 未ログインの場合はセットアップ画面を表示
        return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="mb-8 text-center">
                <Logo />
                <p className="mt-4 text-gray-600">施設のセットアップ</p>
              </div>

              <div className="space-y-4">
                <Link href="/setup/create">
                  <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    新しい施設を作成する
                  </button>
                </Link>

                <div className="flex items-center justify-center">
                  <span className="h-px w-full bg-gray-200" />
                  <span className="px-3 text-xs text-gray-500">または</span>
                  <span className="h-px w-full bg-gray-200" />
                </div>

                <Link href="/setup/join">
                  <button className="w-full border border-gray-300 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    招待リンクで既存施設に参加する
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
      }

      user = getUserResult
    }

    console.log('[SetupChoosePage] User authenticated:', user.id, user.email)

    // ログイン済みの場合、既に施設に所属しているかチェック
    const adminSupabase = createAdminClient()
    console.log('[SetupChoosePage] Fetching user facilities with admin client...')
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id')
      .eq('user_id', user.id)
      .eq('deleted', false)

    if (facilitiesError) {
      console.error('[SetupChoosePage] Error fetching user facilities:', facilitiesError)
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []
    console.log('[SetupChoosePage] User facility IDs:', facilityIds)
    console.log('[SetupChoosePage] User facilities count:', facilityIds.length)
    console.log('[SetupChoosePage] User facilities data:', JSON.stringify(userFacilities, null, 2))

    // 既に施設に所属している場合は、ホーム画面にリダイレクト
    if (facilityIds.length > 0) {
      console.log('[SetupChoosePage] ========================================')
      console.log('[SetupChoosePage] REDIRECT CONDITION MET')
      console.log('[SetupChoosePage] User already has facilities, redirecting to home')
      console.log('[SetupChoosePage] User ID:', user.id)
      console.log('[SetupChoosePage] User Email:', user.email)
      console.log('[SetupChoosePage] Facility IDs:', JSON.stringify(facilityIds))
      console.log('[SetupChoosePage] About to call redirect("/home")')
      // redirect()は例外を投げるため、try-catchでキャッチされないように注意
      redirect('/home')
    }

    console.log('[SetupChoosePage] User has no facilities, showing setup page')

    // 施設に所属していない場合のみ、セットアップ画面を表示
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-8 text-center">
              <Logo />
              <p className="mt-4 text-gray-600">施設のセットアップ</p>
            </div>

            <div className="space-y-4">
              <Link href="/setup/create">
                <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  新しい施設を作成する
                </button>
              </Link>

              <div className="flex items-center justify-center">
                <span className="h-px w-full bg-gray-200" />
                <span className="px-3 text-xs text-gray-500">または</span>
                <span className="h-px w-full bg-gray-200" />
              </div>

              <Link href="/setup/join">
                <button className="w-full border border-gray-300 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  招待リンクで既存施設に参加する
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error: any) {
    // NEXT_REDIRECTは正常なリダイレクト処理なので、再スローする
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      console.log('[SetupChoosePage] ========================================')
      console.log('[SetupChoosePage] NEXT_REDIRECT detected in catch block')
      console.log('[SetupChoosePage] Error digest:', error.digest)
      console.log('[SetupChoosePage] Re-throwing NEXT_REDIRECT exception')
      // リダイレクト例外を再スローして、Next.jsが正しくリダイレクトを処理できるようにする
      throw error
    }
    console.error('[SetupChoosePage] ========================================')
    console.error('[SetupChoosePage] Unexpected error (not NEXT_REDIRECT):', error)
    console.error('[SetupChoosePage] Error type:', typeof error)
    console.error('[SetupChoosePage] Error message:', error?.message)
    console.error('[SetupChoosePage] Error stack:', error?.stack)
    // エラーが発生した場合も、セットアップ画面を表示
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="mb-8 text-center">
              <Logo />
              <p className="mt-4 text-gray-600">施設のセットアップ</p>
            </div>

            <div className="space-y-4">
              <Link href="/setup/create">
                <button className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  新しい施設を作成する
                </button>
              </Link>

              <div className="flex items-center justify-center">
                <span className="h-px w-full bg-gray-200" />
                <span className="px-3 text-xs text-gray-500">または</span>
                <span className="h-px w-full bg-gray-200" />
              </div>

              <Link href="/setup/join">
                <button className="w-full border border-gray-300 text-gray-800 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  招待リンクで既存施設に参加する
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
}


