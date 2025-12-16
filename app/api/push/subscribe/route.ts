import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Web Push通知の購読管理API
 * POST: 購読情報を保存（upsert）
 * DELETE: 購読情報を削除
 */

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
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
      console.error('[POST /api/push/subscribe] Error upserting subscription:', insertError)
      return NextResponse.json(
        { message: '購読情報の保存に失敗しました', error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '購読情報を保存しました' }, { status: 200 })
  } catch (error: any) {
    console.error('[POST /api/push/subscribe] Unexpected error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
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
      console.error('[DELETE /api/push/subscribe] Error deleting subscription:', deleteError)
      return NextResponse.json(
        { message: '購読情報の削除に失敗しました', error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '購読情報を削除しました' }, { status: 200 })
  } catch (error: any) {
    console.error('[DELETE /api/push/subscribe] Unexpected error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error.message },
      { status: 500 }
    )
  }
}

