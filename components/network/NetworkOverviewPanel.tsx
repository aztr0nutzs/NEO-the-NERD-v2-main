"use client";

import { Wifi, Monitor, AlertTriangle, Eye, Shield } from "lucide-react";
import type { NetworkStatus } from "@/lib/network/types";

interface NetworkOverviewPanelProps {
  status: NetworkStatus;
  isDemoMode: boolean;
}

export function NetworkOverviewPanel({ status, isDemoMode }: NetworkOverviewPanelProps) {
  const stats = [
    {
      label: "DEVICES_FOUND",
      value: status.devicesFound,
      icon: Monitor,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/50",
      glowColor: "shadow-cyan-500/20",
    },
    {
      label: "ONLINE",
      value: status.onlineDevices,
      icon: Wifi,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/50",
      glowColor: "shadow-emerald-500/20",
    },
    {
      label: "NEW_UNKNOWN",
      value: status.unknownDevices,
      icon: AlertTriangle,
      color: "text-yellow-400",
      borderColor: "border-yellow-500/50",
      glowColor: "shadow-yellow-500/20",
    },
    {
      label: "FLAGGED",
      value: status.flaggedDevices,
      icon: Eye,
      color: "text-pink-400",
      borderColor: "border-pink-500/50",
      glowColor: "shadow-pink-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Network Info Bar */}
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs font-mono tracking-wider">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-gray-400">NETWORK:</span>
          <span className="text-cyan-300">{status.networkName}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">GATEWAY:</span>
          <span className="text-purple-300">{status.gatewayIp}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">LOCAL:</span>
          <span className="text-emerald-300">{status.localIp}</span>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`
                relative overflow-hidden rounded-lg border bg-black/60
                p-4 backdrop-blur-sm transition-all duration-300
                hover:scale-[1.02] hover:shadow-lg
                ${stat.borderColor} ${stat.glowColor}
              `}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: "30px 30px",
                  }}
                />
              </div>

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="mb-1 font-mono text-[10px] tracking-widest text-gray-500">
                    {stat.label}
                  </p>
                  <p className={`text-3xl font-black italic ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <Icon className={`h-8 w-8 opacity-40 ${stat.color}`} />
              </div>

              {/* Corner Accent */}
              <div
                className={`absolute right-0 top-0 h-6 w-6 ${stat.color}`}
                style={{
                  clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                  opacity: 0.1,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded border border-orange-500/30 bg-orange-500/5 px-3 py-2 font-mono text-xs text-orange-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            DEMO_ADAPTER // Displaying simulated device data. Connect native backend for real scan results.
          </span>
        </div>
      )}
    </div>
  );
}
