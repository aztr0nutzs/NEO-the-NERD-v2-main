"use client";

import type { NetworkMapFilterState } from "@/lib/network/types";

interface NetworkMapFilterPanelProps {
  filters: NetworkMapFilterState;
  onChange: (filters: NetworkMapFilterState) => void;
}

const FILTERS: Array<{ key: keyof NetworkMapFilterState; label: string }> = [
  { key: "showTrusted", label: "Trusted" },
  { key: "showNew", label: "New" },
  { key: "showWatch", label: "Watch" },
  { key: "showBlocked", label: "Blocked" },
  { key: "showOffline", label: "Offline" },
  { key: "showUnknown", label: "Unknown" },
  { key: "showOnlyFlagged", label: "Flagged Only" },
];

export function NetworkMapFilterPanel({ filters, onChange }: NetworkMapFilterPanelProps) {
  return (
    <section>
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
        FILTERS
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FILTERS.map(({ key, label }) => {
          const active = filters[key];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ ...filters, [key]: !active })}
              className={`rounded border px-2 py-1.5 text-left font-mono text-[10px] font-bold uppercase transition ${
                active
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                  : "border-gray-800 bg-black/40 text-gray-600 hover:border-gray-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[9px] leading-relaxed text-gray-600">
        Filters dim nonmatching nodes and links to preserve topology context.
      </p>
    </section>
  );
}
