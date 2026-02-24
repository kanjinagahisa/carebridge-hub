import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, email, display_name, profession } = body ?? {}

    if (!id || !email || !display_name || !profession) {
      return NextResponse.json(
        { error: 'Missing required fields', received: { id, email, display_name, profession } },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('users')
      .upsert({ id, email, display_name, profession }, { onConflict: 'id' })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to upsert public.users', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'Unexpected error', message: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
