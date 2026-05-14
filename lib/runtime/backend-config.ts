/**
 * Backend transport configuration for NEO the N.E.R.D.
 *
 * Resolves which base URL the typed backend client should target, given the current runtime
 * environment and the `NEXT_PUBLIC_NEO_BACKEND_BASE_URL` environment variable.
 *
 * Truth rules:
 *  - hosted Next.js without a remote backend URL  -> same-origin /api/* (works)
 *  - hosted Next.js with a remote backend URL     -> remote (operator override)
 *  - Capacitor native + remote backend URL        -> remote
 *  - Capacitor native, no remote backend URL      -> unavailable (do NOT call /api/*)
 *  - static export + no remote backend URL        -> unavailable
 */

import { detectRuntimeEnvironment, getRuntimeEnvironmentSync } from "./runtime-environment";

export type BackendMode = "same-origin" | "remote" | "unavailable";

export interface BackendConfig {
  mode: BackendMode;
  baseUrl: string | null;
  /** Why this mode was chosen — surfaced for diagnostics, not user copy. */
  reason: string;
}

const TRAILING_SLASH = /\/+$/;

function readBaseUrlFromEnv(): string | null {
  const raw =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_NEO_BACKEND_BASE_URL
      : undefined;
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.replace(TRAILING_SLASH, "");
}

let cached: BackendConfig | null = null;

/**
 * Synchronous best-effort resolution. Defaults to same-origin on the server / web; native
 * detection requires the async resolver below.
 */
export function getBackendConfigSync(): BackendConfig {
  if (cached) return cached;
  const baseUrl = readBaseUrlFromEnv();
  const env = getRuntimeEnvironmentSync();

  if (env.staticExport && !baseUrl) {
    cached = {
      mode: "unavailable",
      baseUrl: null,
      reason: "Static export without NEXT_PUBLIC_NEO_BACKEND_BASE_URL configured.",
    };
    return cached;
  }

  if (baseUrl) {
    cached = {
      mode: "remote",
      baseUrl,
      reason: "NEXT_PUBLIC_NEO_BACKEND_BASE_URL is configured.",
    };
    return cached;
  }

  cached = {
    mode: "same-origin",
    baseUrl: null,
    reason: "Hosted runtime; using same-origin /api/* routes.",
  };
  return cached;
}

export async function getBackendConfig(): Promise<BackendConfig> {
  const baseUrl = readBaseUrlFromEnv();
  const env = await detectRuntimeEnvironment();

  if (env.nativeRuntime) {
    if (!baseUrl) {
      const result: BackendConfig = {
        mode: "unavailable",
        baseUrl: null,
        reason:
          "Capacitor native runtime detected and no NEXT_PUBLIC_NEO_BACKEND_BASE_URL configured. Local Next.js /api/* routes are not bundled into the static APK.",
      };
      cached = result;
      return result;
    }
    const result: BackendConfig = {
      mode: "remote",
      baseUrl,
      reason: "Capacitor native runtime + remote backend URL configured.",
    };
    cached = result;
    return result;
  }

  if (env.staticExport && !baseUrl) {
    const result: BackendConfig = {
      mode: "unavailable",
      baseUrl: null,
      reason: "Static export without NEXT_PUBLIC_NEO_BACKEND_BASE_URL configured.",
    };
    cached = result;
    return result;
  }

  if (baseUrl) {
    const result: BackendConfig = {
      mode: "remote",
      baseUrl,
      reason: "NEXT_PUBLIC_NEO_BACKEND_BASE_URL is configured.",
    };
    cached = result;
    return result;
  }

  const result: BackendConfig = {
    mode: "same-origin",
    baseUrl: null,
    reason: "Hosted runtime; using same-origin /api/* routes.",
  };
  cached = result;
  return result;
}

export function resolveBackendUrl(config: BackendConfig, path: string): string | null {
  if (config.mode === "unavailable") return null;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (config.mode === "remote" && config.baseUrl) {
    return `${config.baseUrl}${normalized}`;
  }
  return normalized;
}

export function resetBackendConfig() {
  cached = null;
}
