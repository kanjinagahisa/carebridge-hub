import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    /* =========================
       1. Supabase clients
    ========================= */

    // Cookieベース（ログインユーザー判定用）
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Service Role（更新・所属チェック用）
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* =========================
       2. ログインユーザー確認
    ========================= */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    /* =========================
       3. リクエストボディ検証
    ========================= */

    const body = await req.json();
    const { userId, facilityId } = body ?? {};

    if (!userId || !facilityId) {
      return NextResponse.json(
        { ok: false, error: 'userId and facilityId are required' },
        { status: 400 }
      );
    }

    /* =========================
       4. userId なりすまし防止
    ========================= */

    if (user.id !== userId) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden (user mismatch)' },
        { status: 403 }
      );
    }

    /* =========================
       5. 施設所属チェック
       user_facility_roles
    ========================= */

    const { data: membership, error: membershipError } = await admin
      .from('user_facility_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('facility_id', facilityId)
      .eq('deleted', false)
      .maybeSingle();

    if (membershipError) {
      console.error('[membershipError]', membershipError);
      return NextResponse.json(
        { ok: false, error: 'Failed to verify facility membership' },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden (not a member of facility)' },
        { status: 403 }
      );
    }

    /* =========================
       6. current_facility_id 更新
    ========================= */

    const { error: updateError } = await admin
      .from('users')
      .update({ current_facility_id: facilityId })
      .eq('id', user.id);

    if (updateError) {
      console.error('[updateError]', updateError);
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    /* =========================
       7. 成功
    ========================= */

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[set-current-facility fatal]', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}