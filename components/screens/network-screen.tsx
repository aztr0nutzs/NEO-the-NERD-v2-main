"use client";

import { Box, Radar } from "lucide-react";
import { NeonPanel } from "@/components/neon-panel";
import { NetworkDiscoveryFeature } from "@/components/network/NetworkDiscoveryFeature";

export function NetworkScreen() {
  return (
    <div className="space-y-4">
      {/*
        Prominent header banner — surfaces the 3D Network Map as the
        headline feature. The internal Tabs default to "map" already, so
        the user lands directly on the topology view; this header makes
        that obvious instead of leaving them to decode seven equal-weight
        text tabs.
      */}
      <NeonPanel accent="green" glow="strong" scanlines className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
            style={{
              background: "rgba(57,255,20,0.12)",
              boxShadow:
                "inset 0 0 0 1px rgba(57,255,20,0.55), 0 0 18px rgba(57,255,20,0.35)",
            }}
          >
            <Box
              className="h-5 w-5"
              style={{
                color: "#39ff14",
                filter: "drop-shadow(0 0 6px #39ff14)",
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="ps-mono text-[10px] tracking-[0.3em] ps-text-green">
              NEURAL_MAP // 3D NETWORK TOPOLOGY
            </p>
            <p className="ps-mono mt-0.5 text-[12px] tracking-[0.18em] text-white/85">
              Runtime-labeled discovery · estimated 3D topology
            </p>
          </div>
          <Radar
            className="h-5 w-5 shrink-0 animate-ps-pulse-ring"
            style={{
              color: "#39ff14",
              filter: "drop-shadow(0 0 6px #39ff14)",
            }}
            aria-hidden="true"
          />
        </div>
      </NeonPanel>

      <NetworkDiscoveryFeature />
    </div>
  );
}
