import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPasswordChangedEmail } from '@/lib/utils/email'

/**
 * パスワード変更完了メール送信用APIエンドポイント
 * 
 * Resendを使用してメールを送信します。
 * 環境変数 RESEND_API_KEY が設定されている場合のみメールを送信します。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email } = body

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      )
    }

    console.log('[PasswordChangedNotify] Password changed notification requested:', {
      userId,
      email,
      timestamp: new Date().toISOString(),
    })

    // パスワード変更完了メールを送信
    const emailResult = await sendPasswordChangedEmail(email, { userId })

    if (!emailResult.success) {
      console.warn('[PasswordChangedNotify] Failed to send email:', emailResult.error)
      
      // パスワード自体は既に更新済みなので、エラーが発生しても
      // 200を返してフロントエンドでは成功として扱う
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || 'Failed to send notification email (but password was updated)',
          emailSent: false,
        },
        { status: 200 }
      )
    }

    console.log('[PasswordChangedNotify] Password changed notification email sent successfully:', {
      userId,
      email,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed notification email sent successfully',
      emailSent: true,
    })
  } catch (error) {
    console.error('[PasswordChangedNotify] Error:', error)
    
    // エラーが発生しても、パスワードは既に更新済みなので
    // 200を返してフロントエンドでは成功として扱う
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send notification email (but password was updated)',
        emailSent: false,
      },
      { status: 200 } // パスワード更新は成功しているため200を返す
    )
  }
}


