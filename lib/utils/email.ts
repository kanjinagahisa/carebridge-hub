import { Resend } from 'resend'

/**
 * Resendインスタンスを作成
 * 環境変数 RESEND_API_KEY が設定されていない場合は null を返す
 */
let resendInstance: Resend | null = null

function getResendInstance(): Resend | null {
  if (resendInstance) {
    return resendInstance
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY is not set. Email sending will be disabled.')
    return null
  }

  resendInstance = new Resend(apiKey)
  return resendInstance
}

/**
 * パスワード変更完了メールを送信
 */
export async function sendPasswordChangedEmail(
  to: string,
  options?: {
    userId?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const resend = getResendInstance()

  if (!resend) {
    console.warn('[Email] Cannot send email: Resend is not configured')
    return {
      success: false,
      error: 'Email service is not configured',
    }
  }

  try {
    // Resendのfrom emailを設定
    // Resend Dashboardで確認した有効なドメインを使用
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    // Resendテストモード対応: テスト環境では自分のメールアドレスに送信
    // RESEND_TEST_EMAILが設定されている場合、そのメールアドレスに送信する
    const testEmail = process.env.RESEND_TEST_EMAIL
    const actualTo = testEmail || to
    const isTestMode = !!testEmail
    
    console.log('[Email] Attempting to send password changed email:', {
      to,
      actualTo,
      from: fromEmail,
      isTestMode,
      timestamp: new Date().toISOString(),
    })
    
    // from emailが正しく設定されているか確認
    if (!fromEmail || fromEmail.includes('example.com')) {
      console.error('[Email] Invalid from email address:', fromEmail)
      return {
        success: false,
        error: 'Invalid from email address. Please set RESEND_FROM_EMAIL in .env.local',
      }
    }

    // テストモードの場合、メール本文に本来の送信先を記載
    const originalRecipientNote = isTestMode 
      ? `<p style="color: #6b7280; font-size: 14px; margin-top: 12px; padding: 8px; background-color: #f3f4f6; border-radius: 4px;">
           <strong>【テスト環境】</strong> 本来の送信先: ${to}
         </p>`
      : ''

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [actualTo],
      subject: 'パスワード変更のご連絡（CareBridge Hub）',
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #1f2937; margin-top: 0;">CareBridge Hub</h1>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
            <h2 style="color: #111827; margin-top: 0;">パスワード変更のご連絡</h2>
            
            <p>CareBridge Hub にて、パスワードの再設定が行われました。</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: 600; color: #92400e;">重要</p>
              <p style="margin: 8px 0 0 0; color: #78350f;">
                もしこのメールにお心当たりがない場合は、第三者が不正にアクセスした可能性があります。<br>
                お手数ですが、至急システム管理者までご連絡ください。
              </p>
            </div>
            
            <p>本メールにお心当たりがある場合は、このままご利用いただけます。</p>
            ${originalRecipientNote}
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">このメールに返信はできません。</p>
            <p style="margin: 8px 0 0 0;">© CareBridge Hub</p>
          </div>
        </body>
        </html>
      `,
      text: `
CareBridge Hub にて、パスワードの再設定が行われました。

重要: もしこのメールにお心当たりがない場合は、第三者が不正にアクセスした可能性があります。
お手数ですが、至急システム管理者までご連絡ください。

本メールにお心当たりがある場合は、このままご利用いただけます。

このメールに返信はできません。
© CareBridge Hub
      `.trim(),
    })

    if (error) {
      console.error('[Email] Failed to send password changed email:', error)
      console.error('[Email] Error details:', JSON.stringify(error, null, 2))
      
      // Resendテストモードの制限エラーの場合、許可されているメールアドレスを検出して再送信を試みる
      const errorMessage = error.message || ''
      if (errorMessage.includes('You can only send testing emails to your own email address')) {
        // エラーメッセージから許可されているメールアドレスを抽出
        const emailMatch = errorMessage.match(/\(([^)]+@[^)]+)\)/)
        if (emailMatch && emailMatch[1]) {
          const allowedEmail = emailMatch[1]
          console.log('[Email] Resend test mode restriction detected. Retrying with allowed email:', allowedEmail)
          
          // 許可されているメールアドレスで再送信を試みる
          try {
            const retryHtml = `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h1 style="color: #1f2937; margin-top: 0;">CareBridge Hub</h1>
          </div>
          
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
            <h2 style="color: #111827; margin-top: 0;">パスワード変更のご連絡</h2>
            
            <p>CareBridge Hub にて、パスワードの再設定が行われました。</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: 600; color: #92400e;">重要</p>
              <p style="margin: 8px 0 0 0; color: #78350f;">
                もしこのメールにお心当たりがない場合は、第三者が不正にアクセスした可能性があります。<br>
                お手数ですが、至急システム管理者までご連絡ください。
              </p>
            </div>
            
            <p>本メールにお心当たりがある場合は、このままご利用いただけます。</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 12px; padding: 8px; background-color: #f3f4f6; border-radius: 4px;">
              <strong>【テスト環境】</strong> 本来の送信先: ${to}
            </p>
          </div>
          
          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">このメールに返信はできません。</p>
            <p style="margin: 8px 0 0 0;">© CareBridge Hub</p>
          </div>
        </body>
        </html>
      `
            
            const retryResult = await resend.emails.send({
              from: fromEmail,
              to: [allowedEmail],
              subject: 'パスワード変更のご連絡（CareBridge Hub）',
              html: retryHtml,
              text: `
CareBridge Hub にて、パスワードの再設定が行われました。

重要: もしこのメールにお心当たりがない場合は、第三者が不正にアクセスした可能性があります。
お手数ですが、至急システム管理者までご連絡ください。

本メールにお心当たりがある場合は、このままご利用いただけます。

【テスト環境】本来の送信先: ${to}

このメールに返信はできません。
© CareBridge Hub
      `.trim(),
            })
            
            if (retryResult.error) {
              console.error('[Email] Retry also failed:', retryResult.error)
              return {
                success: false,
                error: `Failed to send email to ${to}. Resend test mode restriction: ${errorMessage}`,
              }
            }
            
            console.log('[Email] ✅ Password changed email sent successfully (test mode):', {
              originalTo: to,
              actualTo: allowedEmail,
              emailId: retryResult.data?.id,
              timestamp: new Date().toISOString(),
            })
            
            return {
              success: true,
            }
          } catch (retryError) {
            console.error('[Email] Retry exception:', retryError)
            return {
              success: false,
              error: `Failed to send email: ${errorMessage}`,
            }
          }
        }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }

    if (!data || !data.id) {
      console.error('[Email] Unexpected response from Resend:', { data, error })
      return {
        success: false,
        error: 'Unexpected response from email service',
      }
    }

    console.log('[Email] ✅ Password changed email sent successfully:', {
      to,
      emailId: data.id,
      timestamp: new Date().toISOString(),
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error('[Email] Exception while sending password changed email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

