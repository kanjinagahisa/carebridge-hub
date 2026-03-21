import { createApiClient } from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/groups/notification-mute?groupId=...
 * 現在のミュート状態を返す
 *
 * POST /api/groups/notification-mute
 * body: { groupId: string, mute: boolean }
 * ミュート状態を保存・解除する
 *
 * group_notification_mutes テーブルの RLS は user_id = auth.uid() で制御。
 * admin client は upsert/delete の権限確認を単純化するために使用。
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

    const { data: mute } = await admin
      .from('group_notification_mutes')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ muted: !!mute })
  } catch (e: any) {
    console.error('[notification-mute GET] fatal', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

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
    const { groupId, mute } = body

    if (!groupId || typeof mute !== 'boolean') {
      return NextResponse.json(
        { error: 'groupId and mute (boolean) are required' },
        { status: 400 }
      )
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

    if (mute) {
      const { error } = await admin
        .from('group_notification_mutes')
        .upsert({ group_id: groupId, user_id: user.id }, { onConflict: 'group_id,user_id' })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await admin
        .from('group_notification_mutes')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, muted: mute })
  } catch (e: any) {
    console.error('[notification-mute POST] fatal', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
