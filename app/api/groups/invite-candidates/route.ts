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
 * ここでは "簡易" として:
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

    // 2) groupId を確定
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get("groupId")
    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // 3) 呼び出し元がそのグループの active member であることを確認
    const { data: membership, error: memberErr } = await supabaseAdmin
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .eq("deleted", false)
      .maybeSingle();
    if (memberErr) {
      return NextResponse.json({ error: "Failed to verify membership" }, { status: 500 });
    }
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) グループの施設IDを取得
    const { data: group, error: groupErr } = await supabaseAdmin
      .from("groups")
      .select("facility_id")
      .eq("id", groupId)
      .eq("deleted", false)
      .maybeSingle();
    if (groupErr || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const facilityId = group.facility_id

    // 5) グループの active member user_id 一覧を取得（招待候補から除外するため）
    const { data: activeMembers, error: activeMembersErr } = await supabaseAdmin
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("deleted", false);
    if (activeMembersErr) {
      return NextResponse.json({ error: "Failed to fetch active members" }, { status: 500 });
    }
    const activeMemberIds = new Set<string>(
      (activeMembers ?? []).map((m: any) => m.user_id as string)
    )

    // 6) 招待候補（施設スタッフ一覧）を返す
    //    - users.deleted = true は除外
    //    - active member（deleted=false）は除外、deleted=true の過去 membership は除外しない
    const { data: rows, error: listErr } = await supabaseAdmin
      .from("user_facility_roles")
      .select(
        `
        role,
        user_id,
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
          id: r.user_id as string,
          display_name: r.user?.display_name as string | null,
          email: r.user?.email as string | null,
          profession: r.user?.profession as string | null,
          avatar_url: r.user?.avatar_url as string | null,
          role: r.role as string,
          deleted: !!r.user?.deleted,
        }))
        .filter((u) => !u.deleted)
        .filter((u) => !activeMemberIds.has(u.id)) // active member 除外（自分含む）
        .sort((a, b) =>
          (a.display_name ?? "").localeCompare(b.display_name ?? "")
        ) ?? [];

    const result = candidates.map(({ deleted, ...rest }) => rest)
    return NextResponse.json({
      facility_id: facilityId,
      candidates: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}