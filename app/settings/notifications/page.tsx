import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import Header from '@/components/Header'
import PushNotificationToggle from '@/components/PushNotificationToggle'

// 認証が必要なページのため、動的レンダリングを強制
export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
  console.log('[NotificationsSettingsPage] Starting...')

  try {
    const supabase = await createClient()
    console.log('[NotificationsSettingsPage] Supabase client created')

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
            console.log('[NotificationsSettingsPage] Cookie value URL decoded')
          }

          // JSON形式の場合、パースしてセッションを設定
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[NotificationsSettingsPage] Found JSON session data in cookie, setting session...')
              try {
                const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                })
                if (setSessionError) {
                  console.error('[NotificationsSettingsPage] Error setting session from cookie:', setSessionError.message)
                } else if (setSessionData?.user) {
                  console.log('[NotificationsSettingsPage] Session set from cookie successfully, user:', setSessionData.user.email)
                  user = setSessionData.user
                }
              } catch (setSessionErr: any) {
                console.error('[NotificationsSettingsPage] Exception setting session:', setSessionErr.message)
              }
            }
          }
        } catch (err) {
          console.error('[NotificationsSettingsPage] Error processing cookie value:', err)
        }
      }
    }

    // セッションが設定できなかった場合、getUser()を試す
    if (!user) {
      const {
        data: { user: getUserResult },
        error: getUserError,
      } = await supabase.auth.getUser()

      console.log('[NotificationsSettingsPage] getUser result:', {
        hasUser: !!getUserResult,
        userId: getUserResult?.id,
        getUserError: getUserError?.message,
      })

      if (getUserResult) {
        user = getUserResult
      }
    }

    if (!user) {
      console.log('[NotificationsSettingsPage] No user found, redirecting to login')
      redirect('/login')
    }

    console.log('[NotificationsSettingsPage] User authenticated:', user.id, user.email)

    return (
      <div className="min-h-screen bg-gray-100 pb-20">
        {/* PageHeader */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <Link
                href="/home"
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={20} className="inline-block mr-1" />
                <span className="text-sm">ホームへ</span>
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center -ml-8">
                通知設定
              </h1>
              <div className="w-10" />
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <PushNotificationToggle />
          
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-2">通知について</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              プッシュ通知をONにすると、新しい投稿やメッセージが届いた際に通知を受け取ることができます。
              <br />
              <br />
              通知の受信は端末・ブラウザごとに設定されます。複数の端末で利用する場合は、それぞれの端末で通知をONにする必要があります。
            </p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('[NotificationsSettingsPage] Unexpected error:', error)
    redirect('/login')
  }
}

