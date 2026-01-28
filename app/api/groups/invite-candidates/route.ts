// app/api/groups/invite-candidates/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// ✅ ここは service_role を使う（サーバーのみ）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

/**
 * 🔐 認証は「Cookieのセッション」から user を取るのが本線です。
 * あなたのプロジェクトで既に「サーバーで user を取る helper」があるなら、それに置き換えてOK。
 *
 * ここでは “簡易” として:
 * - Authorization: Bearer <access_token> があればそれを使う
 * - なければ 401
 *
 * ※もし既に server supabase (createServerClient) を使ってるなら、そこに置換するのがベストです
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}

async function getUserIdFromCookies(): Promise<string | null> {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // ルートハンドラ/環境によっては set が制限されるので握りつぶす
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: "", ...options, maxAge: 0 });
            } catch {
              // 同上
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;

    const allCookies = cookies().getAll();
    const tokenCookie = allCookies.find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );
    if (!tokenCookie) return null;

    let decoded = tokenCookie.value;
    try {
      decoded = decodeURIComponent(tokenCookie.value);
    } catch {}

    let parsed: any = null;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      return null;
    }

    const token =
      parsed?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.session?.access_token ??
      null;
    if (!token) return null;

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    // 1) ログインユーザーIDを確定
    const userIdFromCookie = await getUserIdFromCookies();
    const userId = userIdFromCookie ?? (await getUserIdFromRequest(req));
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) facility_id を確定（users.current_facility_id を本線）
    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, current_facility_id, deleted")
      .eq("id", userId)
      .maybeSingle();

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    }
    if (!me || me.deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let facilityId: string | null = me.current_facility_id ?? null;

    // 3) current_facility_id が空なら user_facility_roles から拾う（保険）
    if (!facilityId) {
      const { data: ufr, error: ufrErr } = await supabaseAdmin
        .from("user_facility_roles")
        .select("facility_id")
        .eq("user_id", userId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (ufrErr) {
        return NextResponse.json({ error: ufrErr.message }, { status: 500 });
      }
      facilityId = ufr?.[0]?.facility_id ?? null;
    }

    if (!facilityId) {
      // ここは「施設未選択」状態。UI側で“施設を選んでください”に誘導できる
      return NextResponse.json(
        { error: "No facility selected for this user" },
        { status: 400 }
      );
    }

    // 4) 招待候補（施設スタッフ一覧）を返す
    //    - deleted は除外
    //    - 自分は候補から除外（好みで外さないならこの行を消す）
    const { data: rows, error: listErr } = await supabaseAdmin
      .from("user_facility_roles")
      .select(
        `
        role,
        user:users (
          id,
          display_name,
          email,
          profession,
          avatar_url,
          deleted
        )
      `
      )
      .eq("facility_id", facilityId)
      .eq("deleted", false);

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const candidates =
      rows
        ?.map((r: any) => ({
          id: r.user?.id as string,
          display_name: r.user?.display_name as string | null,
          email: r.user?.email as string | null,
          profession: r.user?.profession as string | null,
          avatar_url: r.user?.avatar_url as string | null,
          role: r.role as string,
          deleted: !!r.user?.deleted,
        }))
        .filter((u) => !u.deleted)
        .filter((u) => u.id !== userId) // 自分除外
        .sort((a, b) =>
          (a.display_name ?? "").localeCompare(b.display_name ?? "")
        ) ?? [];

    return NextResponse.json({
      facility_id: facilityId,
      candidates: candidates.map(({ deleted, ...rest }) => rest),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}