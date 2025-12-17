import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

    // 認証チェック
    const supabase = await createClient()
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
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    if (!user) {
      console.error('[push/subscribe][POST] 401 reason=noUser')
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { message: 'endpoint, keys.p256dh, keys.auth は必須です' },
        { status: 400 }
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
      return NextResponse.json(
        { message: '購読情報の保存に失敗しました', error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '購読情報を保存しました' }, { status: 200 })
  } catch (error: any) {
    console.error('[POST /api/push/subscribe] Unexpected error:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack ? 'present' : 'none',
    })
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error.message },
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

    // Cookie ヘッダーの確認
    const cookieHeader = request.headers.get('cookie')
    const cookiePresent = !!cookieHeader
    const cookieLength = cookieHeader?.length || 0
    console.log('[push/subscribe][DELETE] cookie check', {
      present: cookiePresent,
      length: cookieLength,
    })

    // 認証チェック
    const supabase = await createClient()
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
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    if (!user) {
      console.error('[push/subscribe][DELETE] 401 reason=noUser')
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ message: 'endpoint は必須です' }, { status: 400 })
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
      return NextResponse.json(
        { message: '購読情報の削除に失敗しました', error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '購読情報を削除しました' }, { status: 200 })
  } catch (error: any) {
    console.error('[DELETE /api/push/subscribe] Unexpected error:', {
      name: error?.name || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack ? 'present' : 'none',
    })
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error.message },
      { status: 500 }
    )
  }
}

