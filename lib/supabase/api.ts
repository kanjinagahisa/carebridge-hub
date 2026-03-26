import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

function safeJsonParse(str: string) {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

/**
 * API Route用のSupabaseクライアントを作成
 * NextRequestからCookieを読み取る
 */
export async function createApiClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // sb-***-auth-token から access_token / refresh_token を取り出す（createServerClient の global.headers と setSession で使う）
  let access_token: string | undefined
  let refresh_token: string | undefined
  const all = request.cookies.getAll()
  const authCookie = all.find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
  if (authCookie?.value) {
    let v = authCookie.value
    if (v.includes('%7B') || v.includes('%22') || v.startsWith('%7B')) {
      try {
        v = decodeURIComponent(v)
      } catch {
        // noop
      }
    }
    const parsed = safeJsonParse(v)
    access_token = parsed?.access_token
    refresh_token = parsed?.refresh_token
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // @supabase/ssr v0.1.0 は get/set/remove インターフェースのみ使用する（getAll/setAll 未対応）
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(_name: string, _value: string, _options?: any) {
        // API Route ではレスポンスオブジェクトなしで Cookie を設定できないため noop
      },
      remove(_name: string, _options?: any) {
        // noop
      },
    },
    global: { headers: access_token ? { Authorization: `Bearer ${access_token}` } : {} },
  })

  // sb-***-auth-token が URLエンコードJSON の場合、明示的に setSession して復元する
  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token })
  }

  return supabase
}
