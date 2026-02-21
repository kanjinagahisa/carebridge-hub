// app/api/groups/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
            } catch {}
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: "", ...options, maxAge: 0 });
            } catch {}
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
    const userId =
      (await getUserIdFromCookies()) ?? (await getUserIdFromRequest(req));
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, current_facility_id, deleted")
      .eq("id", userId)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
    if (!me || me.deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let facilityId: string | null = me.current_facility_id ?? null;

    if (!facilityId) {
      const { data: ufr } = await supabaseAdmin
        .from("user_facility_roles")
        .select("facility_id")
        .eq("user_id", userId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      facilityId = ufr?.[0]?.facility_id ?? null;
    }

    if (!facilityId) {
      return NextResponse.json(
        { error: "No facility selected for this user" },
        { status: 400 }
      );
    }

    const { data: members } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId)
      .eq("deleted", false);

    const groupIds = members?.map((m) => m.group_id) ?? [];

    if (groupIds.length === 0) {
      return NextResponse.json({ facility_id: facilityId, groups: [] });
    }

    const { data: groups, error: gErr } = await supabaseAdmin
      .from("groups")
      .select("*")
      .eq("facility_id", facilityId)
      .eq("deleted", false)
      .in("id", groupIds)
      .order("updated_at", { ascending: false });

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

    return NextResponse.json({
      facility_id: facilityId,
      groups: groups ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId =
      (await getUserIdFromCookies()) ?? (await getUserIdFromRequest(req));
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      name?: string;
      description?: string | null;
      type?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = (body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: me, error: meErr } = await supabaseAdmin
      .from("users")
      .select("id, current_facility_id, deleted")
      .eq("id", userId)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
    if (!me || me.deleted) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let facilityId: string | null = me.current_facility_id ?? null;

    if (!facilityId) {
      const { data: ufr } = await supabaseAdmin
        .from("user_facility_roles")
        .select("facility_id")
        .eq("user_id", userId)
        .eq("deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      facilityId = ufr?.[0]?.facility_id ?? null;
    }

    if (!facilityId) {
      return NextResponse.json(
        { error: "No facility selected for this user" },
        { status: 400 }
      );
    }

    const { data: group, error: gErr } = await supabaseAdmin
      .from("groups")
      .insert({
        facility_id: facilityId,
        type: body.type ?? "general",
        name,
        description: body.description ?? null,
        created_by: userId,
        deleted: false,
      })
      .select("*")
      .single();

    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

    const { error: gmErr } = await supabaseAdmin.from("group_members").insert({
      group_id: group.id,
      user_id: userId,
      role: "owner",
      deleted: false,
    });

    if (gmErr) return NextResponse.json({ error: gmErr.message }, { status: 500 });

    return NextResponse.json({ facility_id: facilityId, group });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
