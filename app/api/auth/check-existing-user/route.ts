import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 既存ユーザーをチェックするAPIエンドポイント
 * メールアドレスが既に登録されているかどうかを確認
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // auth.users を listUsers で全件取得しメールアドレスで絞り込む
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (error) {
      console.error('[CheckExistingUser] Error fetching users:', error)
      return NextResponse.json(
        { error: 'ユーザー確認中にエラーが発生しました' },
        { status: 500 }
      )
    }

    const users = data?.users ?? []
    const matchedUser = users.find((u) => u.email === email)

    if (matchedUser) {
      return NextResponse.json({
        exists: true,
        emailConfirmed: !!matchedUser.email_confirmed_at,
      })
    }

    // 既存ユーザーが見つからない場合
    return NextResponse.json({
      exists: false,
    })
  } catch (error) {
    console.error('[CheckExistingUser] Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}


