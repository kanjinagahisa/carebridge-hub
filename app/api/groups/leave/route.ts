import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/groups/leave
 * body: { groupId: string }
 * 呼び出しユーザーを指定グループから退会させる（deleted=true）
 * group_members に UPDATE RLS ポリシーが未定義のため admin client を使用
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
    const { groupId } = body
    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 呼び出し元がそのグループのアクティブメンバーであることを確認
    const { data: membership, error: memberErr } = await admin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('deleted', false)
      .maybeSingle()

    if (memberErr) {
      return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 })
    }
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    // soft delete
    const { error: updateErr } = await admin
      .from('group_members')
      .update({ deleted: true })
      .eq('group_id', groupId)
      .eq('user_id', user.id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[groups/leave] fatal', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
