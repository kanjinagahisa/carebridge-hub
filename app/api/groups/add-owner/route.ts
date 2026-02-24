import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { ROLES } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient(request)
    const admin = createAdminClient()

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const facilityId = (body?.facilityId ?? body?.facility_id ?? '')?.trim?.() ?? ''
    const targetUserId = (body?.targetUserId ?? body?.target_user_id ?? '')?.trim?.() ?? ''
    const groupIdsRaw = body?.groupIds ?? body?.group_ids ?? []

    const groupIds: string[] = Array.isArray(groupIdsRaw) ? groupIdsRaw : []
    const normalizedGroupIds = groupIds.map((x) => String(x).trim()).filter(Boolean)

    if (!facilityId || !targetUserId || normalizedGroupIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'facilityId, targetUserId, groupIds are required' },
        { status: 400 }
      )
    }

    const { data: meRole, error: meRoleErr } = await admin
      .from('user_facility_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('facility_id', facilityId)
      .eq('deleted', false)
      .maybeSingle()

    if (meRoleErr) {
      return NextResponse.json({ ok: false, error: 'Failed to verify role' }, { status: 500 })
    }
    if (!meRole || meRole.role !== ROLES.ADMIN) {
      return NextResponse.json({ ok: false, error: 'Forbidden (admin only)' }, { status: 403 })
    }

    const { data: targetMember, error: targetErr } = await admin
      .from('user_facility_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('facility_id', facilityId)
      .eq('deleted', false)
      .maybeSingle()

    if (targetErr) {
      return NextResponse.json({ ok: false, error: 'Failed to verify target membership' }, { status: 500 })
    }
    if (!targetMember) {
      return NextResponse.json({ ok: false, error: 'Target user is not a member of this facility' }, { status: 400 })
    }

    const { data: groups, error: groupsErr } = await admin
      .from('groups')
      .select('id')
      .in('id', normalizedGroupIds)
      .eq('facility_id', facilityId)
      .eq('deleted', false)

    if (groupsErr) {
      return NextResponse.json({ ok: false, error: 'Failed to verify groups' }, { status: 500 })
    }

    const validGroupIds = (groups ?? []).map((g: any) => g.id)
    if (validGroupIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid groups found for this facility' }, { status: 400 })
    }

    const payload = validGroupIds.map((groupId) => ({
      group_id: groupId,
      user_id: targetUserId,
      role: 'owner',
      deleted: false,
    }))

    const { error: upsertErr } = await admin
      .from('group_members')
      .upsert(payload, { onConflict: 'group_id,user_id' })

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, updated_group_ids: validGroupIds })
  } catch (e: any) {
    console.error('[groups/add-owner fatal]', e)
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
