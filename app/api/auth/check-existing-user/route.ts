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

    // auth.usersテーブルで既存ユーザーをチェック
    const { data: existingAuthUser, error: authUserError } = await adminSupabase.auth.admin.listUsers()

    if (authUserError) {
      console.error('[CheckExistingUser] Error fetching users:', authUserError)
      return NextResponse.json(
        { error: 'ユーザー確認中にエラーが発生しました' },
        { status: 500 }
      )
    }

    // 指定されたメールアドレスで既存ユーザーを検索
    const existingUser = existingAuthUser.users.find(user => user.email === email)

    if (existingUser) {
      // 既存ユーザーが見つかった場合、public.usersテーブルもチェック
      const { data: publicUser, error: publicUserError } = await adminSupabase
        .from('users')
        .select('id, email, created_at')
        .eq('id', existingUser.id)
        .eq('deleted', false)
        .maybeSingle()

      return NextResponse.json({
        exists: true,
        emailConfirmed: !!existingUser.email_confirmed_at,
        userId: existingUser.id,
        publicUserExists: !!publicUser,
        publicUserCreatedAt: publicUser?.created_at || null,
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


