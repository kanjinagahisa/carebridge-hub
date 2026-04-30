import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // Cookieベース（ログインユーザー判定用）
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Service Role（RLS回避で upsert 用）
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ログインユーザー確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // body
    const body = await req.json()
    const { userId, facilityId, role } = body ?? {}

    if (!userId || !facilityId) {
      return NextResponse.json(
        { ok: false, error: 'userId and facilityId are required' },
        { status: 400 }
      )
    }

    // なりすまし防止
    if (user.id !== userId) {
      return NextResponse.json({ ok: false, error: 'Forbidden (user mismatch)' }, { status: 403 })
    }

    // role 値バリデーション（null/undefined は許可、それ以外は admin/staff のみ）
    if (role !== null && role !== undefined && role !== 'admin' && role !== 'staff') {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 })
    }

    // upsert（復職も成立させるため deleted=false を入れる）
    const { error: upsertError } = await admin
      .from('user_facility_roles')
      .upsert(
        {
          user_id: userId,
          facility_id: facilityId,
          role: role ?? null,
          deleted: false,
        },
        { onConflict: 'user_id,facility_id' }
      )

    if (upsertError) {
      console.error('[user-facility-roles upsertError]', upsertError)
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[user-facility-roles fatal]', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
