// app/api/users/set-current-facility/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// ✅ 更新/所属チェック用（Service Role）
function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceRole) throw new Error("Missing SUPABASE envs");
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ✅ 認証用（Anon + Cookie）
function getAuthClient(cookieHeader: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anonKey) throw new Error("Missing SUPABASE envs");
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        // SupabaseがCookieからセッションを復元できるようにする
        Cookie: cookieHeader,
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    // 1) body
    const { userId, facilityId } = (await req.json()) as {
      userId?: string;
      facilityId?: string;
    };

    if (!userId || !facilityId) {
      return NextResponse.json(
        { ok: false, error: "userId and facilityId are required" },
        { status: 400 }
      );
    }

    // 2) Cookieから「このリクエストのログインユーザー」を特定
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    if (!cookieHeader) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: no cookies" },
        { status: 401 }
      );
    }

    const authClient = getAuthClient(cookieHeader);

    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3) user.id と userId が一致しないなら拒否
    if (user.id !== userId) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // ✅ 4) facilityId が「このユーザーの所属施設」かチェック（なりすまし対策）
    const admin = getAdmin();

    const { data: roleRow, error: roleErr } = await admin
      .from("user_facility_roles")
      .select("facility_id")
      .eq("user_id", user.id)
      .eq("facility_id", facilityId)
      .eq("deleted", false)
      .maybeSingle();

    if (roleErr) {
      return NextResponse.json(
        { ok: false, error: roleErr.message },
        { status: 500 }
      );
    }

    if (!roleRow) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: facility not in your roles" },
        { status: 403 }
      );
    }

    // 5) OKなら Service Role で users.current_facility_id を更新
    const { error } = await admin
      .from("users")
      .update({ current_facility_id: facilityId })
      .eq("id", userId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}