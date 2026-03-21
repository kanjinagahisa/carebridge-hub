import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/groups/invite
 * body: { groupId: string, userIds: string[] }
 * 同施設メンバーを指定グループに招待する
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient(request)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, userIds } = body

    if (!groupId || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'groupId and userIds are required' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 呼び出し元がそのグループのメンバーであることを確認
    const { data: callerMember, error: callerErr } = await admin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('deleted', false)
      .maybeSingle()

    if (callerErr) {
      return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 })
    }
    if (!callerMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // グループの施設IDを取得し、招待対象ユーザーが同施設所属か確認
    const { data: group, error: groupErr } = await admin
      .from('groups')
      .select('facility_id')
      .eq('id', groupId)
      .eq('deleted', false)
      .maybeSingle()

    if (groupErr || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // userIds を正規化し、自分自身を除外
    const normalizedUserIds = (userIds as string[])
      .map((id) => String(id).trim())
      .filter(Boolean)
      .filter((uid) => uid !== user.id)

    if (normalizedUserIds.length === 0) {
      return NextResponse.json({ ok: true, invited: 0 })
    }

    // 同施設所属チェック：group.facility_id に所属するユーザーのみ有効
    const { data: facilityMembers, error: facilityCheckErr } = await admin
      .from('user_facility_roles')
      .select('user_id')
      .eq('facility_id', group.facility_id)
      .eq('deleted', false)
      .in('user_id', normalizedUserIds)

    if (facilityCheckErr) {
      return NextResponse.json({ error: 'Failed to verify facility membership' }, { status: 500 })
    }

    const validUserIds = (facilityMembers ?? []).map((r: any) => r.user_id as string)
    if (validUserIds.length === 0) {
      return NextResponse.json({ ok: true, invited: 0 })
    }

    const payload = validUserIds.map((uid) => ({
      group_id: groupId,
      user_id: uid,
      role: 'member',
      deleted: false,
    }))

    const { error: upsertErr } = await admin
      .from('group_members')
      .upsert(payload, { onConflict: 'group_id,user_id' })

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[groups/invite] fatal', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
