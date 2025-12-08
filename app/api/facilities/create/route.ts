import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // デバッグ: Cookieを確認
    const cookies = request.cookies.getAll()
    console.log('[API] Cookies found:', cookies.length)
    const authCookies = cookies.filter(c => c.name.includes('sb-') || c.name.includes('auth-token'))
    console.log('[API] Auth cookies:', authCookies.map(c => ({ name: c.name, valuePreview: c.value.substring(0, 30) + '...' })))

    // API Route用のクライアントでユーザー認証を確認
    // NextRequestからCookieを読み取る
    const supabase = createApiClient(request)

    // Cookieからセッション情報を抽出して設定を試みる（ミドルウェアと同じ処理）
    let userFromCookie: any = null
    if (authCookies.length > 0) {
      const authTokenCookie = authCookies.find(c => c.name.includes('auth-token'))
      if (authTokenCookie && authTokenCookie.value) {
        try {
          // Cookieの値をURLデコード
          let cookieValue = authTokenCookie.value
          if (cookieValue.startsWith('%')) {
            cookieValue = decodeURIComponent(cookieValue)
            console.log('[API] Cookie value URL decoded')
          }

          // JSON文字列として解析
          if (cookieValue.startsWith('{')) {
            const sessionData = JSON.parse(cookieValue)
            if (sessionData.access_token && sessionData.refresh_token) {
              console.log('[API] Attempting to set session from cookie')
              const { data: setSessionData, error: setSessionError } = await supabase.auth.setSession({
                access_token: sessionData.access_token,
                refresh_token: sessionData.refresh_token,
              })
              if (setSessionError) {
                console.error('[API] Error setting session from cookie:', setSessionError.message)
              } else if (setSessionData?.user) {
                console.log('[API] Session set from cookie successfully, user:', setSessionData.user.email)
                userFromCookie = setSessionData.user
              }
            }
          }
        } catch (err) {
          console.error('[API] Error processing cookie value:', err)
        }
      }
    }
    
    // セッションを確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('[API] Session check:', { hasSession: !!session, sessionError: sessionError?.message })

    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser()

    // Cookieから取得したユーザー情報を使用（getUser()で取得できない場合）
    const finalUser = user || userFromCookie

    console.log('[API] User check:', { hasUser: !!finalUser, userId: finalUser?.id, getUserError: getUserError?.message })

    if (getUserError && !userFromCookie) {
      console.error('[API] Authentication failed:', { getUserError, user: finalUser ? 'exists' : 'null' })
      return NextResponse.json(
        { error: '認証が必要です', details: getUserError?.message || 'User not found' },
        { status: 401 }
      )
    }

    if (!finalUser) {
      console.error('[API] No user found')
      return NextResponse.json(
        { error: '認証が必要です', details: 'User not found' },
        { status: 401 }
      )
    }

    // service_roleキーを使ったadminクライアントで施設を作成
    // これにより、RLSポリシーをバイパスできます
    const adminSupabase = createAdminClient()

    // リクエストボディを取得
    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '施設名が必要です' },
        { status: 400 }
      )
    }

    // 施設を作成（adminクライアントを使用してRLSをバイパス）
    const { data: facility, error: facilityError } = await adminSupabase
      .from('facilities')
      .insert({
        name: name.trim(),
        type: 'other',
      })
      .select()
      .single()

    if (facilityError) {
      console.error('Facility creation error:', facilityError)
      return NextResponse.json(
        { error: facilityError.message, details: facilityError },
        { status: 500 }
      )
    }

    if (!facility) {
      return NextResponse.json(
        { error: '施設の作成に失敗しました' },
        { status: 500 }
      )
    }

    // usersテーブルにユーザーが存在するか確認
    const { data: existingUser, error: userCheckError } = await adminSupabase
      .from('users')
      .select('id')
      .eq('id', finalUser.id)
      .single()

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // PGRST116は「行が見つからない」エラー（これは正常）
      console.error('Error checking user:', userCheckError)
      return NextResponse.json(
        { error: 'ユーザー情報の確認に失敗しました', details: userCheckError },
        { status: 500 }
      )
    }

    // usersテーブルにユーザーが存在しない場合は作成
    if (!existingUser) {
      console.log('[API] User not found in users table, creating user record')
      const { error: userCreateError } = await adminSupabase.from('users').insert({
        id: finalUser.id,
        display_name: finalUser.email?.split('@')[0] || 'ユーザー',
        email: finalUser.email || '',
        profession: 'other', // デフォルト値
      })

      if (userCreateError) {
        console.error('User creation error:', userCreateError)
        return NextResponse.json(
          { error: 'ユーザー情報の作成に失敗しました', details: userCreateError },
          { status: 500 }
        )
      }
    }

    // ユーザーを施設の管理者として追加（adminクライアントを使用）
    const { error: roleError } = await adminSupabase.from('user_facility_roles').insert({
      user_id: finalUser.id,
      facility_id: facility.id,
      role: 'admin',
    })

    if (roleError) {
      console.error('Role creation error:', roleError)
      return NextResponse.json(
        { error: roleError.message, details: roleError },
        { status: 500 }
      )
    }

    return NextResponse.json({ facility }, { status: 201 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

