import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/groups/members?groupId=...
 * グループメンバー一覧を返す（招待候補の除外にも使用）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient(request)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // 呼び出し元がそのグループの active member であることを確認
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: members, error } = await admin
      .from('group_members')
      .select('role, user_id, user:users(id, display_name, profession)')
      .eq('group_id', groupId)
      .eq('deleted', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (members ?? []).map((m: any) => ({
      id: m.user_id as string,
      display_name: m.user?.display_name as string | null,
      profession: m.user?.profession as string | null,
      role: m.role as string | null,
    }))

    return NextResponse.json({ members: result })
  } catch (e: any) {
    console.error('[groups/members] fatal', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
