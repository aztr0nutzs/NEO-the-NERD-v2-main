import { corsHeaders, optionsWithCors } from "@/lib/runtime/api-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_BYTES = 1;
const MAX_BYTES = 50_000_000;

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("bytes") ?? "6000000");
  const byteCount = Math.max(
    MIN_BYTES,
    Math.min(MAX_BYTES, Number.isFinite(requested) ? Math.floor(requested) : 6_000_000),
  );
  const body = new Uint8Array(byteCount);

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/octet-stream",
      "Content-Length": String(byteCount),
      "Cache-Control": "no-store, max-age=0",
      "X-NEO-SpeedTest-Bytes": String(byteCount),
    },
  });
}
