import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

// Cookie から session 情報を抽出するヘルパー関数
function extractSessionFromCookies(request: NextRequest): { access_token: string | null; refresh_token: string | null } {
  const allCookies = request.cookies.getAll()
  const sbCookies = allCookies.filter(c => c.name.includes('sb-'))
  
  if (sbCookies.length === 0) {
    console.log('[push/subscribe] no sb- cookies found')
    return { access_token: null, refresh_token: null }
  }
  
  const firstSbCookie = sbCookies[0]
  const cookieValue = firstSbCookie.value || ''
  
  console.log('[push/subscribe] cookie analysis start', {
    name: firstSbCookie.name,
    rawLength: cookieValue.length,
  })
  
  let decoded = cookieValue
  
  // decodeURIComponent を試行
  try {
    if (cookieValue.includes('%')) {
      decoded = decodeURIComponent(cookieValue)
      console.log('[push/subscribe] decodeURIComponent success', {
        decodedLength: decoded.length,
      })
    }
  } catch (error: any) {
    console.log('[push/subscribe] decodeURIComponent failed', {
      error: error?.message,
    })
  }
  
  // JSON.parse を試行
  try {
    if (decoded.startsWith('{')) {
      const parsedSession = JSON.parse(decoded)
      const keys = Object.keys(parsedSession)
      console.log('[push/subscribe] JSON.parse success', {
        keys,
      })
      
      // expires_at と現在時刻をログ出力
      if (parsedSession.expires_at !== undefined) {
        const expiresAt = parsedSession.expires_at
        const nowSec = Math.floor(Date.now() / 1000)
        console.log('[push/subscribe] expires_at:', expiresAt)
        console.log('[push/subscribe] now (sec):', nowSec)
      }
      
      const accessToken = parsedSession.access_token || null
      const refreshToken = parsedSession.refresh_token || null
      
      if (accessToken) {
        const atPrefix = accessToken.substring(0, 10)
        const atLength = accessToken.length
        console.log('[push/subscribe] access_token found', {
          hasAccessToken: true,
          prefix: atPrefix,
          length: atLength,
        })
      } else {
        console.log('[push/subscribe] access_token not found in parsed session')
      }
      
      if (refreshToken) {
        const rtPrefix = refreshToken.substring(0, 10)
        const rtLength = refreshToken.length
        console.log('[push/subscribe] refresh_token found', {
          hasRefreshToken: true,
          prefix: rtPrefix,
          length: rtLength,
        })
      } else {
        console.log('[push/subscribe] refresh_token not found in parsed session')
      }
      
      return { access_token: accessToken, refresh_token: refreshToken }
    } else {
      console.log('[push/subscribe] JSON.parse skipped (not JSON)')
    }
  } catch (error: any) {
    console.log('[push/subscribe] JSON.parse failed', {
      error: error?.message,
    })
  }
  
  return { access_token: null, refresh_token: null }
}

// 認証済みユーザーを取得（refresh 対応）
async function getAuthedUserWithRefresh(
  request: NextRequest,
  tag: 'POST' | 'DELETE'
): Promise<
  | { success: true; supabase: SupabaseClient; user: User; refreshed: boolean }
  | { success: false; response: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      ),
    }
  }

  // Cookie から session 情報を抽出
  const { access_token: accessToken, refresh_token: refreshToken } = extractSessionFromCookies(request)

  if (!accessToken) {
    console.log(`[push/subscribe][${tag}] accessToken not found, returning 401`)
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          reason: 'access_token_missing',
        },
        { status: 401 }
      ),
    }
  }

  // accessToken を使って Supabase クライアントを作成
  let supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })

  // accessToken を使ってユーザーを取得
  let {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  console.log(`[push/subscribe][${tag}] getUser result (first attempt)`, {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userError: userError?.message,
    errorName: userError?.name,
  })

  let refreshed = false

  // token expired の場合、refresh_token でセッションをリフレッシュ
  if (!user && userError && userError.message?.toLowerCase().includes('expired')) {
    console.log(`[push/subscribe][${tag}] token expired, attempting refresh`, {
      hasRefreshToken: !!refreshToken,
      errorMessage: userError.message,
    })

    if (!refreshToken) {
      console.log(`[push/subscribe][${tag}] refresh_token not found, returning 401`)
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            reason: 'token_expired_no_refresh',
          },
          { status: 401 }
        ),
      }
    }

    // refresh_token を使ってセッションをリフレッシュ
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (refreshError || !refreshData.session) {
      console.error(`[push/subscribe][${tag}] refreshSession failed`, {
        error: refreshError?.message,
        errorName: refreshError?.name,
        code: refreshError?.code,
      })
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            reason: 'refresh_failed',
            message: refreshError?.message,
          },
          { status: 401 }
        ),
      }
    }

    console.log(`[push/subscribe][${tag}] refreshSession success`, {
      userId: refreshData.session.user.id,
      hasNewAccessToken: !!refreshData.session.access_token,
    })

    // 新しい access_token でクライアントを再作成
    const newAccessToken = refreshData.session.access_token
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
      },
    })

    // 新しい access_token で再度 getUser を実行
    const {
      data: { user: refreshedUser },
      error: refreshedUserError,
    } = await supabase.auth.getUser(newAccessToken)

    console.log(`[push/subscribe][${tag}] getUser result (after refresh)`, {
      hasUser: !!refreshedUser,
      userId: refreshedUser?.id,
      userEmail: refreshedUser?.email,
      userError: refreshedUserError?.message,
      errorName: refreshedUserError?.name,
    })

    if (!refreshedUser || refreshedUserError) {
      console.log(`[push/subscribe][${tag}] getUser failed after refresh, returning 401`, {
        error: refreshedUserError?.message,
        errorName: refreshedUserError?.name,
      })
      return {
        success: false,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            reason: 'getUser_failed_after_refresh',
          },
          { status: 401 }
        ),
      }
    }

    user = refreshedUser
    refreshed = true
  } else if (!user || userError) {
    console.log(`[push/subscribe][${tag}] getUser failed, returning 401`, {
      error: userError?.message,
      errorName: userError?.name,
    })
    return {
      success: false,
      response: NextResponse.json(
        {
          error: 'Unauthorized',
          reason: 'invalid_access_token',
        },
        { status: 401 }
      ),
    }
  }

  return {
    success: true,
    supabase,
    user,
    refreshed,
  }
}

