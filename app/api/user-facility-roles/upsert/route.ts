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

    // Service Role（RLS回避で upsert / invite_codes 更新用）
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
    const { userId, facilityId, inviteCode } = body ?? {}

    if (!userId || !facilityId || !inviteCode) {
      return NextResponse.json(
        { ok: false, error: 'userId, facilityId and inviteCode are required' },
        { status: 400 }
      )
    }

    // なりすまし防止
    if (user.id !== userId) {
      return NextResponse.json({ ok: false, error: 'Forbidden (user mismatch)' }, { status: 403 })
    }

    // inviteCode 検証
    const { data: invite, error: inviteError } = await admin
      .from('invite_codes')
      .select('id, role, used, cancelled, expires_at')
      .eq('code', inviteCode)
      .eq('facility_id', facilityId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    if (invite.used) {
      return NextResponse.json({ ok: false, error: 'Invite code already used' }, { status: 400 })
    }

    if (invite.cancelled) {
      return NextResponse.json({ ok: false, error: 'Invite code cancelled' }, { status: 400 })
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'Invite code expired' }, { status: 400 })
    }

    // role は invite_codes.role を使用（admin/staff のみ許可、それ以外は staff に倒す）
    const role = invite.role === 'admin' || invite.role === 'staff' ? invite.role : 'staff'

    // upsert（復職も成立させるため deleted=false を入れる）
    const { error: upsertError } = await admin
      .from('user_facility_roles')
      .upsert(
        {
          user_id: userId,
          facility_id: facilityId,
          role,
          deleted: false,
        },
        { onConflict: 'user_id,facility_id' }
      )

    if (upsertError) {
      console.error('[user-facility-roles upsertError]', upsertError)
      return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 })
    }

    // invite_codes を使用済みにする
    const { error: markUsedError } = await admin
      .from('invite_codes')
      .update({ used: true })
      .eq('id', invite.id)

    if (markUsedError) {
      console.error('[user-facility-roles markUsedError]', markUsedError)
      // upsert は成功しているため続行
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
