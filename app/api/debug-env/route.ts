import { NextResponse } from "next/server";

export const runtime = "nodejs";

function mask(value?: string) {
  if (!value) return null;
  return value.slice(0, 10) + "..." + value.slice(-6);
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    url,
    urlHasProjectRef: url?.includes("wqtnffvhhssgdnecjwpy") ?? false,
    anonHead: anon ? anon.slice(0, 10) : null,
    serviceHead: service ? service.slice(0, 10) : null,
    servicePresent: Boolean(service),
  });
}

