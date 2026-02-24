import { createApiClient } from '@/lib/supabase/api'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient(request)

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser()

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const facilityId = (body?.facilityId ?? body?.facility_id ?? null)?.trim?.() ?? null

    if (!facilityId) {
      return NextResponse.json({ ok: false, error: 'facilityId is required' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('leave_facility_safe', { _facility_id: facilityId })

    if (error) {
      const msg = error.message ?? ''
      const code = (error as any).code ?? null

      const uuids = Array.from(
        msg.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)
      ).map((m) => m[0])

      return NextResponse.json(
        {
          ok: false,
          error: msg,
          code,
          blocking_group_ids: uuids,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error('[facility/leave fatal]', e)
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
