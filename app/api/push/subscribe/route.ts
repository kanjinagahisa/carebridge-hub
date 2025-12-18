import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

/**
 * Route Handler専用の Supabase Client を作成
 * request の cookie を読み取り、response に cookie を反映する
 */
function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
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

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies: { name: string; value: string; options?: any }[]) {
        // cookie を直接 response に反映
        cookies.forEach(({ name, value, options }) => {
          if (value === '' || options?.maxAge === 0) {
            response.cookies.delete(name)
          } else {
            response.cookies.set(name, value, options)
          }
        })
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
    const supabase = createRouteHandlerClient(request, response)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // 認証結果ログ
    console.log('[push/subscribe][POST] auth result', {
      hasError: !!authError,
      errorStatus: authError?.status || null,
      errorMessageLength: authError?.message?.length || null,
      hasUser: !!user,
      userId: user?.id || null,
    })

    if (authError) {
      console.error('[push/subscribe][POST] 401 reason=authError', {
        status: authError.status,
        messageLength: authError.message?.length || null,
      })
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
    const { error: insertError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      )

    if (insertError) {
      console.error('[POST /api/push/subscribe] Error upserting subscription:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })
      return jsonResponse(
        response,
        { message: '購読情報の保存に失敗しました', error: insertError.message },
        500
      )
    }

    return jsonResponse(response, { message: '購読情報を保存しました' }, 200)
  } catch (error: any) {
    console.error('[POST /api/push/subscribe] Unexpected error:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack ? 'present' : 'none',
    })
    return jsonResponse(
      response,
      { message: 'サーバーエラーが発生しました', error: error.message },
      500
    )
  }
}

export async function DELETE(request: NextRequest) {
  // response を最初に作成（cookie 反映用）
  const response = new NextResponse()

  try {
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
    const supabase = createRouteHandlerClient(request, response)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // 認証結果ログ
    console.log('[push/subscribe][DELETE] auth result', {
      hasError: !!authError,
      errorStatus: authError?.status || null,
      errorMessageLength: authError?.message?.length || null,
      hasUser: !!user,
      userId: user?.id || null,
    })

    if (authError) {
      console.error('[push/subscribe][DELETE] 401 reason=authError', {
        status: authError.status,
        messageLength: authError.message?.length || null,
      })
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
      console.error('[DELETE /api/push/subscribe] Error deleting subscription:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
      })
      return jsonResponse(
        response,
        { message: '購読情報の削除に失敗しました', error: deleteError.message },
        500
      )
    }

    return jsonResponse(response, { message: '購読情報を削除しました' }, 200)
  } catch (error: any) {
    console.error('[DELETE /api/push/subscribe] Unexpected error:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack ? 'present' : 'none',
    })
    return jsonResponse(
      response,
      { message: 'サーバーエラーが発生しました', error: error.message },
      500
    )
  }
}