export async function POST(request: NextRequest) {
  try {
    // リクエスト開始ログ
    console.log('[push/subscribe][POST] start', {
      origin: request.headers.get('origin') || 'none',
      referer: request.headers.get('referer') || 'none',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'none',
    })

    // 認証済みユーザーを取得（refresh 対応）
    const authResult = await getAuthedUserWithRefresh(request, 'POST')
    if (!authResult.success) {
      return authResult.response
    }
    const { supabase, user, refreshed } = authResult

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'bad_request',
          message: 'endpoint, keys.p256dh, keys.auth は必須です',
        },
        { status: 400 }
      )
    }

    // facility_id を user_facility_roles から取得
    const { data: roleRow, error: roleError } = await supabase
      .from('user_facility_roles')
      .select('facility_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError) {
      console.error('[ROLES_ERROR]', {
        code: roleError.code,
        message: roleError.message,
        details: roleError.details,
        hint: roleError.hint,
      })
      return NextResponse.json(
        { ok: false, reason: 'roles_error', message: roleError.message },
        { status: 500 }
      )
    }

    const facility_id = roleRow?.facility_id

    if (!facility_id) {
      console.error('[FACILITY_ID_MISSING]', {
        user_id: user.id,
        roleRow: roleRow,
      })
      return NextResponse.json(
        { ok: false, reason: 'facility_id_missing' },
        { status: 400 }
      )
    }

    // 購読情報を保存（upsert: endpointがuniqueなので同一端末の再購読に対応）
    // 注意: updated_at はトリガーで自動更新されるため、明示的に送信しない
    console.log('[PUSH_UPSERT_PAYLOAD]', {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      facility_id: facility_id,
    })
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          facility_id: facility_id,
          // updated_at は削除: PostgRESTのスキーマキャッシュで認識されない場合があるため
          // テーブルに updated_at カラムがあっても、トリガーで自動更新されるので不要
        },
        {
          onConflict: 'endpoint',
        }
      )

    if (insertError) {
      console.error('[DB_ERROR]', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'dbError',
          code: insertError.code,
          message: insertError.message,
        },
        { status: 500 }
      )
    }

    console.log('[DB_UPSERT]', { ok: true })
    console.log('[push/subscribe][POST] returning 200')
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[DB_ERROR]', {
      code: 'UNEXPECTED',
      message: error?.message || 'Unknown error',
      details: error?.name || 'Unknown',
    })
    return NextResponse.json(
      { 
        ok: false, 
        reason: 'unexpectedError',
        code: 'UNEXPECTED',
        message: error?.message || 'サーバーエラーが発生しました',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // リクエスト開始ログ
    console.log('[push/subscribe][DELETE] start', {
      origin: request.headers.get('origin') || 'none',
      referer: request.headers.get('referer') || 'none',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'none',
    })

    // 認証済みユーザーを取得（refresh 対応）
    const authResult = await getAuthedUserWithRefresh(request, 'DELETE')
    if (!authResult.success) {
      return authResult.response
    }
    const { supabase, user, refreshed } = authResult

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'bad_request',
          message: 'endpoint は必須です',
        },
        { status: 400 }
      )
    }

    // 購読情報を削除（user_idも条件に入れて、本人のもののみ削除可能にする）
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (deleteError) {
      console.error('[DB_ERROR]', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      })
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'dbError',
          code: deleteError.code,
          message: deleteError.message,
        },
        { status: 500 }
      )
    }

    console.log('[DB_DELETE]', { ok: true })
    console.log('[push/subscribe][DELETE] returning 200')
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[DB_ERROR]', {
      code: 'UNEXPECTED',
      message: error?.message || 'Unknown error',
      details: error?.name || 'Unknown',
    })
    return NextResponse.json(
      { 
        ok: false, 
        reason: 'unexpectedError',
        code: 'UNEXPECTED',
        message: error?.message || 'サーバーエラーが発生しました',
      },
      { status: 500 }
    )
  }
}

