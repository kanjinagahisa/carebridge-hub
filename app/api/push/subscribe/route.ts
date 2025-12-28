import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type SubscribeBody = {
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string | null
  device_type?: 'mobile' | 'desktop' | 'unknown' | string
}

async function getCurrentFacilityId(supabase: any, userId: string) {
  // users.current_facility_id のみ採用（B仕様）
  const { data: userRow, error } = await supabase
    .from('users')
    .select('current_facility_id')
    .eq('id', userId)
    .eq('deleted', false)
    .maybeSingle()

  if (error) {
    return { facilityId: null, error }
  }

  const facilityId = userRow?.current_facility_id ?? null
  return { facilityId, error: null }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1) 認証
  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', message: authErr?.message ?? 'no user' },
      { status: 401 }
    )
  }
  const userId = authData.user.id

  // 2) body
  let body: SubscribeBody
  try {
    body = (await request.json()) as SubscribeBody
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  // ログ: 受信したbodyの構造を確認（秘匿情報は先頭20文字のみ）
  console.info('[push/subscribe] body-received', {
    userId,
    hasEndpoint: !!body.endpoint,
    endpointPrefix: body.endpoint?.substring(0, 20) || null,
    hasP256dh: !!body.p256dh,
    hasAuth: !!body.auth,
    hasKeys: !!(body as any).keys,
    hasKeysP256dh: !!(body as any).keys?.p256dh,
    hasKeysAuth: !!(body as any).keys?.auth,
  })

  // keys オブジェクトから取得を試みる（クライアント側の送信形式に対応）
  const p256dh = (body.p256dh ?? (body as any).keys?.p256dh ?? '').trim()
  const auth = (body.auth ?? (body as any).keys?.auth ?? '').trim()
  const endpoint = (body.endpoint ?? '').trim()
  const userAgent = body.user_agent ?? request.headers.get('user-agent')
  const deviceType = body.device_type ?? 'unknown'

  if (!endpoint || !p256dh || !auth) {
    console.info('[push/subscribe] missing-fields', {
      hasEndpoint: !!endpoint,
      hasP256dh: !!p256dh,
      hasAuth: !!auth,
    })
    return NextResponse.json(
      { ok: false, reason: 'missing_fields', message: 'endpoint/p256dh/auth are required' },
      { status: 400 }
    )
  }

  // 3) current_facility_id を取得
  const { facilityId, error: userErr } = await getCurrentFacilityId(supabase, userId)
  if (userErr) {
    console.info('[push/subscribe] user-fetch-error', {
      userId,
      errorCode: userErr.code,
      errorMessage: userErr.message?.substring(0, 100),
    })
    return NextResponse.json(
      { ok: false, reason: 'user_fetch_error', message: userErr.message },
      { status: 500 }
    )
  }
  if (!facilityId) {
    console.info('[push/subscribe] facility-id-missing', { userId })
    return NextResponse.json(
      { ok: false, reason: 'facility_id_missing', message: 'current_facility_id is not set' },
      { status: 400 }
    )
  }

  // ログ: facilityId を確認
  console.info('[push/subscribe] facility-id-resolved', {
    userId,
    facilityId,
  })

  // 4) 既存チェック（B仕様：user + facility + endpoint + deleted=false）
  const { data: existing, error: selErr } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('facility_id', facilityId)
    .eq('endpoint', endpoint)
    .eq('deleted', false)
    .maybeSingle()

  if (selErr) {
    return NextResponse.json(
      { ok: false, reason: 'select_error', message: selErr.message },
      { status: 500 }
    )
  }

  // 5) upsert禁止：update or insert
  if (existing?.id) {
    const { error: updErr, data: updData } = await supabase
      .from('push_subscriptions')
      .update({
        p256dh,
        auth,
        user_agent: userAgent,
        device_type: deviceType,
        deleted: false,
      })
      .eq('id', existing.id)
      .select('id, facility_id')

    if (updErr) {
      console.info('[push/subscribe] update-error', {
        userId,
        facilityId,
        existingId: existing.id,
        errorCode: updErr.code,
        errorMessage: updErr.message?.substring(0, 100),
      })
      return NextResponse.json(
        { ok: false, reason: 'update_error', message: updErr.message },
        { status: 500 }
      )
    }

    console.info('[push/subscribe] update-success', {
      userId,
      facilityId,
      subscriptionId: updData?.[0]?.id,
      savedFacilityId: updData?.[0]?.facility_id,
    })
    return NextResponse.json({ ok: true, action: 'updated' })
  }

  const { error: insErr, data: insData } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: userId,
      facility_id: facilityId,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      device_type: deviceType,
      deleted: false,
    })
    .select('id, facility_id')

  if (insErr) {
    console.info('[push/subscribe] insert-error', {
      userId,
      facilityId,
      endpointPrefix: endpoint.substring(0, 20),
      errorCode: insErr.code,
      errorMessage: insErr.message?.substring(0, 100),
    })
    return NextResponse.json(
      { ok: false, reason: 'insert_error', message: insErr.message },
      { status: 500 }
    )
  }

  console.info('[push/subscribe] insert-success', {
    userId,
    facilityId,
    subscriptionId: insData?.[0]?.id,
    savedFacilityId: insData?.[0]?.facility_id,
  })
  return NextResponse.json({ ok: true, action: 'inserted' })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  const { data: authData, error: authErr } = await supabase.auth.getUser()
  if (authErr || !authData?.user) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', message: authErr?.message ?? 'no user' },
      { status: 401 }
    )
  }
  const userId = authData.user.id

  let body: { endpoint?: string }
  try {
    body = (await request.json()) as { endpoint?: string }
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_json' }, { status: 400 })
  }

  const endpoint = (body.endpoint ?? '').trim()
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, reason: 'missing_endpoint', message: 'endpoint is required' },
      { status: 400 }
    )
  }

  const { facilityId, error: userErr } = await getCurrentFacilityId(supabase, userId)
  if (userErr) {
    return NextResponse.json(
      { ok: false, reason: 'user_fetch_error', message: userErr.message },
      { status: 500 }
    )
  }
  if (!facilityId) {
    return NextResponse.json(
      { ok: false, reason: 'facility_id_missing', message: 'current_facility_id is not set' },
      { status: 400 }
    )
  }

  // ✅ 物理削除ではなく soft delete
  const { error: delErr } = await supabase
    .from('push_subscriptions')
    .update({ deleted: true })
    .eq('user_id', userId)
    .eq('facility_id', facilityId)
    .eq('endpoint', endpoint)
    .eq('deleted', false)

  if (delErr) {
    return NextResponse.json(
      { ok: false, reason: 'delete_error', message: delErr.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}