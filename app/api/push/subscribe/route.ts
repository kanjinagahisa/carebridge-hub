import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

/**
 * Route Handler専用の Supabase Client を作成
 * next/headers の cookies() を使用して Cookie ベースのセッションを取得
 */
async function createRouteHandlerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL が設定されていません。環境変数を確認してください。'
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。環境変数を確認してください。'
    )
  }

  const cookieStore = await cookies()
  const all = cookieStore.getAll().map(c => c.name)

  console.log('[COOKIE_KEYS]', {
    hasSbAuth: all.some(n => n.includes('sb-') && n.includes('auth-token')),
    sbKeys: all.filter(n => n.includes('sb-')).slice(0, 20),
  })

  console.log('[SUPABASE_URL_HOST]', {
    host: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null,
  })

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (value === '' || options?.maxAge === 0) {
              cookieStore.delete(name)
            } else {
              cookieStore.set(name, value, options)
            }
          })
        } catch (error) {
          // Route Handler から呼ばれた場合、Cookie の set/remove ができない場合がある
          // これは middleware でセッションをリフレッシュしている場合は問題ない
        }
      },
    } as any,
  })
}

/**
 * JSON レスポンスを返す helper
 * cookie は既に response に反映されているので、そのまま返す
 */
function jsonResponse(
  response: NextResponse,
  body: any,
  status: number = 200
): NextResponse {
  // response に既に設定された cookie を保持したまま JSON レスポンスを作成
  const jsonResponse = NextResponse.json(body, { status })
  // cookie をコピー
  response.cookies.getAll().forEach((cookie) => {
    jsonResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return jsonResponse
}

export async function POST(request: NextRequest) {
  // response を最初に作成（cookie 反映用）
  const response = new NextResponse()

  try {
    // 環境変数チェックログ
    console.log('[ENV_CHECK]', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole:
        !!process.env.SUPABASE_SERVICE_ROLE_KEY ||
        !!process.env.SUPABASE_SECRET_KEY,
    })

    // リクエスト開始ログ
    console.log('[push/subscribe][POST] start', {
      origin: request.headers.get('origin') || 'none',
      referer: request.headers.get('referer') || 'none',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'none',
    })

    // Cookie ヘッダーの確認
    const cookieHeader = request.headers.get('cookie')
    const cookiePresent = !!cookieHeader
    const cookieLength = cookieHeader?.length || 0
    console.log('[push/subscribe][POST] cookie check', {
      present: cookiePresent,
      length: cookieLength,
    })

    // 認証チェック（Route Handler専用クライアントを使用）
    const supabase = await createRouteHandlerClient()
    
    // Bearerトークンの確認
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    
    let user: any = null
    let userError: any = null
    
    if (token) {
      // Bearerトークンで認証を試行
      const { data: userData, error: userErr } = await supabase.auth.getUser(token)
      user = userData?.user ?? null
      userError = userErr ?? null
      console.log('[AUTH_MODE] bearer')
    } else {
      // Cookie経由で認証を試行
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      user = userData?.user ?? null
      userError = userErr ?? null
      console.log('[AUTH_MODE] cookie')
    }

    // 認証チェックログ
    console.log('[AUTH_CHECK]', { user: user ?? null })
    
    // 認証エラーログ
    console.log('[AUTH_ERROR]', {
      message: userError?.message ?? null,
      status: (userError as any)?.status ?? null,
      name: (userError as any)?.name ?? null,
    })

    if (userError) {
      console.error('[push/subscribe][POST] 401 reason=authError')
      return jsonResponse(response, { message: '認証が必要です' }, 401)
    }

    if (!user) {
      console.error('[push/subscribe][POST] 401 reason=noUser')
      return jsonResponse(response, { message: '認証が必要です' }, 401)
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return jsonResponse(
        response,
        { message: 'endpoint, keys.p256dh, keys.auth は必須です' },
        400
      )
    }

    // 購読情報を保存（upsert: endpointがuniqueなので同一端末の再購読に対応）
    // 注意: updated_at はトリガーで自動更新されるため、明示的に送信しない
    console.log('[PUSH_UPSERT_PAYLOAD]', {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      facility_id,
    })
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
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
      return jsonResponse(
        response,
        { 
          ok: false, 
          reason: 'dbError',
          code: insertError.code,
          message: insertError.message,
        },
        500
      )
    }

    console.log('[DB_UPSERT]', { ok: true })
    return jsonResponse(response, { ok: true }, 200)
  } catch (error: any) {
    console.error('[DB_ERROR]', {
      code: 'UNEXPECTED',
      message: error?.message || 'Unknown error',
      details: error?.name || 'Unknown',
    })
    return jsonResponse(
      response,
      { 
        ok: false, 
        reason: 'unexpectedError',
        code: 'UNEXPECTED',
        message: error?.message || 'サーバーエラーが発生しました',
      },
      500
    )
  }
}

