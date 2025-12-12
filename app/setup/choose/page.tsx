import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function SetupChoosePage() {
  try {
    const supabase = await createClient()

    // ユーザー認証を確認
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser()

    // ログインしていない場合は、そのままセットアップ画面を表示（ログインページへのリダイレクトはミドルウェアで処理）
    if (getUserError || !user) {
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

    // ログイン済みの場合、既に施設に所属しているかチェック
    const adminSupabase = createAdminClient()
    const { data: userFacilities, error: facilitiesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id')
      .eq('user_id', user.id)
      .eq('deleted', false)

    if (facilitiesError) {
      console.error('[SetupChoosePage] Error fetching user facilities:', facilitiesError)
    }

    const facilityIds = userFacilities?.map((uf) => uf.facility_id) || []

    // 既に施設に所属している場合は、ホーム画面にリダイレクト
    if (facilityIds.length > 0) {
      console.log('[SetupChoosePage] User already has facilities, redirecting to home')
      redirect('/home')
    }

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
  } catch (error) {
    console.error('[SetupChoosePage] Error:', error)
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


