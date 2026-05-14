"use client";

import { Radar, RotateCcw } from "lucide-react";
import { NetworkMapFallback } from "./NetworkMapFallback";

interface NetworkMapLoadingStateProps {
  /**
   * When set, the loading state turns into an error fallback. This is
   * what `next/dynamic` passes into the `loading` callback when the
   * chunk import itself fails — without surfacing it the user would
   * stare at a forever-spinning radar with no escape on Android.
   */
  error?: Error | null;
  /** Provided by next/dynamic when the chunk fails; re-attempts the import. */
  retry?: () => void;
}

export function NetworkMapLoadingState({ error, retry }: NetworkMapLoadingStateProps = {}) {
  if (error) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-cyan-500/20 bg-black/70 p-6">
        <NetworkMapFallback
          message={
            error.message ||
            "3D engine chunk failed to load. Falling back to topology summary."
          }
        />
        {retry && (
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300"
          >
            <RotateCcw className="h-3 w-3" />
            RETRY 3D LOAD
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-lg border border-cyan-500/20 bg-black/70 p-6">
      <Radar className="h-10 w-10 animate-pulse text-cyan-400" />
      <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
        LOADING_TOPOLOGY_GRAPH...
      </p>
      <p className="mt-2 max-w-xs text-center font-mono text-[10px] tracking-[0.18em] text-gray-500">
        Initializing 3D engine and pulling the live device graph.
      </p>
    </div>
  );
}