export async function DELETE(request: NextRequest) {
  // response を最初に作成（cookie 反映用）
  const response = new NextResponse()

  try {
    // 環境変数チェックログ
    console.log('[ENV_CHECK]', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole:
        !!process.env.SUPABASE_SERVICE_ROLE_KEY ||
        !!process.env.SUPABASE_SECRET_KEY,
    })

    // リクエスト開始ログ
    console.log('[push/subscribe][DELETE] start', {
      origin: request.headers.get('origin') || 'none',
      referer: request.headers.get('referer') || 'none',
      userAgent: request.headers.get('user-agent')?.substring(0, 50) || 'none',
    })

    // Cookie ヘッダーの確認
    const cookieHeader = request.headers.get('cookie')
    const cookiePresent = !!cookieHeader
    const cookieLength = cookieHeader?.length || 0
    console.log('[push/subscribe][DELETE] cookie check', {
      present: cookiePresent,
      length: cookieLength,
    })

    // 認証チェック（Route Handler専用クライアントを使用）
    const supabase = await createRouteHandlerClient()
    
    // Bearerトークンの確認
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    
    let user: any = null
    let userError: any = null
    
    if (token) {
      // Bearerトークンで認証を試行
      const { data: userData, error: userErr } = await supabase.auth.getUser(token)
      user = userData?.user ?? null
      userError = userErr ?? null
      console.log('[AUTH_MODE] bearer')
    } else {
      // Cookie経由で認証を試行
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      user = userData?.user ?? null
      userError = userErr ?? null
      console.log('[AUTH_MODE] cookie')
    }

    // 認証チェックログ
    console.log('[AUTH_CHECK]', { user: user ?? null })
    
    // 認証エラーログ
    console.log('[AUTH_ERROR]', {
      message: userError?.message ?? null,
      status: (userError as any)?.status ?? null,
      name: (userError as any)?.name ?? null,
    })

    if (userError) {
      console.error('[push/subscribe][DELETE] 401 reason=authError')
      return jsonResponse(response, { message: '認証が必要です' }, 401)
    }

    if (!user) {
      console.error('[push/subscribe][DELETE] 401 reason=noUser')
      return jsonResponse(response, { message: '認証が必要です' }, 401)
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return jsonResponse(response, { message: 'endpoint は必須です' }, 400)
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
      return jsonResponse(
        response,
        { 
          ok: false, 
          reason: 'dbError',
          code: deleteError.code,
          message: deleteError.message,
        },
        500
      )
    }

    console.log('[DB_DELETE]', { ok: true })
    return jsonResponse(response, { ok: true }, 200)
  } catch (error: any) {
    console.error('[DB_ERROR]', {
      code: 'UNEXPECTED',
      message: error?.message || 'Unknown error',
      details: error?.name || 'Unknown',
    })
    return jsonResponse(
      response,
      { 
        ok: false, 
        reason: 'unexpectedError',
        code: 'UNEXPECTED',
        message: error?.message || 'サーバーエラーが発生しました',
      },
      500
    )
  }
}

