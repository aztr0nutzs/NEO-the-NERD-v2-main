/**
 * Runtime environment detection for NEO the N.E.R.D.
 *
 * The app is shipped two ways:
 *  - hosted Next.js (web dev/prod) — server-rendered, /api/* route handlers exist on the same origin.
 *  - Capacitor static export packaged as Android APK — only `out/` is shipped; there is NO server,
 *    so /api/* route handlers do not exist locally and any same-origin fetch to them will fail.
 *
 * This module classifies the current runtime so the transport layer can pick the right strategy.
 *
 * It is browser-side safe: callers that may run on the server should treat `nativeRuntime`
 * and `staticExport` as `false` until called from the client.
 */

export type RuntimeKind =
  | "server"
  | "web-browser"
  | "capacitor-native"
  | "static-export"
  | "unknown";

export interface RuntimeEnvironment {
  kind: RuntimeKind;
  nativeRuntime: boolean;
  staticExport: boolean;
  capacitorPlatform: "android" | "ios" | "web" | "unknown";
  hasWindow: boolean;
}

/**
 * NEXT_PUBLIC_NEO_BUILD_TARGET is set to "static" when the project is built specifically
 * for the Capacitor / static export pipeline. Build pipelines or scripts may set it; if
 * unset, we infer from the Capacitor runtime check below.
 */
function readBuildTarget(): "static" | "server" | undefined {
  const value =
    typeof process !== "undefined"
      ? process.env?.NEXT_PUBLIC_NEO_BUILD_TARGET
      : undefined;
  if (value === "static" || value === "server") return value;
  return undefined;
}

let cachedEnvironment: RuntimeEnvironment | null = null;
let cachedSnapshotPromise: Promise<RuntimeEnvironment> | null = null;

/**
 * Synchronous environment snapshot. Safe in any context, but cannot detect Capacitor
 * without `await detectRuntimeEnvironment()` because the @capacitor/core import is async.
 *
 * Use this for first-render decisions; refresh with `detectRuntimeEnvironment()` after mount.
 */
export function getRuntimeEnvironmentSync(): RuntimeEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  const hasWindow = typeof window !== "undefined";
  const buildTarget = readBuildTarget();
  const env: RuntimeEnvironment = {
    kind: hasWindow
      ? buildTarget === "static"
        ? "static-export"
        : "web-browser"
      : "server",
    nativeRuntime: false,
    staticExport: buildTarget === "static",
    capacitorPlatform: hasWindow ? "web" : "unknown",
    hasWindow,
  };
  cachedEnvironment = env;
  return env;
}

/**
 * Async environment detection. Imports @capacitor/core lazily so the bundle stays clean
 * for non-native runtimes. Cached after first resolution; call `resetRuntimeEnvironment()`
 * in tests if needed.
 */
export async function detectRuntimeEnvironment(): Promise<RuntimeEnvironment> {
  if (cachedEnvironment && cachedEnvironment.kind !== "server" && cachedEnvironment.kind !== "web-browser") {
    return cachedEnvironment;
  }
  if (cachedSnapshotPromise) return cachedSnapshotPromise;

  cachedSnapshotPromise = (async () => {
    const sync = getRuntimeEnvironmentSync();
    if (!sync.hasWindow) {
      cachedEnvironment = sync;
      return sync;
    }

    let nativeRuntime = false;
    let capacitorPlatform: RuntimeEnvironment["capacitorPlatform"] = "web";
    try {
      const { Capacitor } = await import("@capacitor/core");
      nativeRuntime = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      capacitorPlatform =
        platform === "android" || platform === "ios" || platform === "web"
          ? platform
          : "unknown";
    } catch {
      nativeRuntime = false;
      capacitorPlatform = "web";
    }

    const buildTarget = readBuildTarget();
    const staticExport = buildTarget === "static" || nativeRuntime;
    const kind: RuntimeKind = nativeRuntime
      ? "capacitor-native"
      : staticExport
        ? "static-export"
        : "web-browser";

    const env: RuntimeEnvironment = {
      kind,
      nativeRuntime,
      staticExport,
      capacitorPlatform,
      hasWindow: true,
    };
    cachedEnvironment = env;
    return env;
  })();

  return cachedSnapshotPromise;
}

export function isNativeRuntime(): boolean {
  return cachedEnvironment?.nativeRuntime ?? false;
}

export function isStaticExport(): boolean {
  return cachedEnvironment?.staticExport ?? getRuntimeEnvironmentSync().staticExport;
}

export function resetRuntimeEnvironment() {
  cachedEnvironment = null;
  cachedSnapshotPromise = null;
}
