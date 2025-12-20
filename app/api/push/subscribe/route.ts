import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = NextResponse.next()

  try {
    // 環境変数チェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

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

    // Supabase クライアント作成（Cookie認証のみ）
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      } as any,
    })

    // 認証チェック（Cookie認証のみ）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: response.headers }
      )
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { message: 'endpoint, keys.p256dh, keys.auth は必須です' },
        { status: 400, headers: response.headers }
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
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'dbError',
          code: insertError.code,
          message: insertError.message,
        },
        { status: 500, headers: response.headers }
      )
    }

    console.log('[DB_UPSERT]', { ok: true })
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: response.headers }
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
      { status: 500, headers: response.headers }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.next()

  try {
    // 環境変数チェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

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

    // Supabase クライアント作成（Cookie認証のみ）
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      } as any,
    })

    // 認証チェック（Cookie認証のみ）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: response.headers }
      )
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { message: 'endpoint は必須です' },
        { status: 400, headers: response.headers }
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
        { status: 500, headers: response.headers }
      )
    }

    console.log('[DB_DELETE]', { ok: true })
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: response.headers }
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
      { status: 500, headers: response.headers }
    )
  }
}

