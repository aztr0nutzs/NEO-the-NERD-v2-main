"use client";

export function NetworkMapLegend() {
  return (
    <section>
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
        LEGEND
      </p>
      <div className="space-y-2 rounded border border-gray-800 bg-black/40 p-3">
        <LegendRow color="bg-cyan-300" label="Gateway core" value="Home router / command center" />
        <LegendRow color="bg-emerald-300" label="Trusted" value="Known online device" />
        <LegendRow color="bg-yellow-300" label="New" value="Recently discovered" />
        <LegendRow color="bg-orange-400" label="Watch" value="Needs attention" />
        <LegendRow color="bg-rose-400" label="Blocked" value="Restricted or warning state" />
        <LegendRow color="bg-slate-500" label="Dim link" value="Offline, filtered, weak, or unknown" />
        <p className="pt-1 font-mono text-[9px] leading-relaxed text-orange-300">
          Demo / estimated topology shows logical relationships, not confirmed physical cabling.
        </p>
      </div>
    </section>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[12px_72px_minmax(0,1fr)] items-center gap-2 font-mono text-[9px] uppercase">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="font-bold text-gray-300">{label}</span>
      <span className="text-gray-600">{value}</span>
    </div>
  );
}
