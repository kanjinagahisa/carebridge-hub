import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

/**
 * API Route用のSupabaseクライアントを作成
 * NextRequestからCookieを読み取る
 */
export function createApiClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // API RouteではCookieを設定できないため、何もしない
        // 必要に応じて、レスポンスヘッダーにCookieを設定する
      },
    } as any,
  })
}











