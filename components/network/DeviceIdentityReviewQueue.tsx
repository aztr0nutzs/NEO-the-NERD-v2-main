"use client";

import { AlertCircle, Eye, Shield, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiscoveredDevice } from "@/lib/network/types";

interface DeviceIdentityReviewQueueProps {
  devices: DiscoveredDevice[];
  onReview: (device: DiscoveredDevice) => void;
  onTrust: (device: DiscoveredDevice) => void;
  onWatch: (device: DiscoveredDevice) => void;
  onDismiss: (device: DiscoveredDevice) => void;
}

export function DeviceIdentityReviewQueue({
  devices,
  onReview,
  onTrust,
  onWatch,
  onDismiss,
}: DeviceIdentityReviewQueueProps) {
  if (!devices.length) return null;

  return (
    <section className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-300" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-yellow-300">
            NEW_DEVICE_DETECTED
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-yellow-100/70">
          {devices.length} awaiting identity review
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {devices.slice(0, 6).map((device) => (
          <div
            key={device.id}
            className="rounded-lg border border-yellow-500/20 bg-black/45 p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-bold text-gray-100">{device.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                {device.ipAddress} / {device.identityMatchConfidence ?? "weak"} identity match
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onReview(device)}
                className="h-8 border border-cyan-500/40 bg-cyan-500/15 font-mono text-[10px] uppercase text-cyan-300 hover:bg-cyan-500/25"
              >
                <StickyNote className="mr-1.5 h-3 w-3" />
                REVIEW
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onTrust(device)}
                className="h-8 border border-emerald-500/40 bg-emerald-500/15 font-mono text-[10px] uppercase text-emerald-300 hover:bg-emerald-500/25"
              >
                <Shield className="mr-1.5 h-3 w-3" />
                TRUST
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onWatch(device)}
                className="h-8 border border-orange-500/40 bg-orange-500/15 font-mono text-[10px] uppercase text-orange-300 hover:bg-orange-500/25"
              >
                <Eye className="mr-1.5 h-3 w-3" />
                WATCH
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onDismiss(device)}
                variant="ghost"
                className="h-8 font-mono text-[10px] uppercase text-gray-500 hover:bg-gray-900 hover:text-gray-300"
              >
                <X className="mr-1.5 h-3 w-3" />
                LATER
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
