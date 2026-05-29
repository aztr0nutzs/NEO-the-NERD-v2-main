import { jsonWithCors, optionsWithCors } from "@/lib/runtime/api-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

export function GET(request: Request) {
  return jsonWithCors(
    request,
    {
      ok: true,
      service: "neo-speedtest-latency",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
