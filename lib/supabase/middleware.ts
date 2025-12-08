import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Supabase URL と Anon Key の確認
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Missing Supabase environment variables')
    console.error('[Middleware] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'exists' : 'missing')
    console.error('[Middleware] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'exists' : 'missing')
  }

  // Cookie の確認
  const cookies = request.cookies.getAll()
  const authCookies = cookies.filter((cookie) => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  )
  console.log('[Middleware] Request path:', request.nextUrl.pathname)
  console.log('[Middleware] Auth cookies found:', authCookies.length)
  if (authCookies.length > 0) {
    console.log('[Middleware] Auth cookie names:', authCookies.map(c => c.name))
    // Cookieの値が存在するか確認（セキュリティ上、最初の50文字のみ表示）
    authCookies.forEach(cookie => {
      const valuePreview = cookie.value ? cookie.value.substring(0, 50) + '...' : 'empty'
      console.log(`[Middleware] Cookie ${cookie.name} value preview: ${valuePreview}`)
      // クッキーの値がJSON形式かどうかを確認
      if (cookie.value && cookie.value.startsWith('{')) {
        console.log(`[Middleware] Cookie ${cookie.name} appears to be JSON format`)
      } else if (cookie.value && cookie.value.startsWith('%')) {
        console.log(`[Middleware] Cookie ${cookie.name} appears to be URL encoded`)
      }
    })
  }

  // クッキーを正しく処理するため、URLエンコードされた値をデコード
  // Supabase SSRは自動的にクッキーを処理するが、念のため確認

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // クッキーがJSON形式で保存されている場合、手動でセッションを設定する
  let finalUser: any = null
  let getUserError: any = null

  if (authCookies.length > 0) {
    const authTokenCookie = authCookies.find(c => c.name.includes('auth-token'))
    if (authTokenCookie && authTokenCookie.value) {
      try {
        // URLデコード
        let cookieValue = authTokenCookie.value
        if (cookieValue.startsWith('%')) {
          cookieValue = decodeURIComponent(cookieValue)
          console.log('[Middleware] Cookie value URL decoded')
        }

        // HTMLが含まれている場合はスキップ（エラーページの可能性）
        if (cookieValue.startsWith('<') || cookieValue.includes('<html')) {
          console.warn('[Middleware] Cookie value appears to be HTML, skipping session setup')
          // HTMLが含まれている場合は、Cookieを削除してクリーンな状態にする
          request.cookies.delete(authTokenCookie.name)
          supabaseResponse.cookies.delete(authTokenCookie.name)
        }
        // JSON形式の場合、パースしてセッションを設定
        else if (cookieValue.startsWith('{')) {
          const sessionData = JSON.parse(cookieValue)
          if (sessionData.access_token && sessionData.refresh_token) {
            console.log('[Middleware] Found JSON session data in cookie, setting session...')
            try {
              const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              })
              if (setSessionError) {
                console.error('[Middleware] Error setting session from cookie:', setSessionError.message)
                // setSession()が失敗した場合、getUser()を試す
              } else if (setSessionData?.user) {
                console.log('[Middleware] Session set from cookie successfully, user:', setSessionData.user.email)
                finalUser = setSessionData.user
              }
            } catch (setSessionErr: any) {
              console.error('[Middleware] Exception setting session:', setSessionErr.message)
              // HTMLが含まれている場合のエラーを特別に処理
              if (setSessionErr.message && setSessionErr.message.includes('not valid JSON')) {
                console.warn('[Middleware] Cookie contains invalid data (likely HTML), deleting cookie')
                request.cookies.delete(authTokenCookie.name)
                supabaseResponse.cookies.delete(authTokenCookie.name)
              }
              // 接続タイムアウトなどのエラーが発生した場合、getUser()を試す
            }
          }
        }
      } catch (err: any) {
        console.error('[Middleware] Error processing cookie value:', err)
        // JSONパースエラーの場合、Cookieを削除
        if (err.message && (err.message.includes('not valid JSON') || err.message.includes('Unexpected token'))) {
          console.warn('[Middleware] Cookie contains invalid JSON, deleting cookie')
          if (authTokenCookie) {
            request.cookies.delete(authTokenCookie.name)
            supabaseResponse.cookies.delete(authTokenCookie.name)
          }
        }
      }
    }
  }

  // 未認証でもアクセス可能なパスをチェック
  const isPublicPath = 
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/terms') ||
    request.nextUrl.pathname.startsWith('/privacy') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/invite/') ||
    request.nextUrl.pathname.startsWith('/auth/forgot-password') ||
    request.nextUrl.pathname.startsWith('/auth/reset-password')

  // セッションが設定できなかった場合、getSession()とgetUser()を試す
  if (!finalUser) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    // パブリックパスでない場合のみ詳細ログを出力
    if (!isPublicPath) {
      console.log('[Middleware] getSession result:', {
        hasSession: !!session,
        hasError: !!sessionError,
        errorMessage: sessionError?.message,
      })
    }
    
    finalUser = session?.user || null

    // getSession()で取得できなかった場合、getUser()を試す
    if (!finalUser) {
      if (!isPublicPath) {
        console.log('[Middleware] getSession failed, trying getUser()...')
      }
      const {
        data: { user },
        error: error,
      } = await supabase.auth.getUser()
      
      getUserError = error
      
      // パブリックパスでない場合のみ詳細ログを出力
      if (!isPublicPath) {
        console.log('[Middleware] getUser result:', {
          hasUser: !!user,
          hasError: !!getUserError,
          errorMessage: getUserError?.message,
        })
      }
      
      // 未認証でもアクセス可能なパスの場合、エラーログを出力しない
      if (getUserError && !isPublicPath) {
        console.error('[Middleware] Error getting user:', getUserError.message)
        console.error('[Middleware] Error details:', getUserError)
      }
      
      finalUser = user || null
    }
  }

  // セッション取得の結果をログに出力
  // 未認証でもアクセス可能なパスの場合、エラーログを出力しない
  if (getUserError && !isPublicPath) {
    console.error('[Middleware] Error getting user:', getUserError.message)
    console.error('[Middleware] Error details:', getUserError)
  } else if (finalUser) {
    console.log('[Middleware] User authenticated:', finalUser.id, finalUser.email)
  } else {
    console.log('[Middleware] No user found (not authenticated)')
  }

  // 認証されていないユーザーのリダイレクト
  // /api パスはリダイレクト対象外（API Routeは直接実行される必要がある）
  // /invite/[code] パスは未認証でもアクセス可能（招待承認ページ）
  // /auth/forgot-password と /auth/reset-password は未認証でもアクセス可能（パスワードリセットフロー）
  if (
    !finalUser &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/terms') &&
    !request.nextUrl.pathname.startsWith('/privacy') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/invite/') &&
    !request.nextUrl.pathname.startsWith('/auth/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/auth/reset-password')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    console.log('[Middleware] Redirecting to /login (no authenticated user)')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 認証済みユーザーの施設未所属チェック
  // /api パスはリダイレクト対象外（API Routeは直接実行される必要がある）
  // /invite/ パスはリダイレクト対象外（招待承認ページは施設未所属でもアクセス可能）
  // /auth/forgot-password と /auth/reset-password はリダイレクト対象外（パスワードリセットフロー）
  if (
    finalUser &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/setup') &&
    !request.nextUrl.pathname.startsWith('/terms') &&
    !request.nextUrl.pathname.startsWith('/privacy') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    !request.nextUrl.pathname.startsWith('/invite/') &&
    !request.nextUrl.pathname.startsWith('/auth/forgot-password') &&
    !request.nextUrl.pathname.startsWith('/auth/reset-password')
  ) {
    // ユーザーの所属施設を確認
    // createServerClientのセッション管理に問題があるため、
    // adminSupabaseを使用してRLSをバイパスし、確実に施設をチェックする
    console.log('[Middleware] Checking facilities for user:', finalUser.id)
    
    const adminSupabase = createAdminClient()
    const { data: roles, error: rolesError } = await adminSupabase
      .from('user_facility_roles')
      .select('facility_id, user_id, role')
      .eq('user_id', finalUser.id)
      .eq('deleted', false)

    console.log('[Middleware] Facilities check result:', {
      hasError: !!rolesError,
      error: rolesError?.message || null,
      errorCode: rolesError?.code || null,
      errorDetails: rolesError?.details || null,
      rolesCount: roles?.length || 0,
      roles: roles || null,
    })

    if (rolesError) {
      console.error('[Middleware] Error checking user facilities:', rolesError)
    } else if (!roles || roles.length === 0) {
      // 施設に所属していない場合、セットアップ画面にリダイレクト
      console.log('[Middleware] User has no facilities, redirecting to /setup/choose')
      const url = request.nextUrl.clone()
      url.pathname = '/setup/choose'
      return NextResponse.redirect(url)
    } else {
      console.log('[Middleware] User has facilities, allowing access to:', request.nextUrl.pathname)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}

