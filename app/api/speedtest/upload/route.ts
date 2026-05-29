import { jsonWithCors, optionsWithCors } from "@/lib/runtime/api-cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10_000_000;

export function OPTIONS(request: Request) {
  return optionsWithCors(request);
}

export async function POST(request: Request) {
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return jsonWithCors(
      request,
      {
        ok: false,
        error: "upload-too-large",
        maxBytes: MAX_UPLOAD_BYTES,
        bytesReceived: body.byteLength,
      },
      { status: 413 },
    );
  }

  return jsonWithCors(
    request,
    {
      ok: true,
      service: "neo-speedtest-upload",
      bytesReceived: body.byteLength,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
