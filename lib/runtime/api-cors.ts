import { NextResponse } from "next/server"

const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
  "http://127.0.0.1",
  "https://127.0.0.1",
])

const DEFAULT_ALLOWED_ORIGIN = "https://localhost"

function resolveAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return DEFAULT_ALLOWED_ORIGIN
  if (ALLOWED_ORIGINS.has(origin)) return origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return DEFAULT_ALLOWED_ORIGIN
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(request),
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

export function jsonWithCors(
  request: Request,
  body: unknown,
  init?: ResponseInit,
) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request),
      ...(init?.headers ?? {}),
    },
  })
}

export function optionsWithCors(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  })
}
