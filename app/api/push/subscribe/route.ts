import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

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

    // 認証チェック（auth-helpers 正規ルート、Cookie認証のみ）
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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
      facility_id: undefined,
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

    // 認証チェック（auth-helpers 正規ルート、Cookie認証のみ）
    const supabase = createRouteHandlerClient({ cookies })
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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

