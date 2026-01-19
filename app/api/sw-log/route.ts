export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("[SW-LOG]", JSON.stringify(body));
  return new Response("ok");
}
